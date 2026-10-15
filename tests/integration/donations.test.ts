import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as webhook } from '@/app/api/stripe/webhook/route'
import { db } from '@/lib/db'
import { createDonationCheckout } from '@/lib/server/donations'

const SECRET = 'whsec_test_integration_secret'
const stripe = new Stripe('sk_test_dummy')
const ctx = { ipHash: 'donor-ip' }

function enableDonations(provider: 'stripe' | 'mock' = 'stripe') {
  vi.stubEnv('FEATURE_DONATIONS_ENABLED', 'true')
  vi.stubEnv('DONATIONS_COMPLIANCE_CONFIRMED', 'true')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET)
  if (provider === 'mock') {
    vi.stubEnv('PAYMENTS_MODE', 'mock')
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', 'true')
  } else {
    vi.stubEnv('PAYMENTS_MODE', 'stripe')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy')
  }
}

beforeEach(() => vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET))
afterEach(() => vi.unstubAllEnvs())

async function pendingDonation(amountCents = 5_000) {
  return db.donation.create({
    data: { provider: 'STRIPE', amountCents, currency: 'EUR', idempotencyKey: crypto.randomUUID(), stripeCheckoutSessionId: 'cs_test_1' },
  })
}

function signedRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event)
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } })
}

function sessionEvent(id: string, type: string, donationId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    object: 'event',
    type,
    created: 1_790_000_000,
    livemode: false,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        amount_total: 5_000,
        currency: 'eur',
        payment_status: 'paid',
        payment_intent: 'pi_test_1',
        livemode: false,
        client_reference_id: donationId,
        metadata: { donationId },
        customer_details: { email: 'donor@example.it' },
        ...overrides,
      },
    },
  }
}

describe('Stripe webhook', () => {
  it('rejects requests without a valid signature', async () => {
    const donation = await pendingDonation()
    const unsigned = new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: '{}' })
    expect((await webhook(unsigned)).status).toBe(400)
    const forged = signedRequest(sessionEvent('evt_forged', 'checkout.session.completed', donation.id), 'whsec_wrong')
    expect((await webhook(forged)).status).toBe(400)
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).status).toBe('PENDING')
  })

  it('returns 503 when the webhook secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    expect((await webhook(signedRequest({ id: 'evt_x', type: 'ping', data: { object: {} } }))).status).toBe(503)
  })

  it('marks the donation as succeeded exactly once (idempotent)', async () => {
    const donation = await pendingDonation()
    const event = sessionEvent('evt_paid_1', 'checkout.session.completed', donation.id)

    const first = await webhook(signedRequest(event))
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ received: true, outcome: 'processed' })

    const replay = await webhook(signedRequest(event))
    expect(await replay.json()).toEqual({ received: true, outcome: 'duplicate' })

    const updated = await db.donation.findUniqueOrThrow({ where: { id: donation.id } })
    expect(updated).toMatchObject({ status: 'SUCCEEDED', amountReceivedCents: 5_000, stripePaymentIntentId: 'pi_test_1', donorEmail: 'donor@example.it', reconciliationStatus: 'UNRECONCILED' })
    expect(await db.donationEvent.count()).toBe(1)
  })

  it('flags an amount mismatch for reconciliation', async () => {
    const donation = await pendingDonation(5_000)
    await webhook(signedRequest(sessionEvent('evt_mismatch', 'checkout.session.completed', donation.id, { amount_total: 4_000 })))
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).reconciliationStatus).toBe('DISCREPANCY')
  })

  it('keeps async payments pending until they settle, then handles refunds', async () => {
    const donation = await pendingDonation()
    await webhook(signedRequest(sessionEvent('evt_async_1', 'checkout.session.completed', donation.id, { payment_status: 'unpaid' })))
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).status).toBe('PENDING')

    await webhook(signedRequest(sessionEvent('evt_async_2', 'checkout.session.async_payment_succeeded', donation.id)))
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).status).toBe('SUCCEEDED')

    // A late "expired" event cannot regress a successful donation.
    await webhook(signedRequest(sessionEvent('evt_late_expired', 'checkout.session.expired', donation.id)))
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).status).toBe('SUCCEEDED')

    const refund = {
      id: 'evt_refund',
      object: 'event',
      type: 'charge.refunded',
      created: 1_790_000_100,
      data: { object: { id: 'ch_1', object: 'charge', payment_intent: 'pi_test_1', amount_refunded: 5_000, refunded: true } },
    }
    await webhook(signedRequest(refund))
    expect((await db.donation.findUniqueOrThrow({ where: { id: donation.id } })).status).toBe('REFUNDED')
  })

  it('records unmatched events and ignores unrelated event types', async () => {
    const unmatched = await webhook(signedRequest(sessionEvent('evt_orphan', 'checkout.session.completed', 'does-not-exist')))
    expect(await unmatched.json()).toMatchObject({ outcome: 'unmatched' })
    const ignored = await webhook(signedRequest({ id: 'evt_other', object: 'event', type: 'customer.created', data: { object: {} } }))
    expect(await ignored.json()).toMatchObject({ outcome: 'ignored' })
    expect(await db.donationEvent.count()).toBe(1)
  })
})

describe('checkout creation', () => {
  const input = { amount: '50', idempotencyKey: '7c3b0f5e-2a51-4a1f-9b9d-3f9a6c1e2d4b', terms: true, locale: 'it' }

  it('refuses to create anything while donations are disabled', async () => {
    expect(await createDonationCheckout(input, ctx)).toEqual({ status: 'error', message: 'donationsDisabled' })
    expect(await db.donation.count()).toBe(0)
  })

  it('creates a hosted Stripe Checkout session with an idempotency key (Stripe mocked)', async () => {
    enableDonations('stripe')
    const create = vi.fn().mockResolvedValue({ id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new', livemode: false })
    const fakeStripe = { checkout: { sessions: { create } } } as unknown as Pick<Stripe, 'checkout'>

    const result = await createDonationCheckout(input, ctx, { stripe: fakeStripe })
    expect(result).toEqual({ status: 'redirect', url: 'https://checkout.stripe.com/c/pay/cs_test_new' })

    const [params, options] = create.mock.calls[0]!
    expect(params).toMatchObject({ mode: 'payment', locale: 'it', line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: 5_000 } }] })
    expect(params.success_url).toContain('/it/donate/success?session_id={CHECKOUT_SESSION_ID}')
    expect(options).toEqual({ idempotencyKey: `checkout:${input.idempotencyKey}` })

    // Double submission re-uses the same donation row.
    await createDonationCheckout(input, ctx, { stripe: fakeStripe })
    expect(await db.donation.count()).toBe(1)
    expect((await db.donation.findFirstOrThrow()).stripeCheckoutSessionId).toBe('cs_test_new')

    // Re-using the key with a different amount is refused.
    expect(await createDonationCheckout({ ...input, amount: '75' }, ctx, { stripe: fakeStripe })).toEqual({ status: 'error', message: 'duplicateSubmission' })
  })

  it('reports provider outages without leaving the donor stuck', async () => {
    enableDonations('stripe')
    const fakeStripe = { checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error('timeout')) } } } as unknown as Pick<Stripe, 'checkout'>
    expect(await createDonationCheckout(input, ctx, { stripe: fakeStripe })).toEqual({ status: 'error', message: 'paymentUnavailable' })
  })

  it('only allows designating projects that are fundraising', async () => {
    enableDonations('mock')
    const project = await db.project.create({
      data: { slug: 'p', pillar: 'COASTAL_SCHOOL_RENEWAL', status: 'IDEA', isPublished: true, titleEn: 'P', titleIt: 'P', summaryEn: 's', summaryIt: 's', descriptionEn: 'd', descriptionIt: 'd', locationEn: 'l', locationIt: 'l' },
    })
    const result = await createDonationCheckout({ ...input, projectId: project.id }, ctx)
    expect(result).toMatchObject({ status: 'error', fieldErrors: { projectId: 'projectUnavailable' } })
  })

  it('supports the mock provider for tests without contacting Stripe', async () => {
    enableDonations('mock')
    const result = await createDonationCheckout({ ...input, locale: 'en' }, ctx)
    expect(result.status).toBe('redirect')
    expect((result as { url: string }).url).toMatch(/\/donate\/success\?session_id=mock_cs_/)
    expect((await db.donation.findFirstOrThrow()).provider).toBe('MOCK')
  })
})
