import 'server-only'
import { randomUUID } from 'node:crypto'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { DONATION_LIMITS } from '@/lib/constants'
import { getDonationsMode, getSiteUrl } from '@/lib/env'
import { donationCheckoutSchema, toFieldErrors, type FormState } from '@/lib/validation'
import { Prisma } from '@/generated/prisma/client'
import type { DonationStatus } from '@/generated/prisma/enums'
import { audit } from './audit'
import { consumeRateLimit, RATE_LIMITS } from './rate-limit'
import { getStripe } from './stripe'

export type CheckoutResult = { status: 'redirect'; url: string } | FormState

type CheckoutDeps = { stripe?: Pick<Stripe, 'checkout'> | null }

function localePath(locale: string, path: string): string {
  return `${getSiteUrl()}${locale === 'it' ? '/it' : ''}${path}`
}

/**
 * Creates (or re-uses, for a repeated idempotency key) a pending donation and a hosted Stripe
 * Checkout session. Card details never touch this server.
 */
export async function createDonationCheckout(
  raw: Record<string, unknown>,
  ctx: { ipHash: string },
  deps: CheckoutDeps = {},
): Promise<CheckoutResult> {
  const mode = getDonationsMode()
  if (!mode.enabled) return { status: 'error', message: 'donationsDisabled' }

  const parsed = donationCheckoutSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }
  }
  const input = parsed.data

  const limit = await consumeRateLimit(RATE_LIMITS.donationCheckout, ctx.ipHash)
  if (!limit.allowed) return { status: 'error', message: 'rateLimited' }

  let project: { id: string; titleEn: string; titleIt: string } | null = null
  if (input.projectId) {
    project = await db.project.findFirst({
      where: { id: input.projectId, isPublished: true, status: 'FUNDRAISING' },
      select: { id: true, titleEn: true, titleIt: true },
    })
    if (!project) return { status: 'error', fieldErrors: { projectId: 'projectUnavailable' }, message: 'fixErrors' }
  }

  // Idempotency: a double-submitted form re-uses the same donation row and checkout session.
  const existing = await db.donation.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (existing && (existing.amountCents !== input.amount || existing.projectId !== (project?.id ?? null))) {
    return { status: 'error', message: 'duplicateSubmission' }
  }
  if (existing && existing.status !== 'PENDING') return { status: 'error', message: 'duplicateSubmission' }

  const donation =
    existing ??
    (await db.donation.create({
      data: {
        provider: mode.provider === 'mock' ? 'MOCK' : 'STRIPE',
        amountCents: input.amount,
        currency: DONATION_LIMITS.currency,
        idempotencyKey: input.idempotencyKey,
        projectId: project?.id ?? null,
        locale: input.locale,
      },
    }))

  if (mode.provider === 'mock') {
    const sessionId = donation.stripeCheckoutSessionId ?? `mock_cs_${randomUUID()}`
    if (!donation.stripeCheckoutSessionId) {
      await db.donation.update({ where: { id: donation.id }, data: { stripeCheckoutSessionId: sessionId } })
    }
    // Relative URL: the mock flow never leaves this site.
    return { status: 'redirect', url: `${input.locale === 'it' ? '/it' : ''}/donate/success?session_id=${sessionId}` }
  }

  const stripe = deps.stripe === undefined ? getStripe() : deps.stripe
  if (!stripe) return { status: 'error', message: 'donationsDisabled' }

  try {
    const productName =
      input.locale === 'it'
        ? `Donazione a The Blue Legacy Foundation${project ? ` — ${project.titleIt}` : ''}`
        : `Donation to The Blue Legacy Foundation${project ? ` — ${project.titleEn}` : ''}`
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        submit_type: 'donate',
        locale: input.locale === 'it' ? 'it' : 'en',
        client_reference_id: donation.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: DONATION_LIMITS.currency.toLowerCase(),
              unit_amount: input.amount,
              product_data: { name: productName },
            },
          },
        ],
        metadata: { donationId: donation.id },
        payment_intent_data: { metadata: { donationId: donation.id } },
        success_url: localePath(input.locale, '/donate/success?session_id={CHECKOUT_SESSION_ID}'),
        cancel_url: localePath(input.locale, '/donate/cancel'),
      },
      { idempotencyKey: `checkout:${input.idempotencyKey}` },
    )
    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    await db.donation.update({
      where: { id: donation.id },
      data: { stripeCheckoutSessionId: session.id, livemode: session.livemode },
    })
    return { status: 'redirect', url: session.url }
  } catch (error) {
    console.error('[donations] failed to create checkout session', error)
    await audit({
      action: 'donation.checkout_failed',
      entityType: 'Donation',
      entityId: donation.id,
      metadata: { message: error instanceof Error ? error.message.slice(0, 200) : 'unknown' },
    })
    return { status: 'error', message: 'paymentUnavailable' }
  }
}

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored' | 'unmatched'

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'charge.refunded',
])

/** Valid forward transitions; anything else is ignored so late or replayed events cannot regress state. */
const ALLOWED_TRANSITIONS: Record<DonationStatus, readonly DonationStatus[]> = {
  PENDING: ['SUCCEEDED', 'FAILED', 'EXPIRED'],
  SUCCEEDED: ['REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  REFUNDED: [],
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

/**
 * Applies a verified Stripe event to the donation ledger. Idempotent: the provider event id is
 * stored with a unique constraint inside the same transaction as the state change.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  if (!HANDLED_EVENTS.has(event.type)) return 'ignored'

  try {
    return await db.$transaction(async (tx) => {
      const already = await tx.donationEvent.findUnique({ where: { providerEventId: event.id } })
      if (already) return 'duplicate' as const

      let donation = null
      let next: Prisma.DonationUpdateInput | null = null
      let summary: Prisma.InputJsonValue

      if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = idOf(charge.payment_intent)
        donation = paymentIntentId
          ? await tx.donation.findUnique({ where: { stripePaymentIntentId: paymentIntentId } })
          : null
        summary = {
          chargeId: charge.id,
          paymentIntentId,
          amountRefunded: charge.amount_refunded,
          fullyRefunded: charge.refunded,
        }
        if (donation && charge.refunded && ALLOWED_TRANSITIONS[donation.status].includes('REFUNDED')) {
          next = {
            status: 'REFUNDED',
            reconciliationStatus: 'UNRECONCILED',
          }
        }
      } else {
        const session = event.data.object as Stripe.Checkout.Session
        const donationId = session.metadata?.donationId ?? session.client_reference_id ?? null
        donation = donationId
          ? await tx.donation.findUnique({ where: { id: donationId } })
          : await tx.donation.findUnique({ where: { stripeCheckoutSessionId: session.id } })
        summary = {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          livemode: session.livemode,
        }

        if (donation) {
          let target: DonationStatus | null = null
          if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') target = 'SUCCEEDED'
          if (event.type === 'checkout.session.async_payment_succeeded') target = 'SUCCEEDED'
          if (event.type === 'checkout.session.async_payment_failed') target = 'FAILED'
          if (event.type === 'checkout.session.expired') target = 'EXPIRED'

          const base: Prisma.DonationUpdateInput = {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: idOf(session.payment_intent),
            livemode: session.livemode,
          }
          if (target && ALLOWED_TRANSITIONS[donation.status].includes(target)) {
            if (target === 'SUCCEEDED') {
              const received = session.amount_total ?? 0
              const currencyMatches = (session.currency ?? '').toUpperCase() === donation.currency
              next = {
                ...base,
                status: 'SUCCEEDED',
                amountReceivedCents: received,
                completedAt: new Date(event.created * 1000),
                donorEmail: session.customer_details?.email ?? null,
                // Flag any mismatch between what we asked for and what was paid.
                reconciliationStatus:
                  received === donation.amountCents && currencyMatches ? 'UNRECONCILED' : 'DISCREPANCY',
              }
            } else {
              next = { ...base, status: target }
            }
          } else if (event.type === 'checkout.session.completed') {
            next = base // async payment pending: record identifiers, keep status
          }
        }
      }

      await tx.donationEvent.create({
        data: { providerEventId: event.id, type: event.type, donationId: donation?.id ?? null, summary },
      })
      if (!donation) return 'unmatched' as const
      if (next) await tx.donation.update({ where: { id: donation.id }, data: next })
      return 'processed' as const
    })
  } catch (error) {
    // A concurrent delivery of the same event lost the race on the unique constraint.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'duplicate'
    throw error
  }
}

export async function getTransparencyLedger() {
  const [donations, projects] = await Promise.all([
    db.donation.findMany({
      where: { status: { in: ['SUCCEEDED', 'REFUNDED'] }, livemode: true },
      select: { status: true, amountReceivedCents: true, amountCents: true },
    }),
    db.project.findMany({
      where: { isPublished: true, isDemo: false },
      select: { pledgedCents: true, spentCents: true },
    }),
  ])
  return {
    succeededDonationCents: donations.map((d) => d.amountReceivedCents ?? d.amountCents),
    refundedDonationCents: donations.filter((d) => d.status === 'REFUNDED').map((d) => d.amountReceivedCents ?? d.amountCents),
    projectPledgedCents: projects.map((p) => p.pledgedCents),
    projectSpentCents: projects.map((p) => p.spentCents),
  }
}
