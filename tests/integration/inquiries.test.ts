import { describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { submitContactInquiry, submitEventInterest, submitSponsorInquiry, submitSupportInterest } from '@/lib/server/inquiries'
import { createEvent } from './factories'

const ctx = { ipHash: 'test-ip-hash' }

const contact = {
  name: 'Giulia Rossi',
  email: 'giulia@example.it',
  topic: 'GENERAL',
  message: 'Vorrei sapere di più sul progetto pilota.',
  consent: true,
  locale: 'it',
}

describe('contact enquiries', () => {
  it('persists a valid enquiry and records that email is not configured', async () => {
    const result = await submitContactInquiry(contact, ctx)
    expect(result).toEqual({ status: 'success', message: 'contactSuccess' })
    const rows = await db.contactInquiry.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Giulia Rossi', email: 'giulia@example.it', source: 'CONTACT_FORM', status: 'NEW', emailStatus: 'NOT_CONFIGURED', locale: 'it' })
    expect(rows[0]!.privacyVersion).toBeTruthy()
  })

  it('keeps the enquiry when the email provider fails', async () => {
    const mailer = vi.fn().mockResolvedValue({ status: 'FAILED', error: 'HTTP 500: provider down' })
    await expect(submitContactInquiry(contact, ctx, mailer)).resolves.toMatchObject({ status: 'success' })
    expect(mailer).toHaveBeenCalledOnce()
    const row = await db.contactInquiry.findFirstOrThrow()
    expect(row.emailStatus).toBe('FAILED')
    expect(row.emailError).toContain('provider down')
  })

  it('records successful notifications', async () => {
    const mailer = vi.fn().mockResolvedValue({ status: 'SENT', id: 'em_1' })
    await submitContactInquiry(contact, ctx, mailer)
    expect((await db.contactInquiry.findFirstOrThrow()).emailStatus).toBe('SENT')
    expect(mailer.mock.calls[0]![0]).toMatchObject({ replyTo: 'giulia@example.it' })
  })

  it('returns field errors and stores nothing for invalid input', async () => {
    const result = await submitContactInquiry({ ...contact, email: 'nope', consent: false }, ctx)
    expect(result).toEqual({ status: 'error', message: 'fixErrors', fieldErrors: { email: 'email', consent: 'consentRequired' } })
    expect(await db.contactInquiry.count()).toBe(0)
  })

  it('silently discards honeypot submissions', async () => {
    const result = await submitContactInquiry({ ...contact, company_website: 'http://spam.example' }, ctx)
    expect(result.status).toBe('success')
    expect(await db.contactInquiry.count()).toBe(0)
  })

  it('rate-limits repeated submissions from the same client', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await submitContactInquiry(contact, ctx)).status).toBe('success')
    }
    expect(await submitContactInquiry(contact, ctx)).toEqual({ status: 'error', message: 'rateLimited' })
    expect(await db.contactInquiry.count()).toBe(5)
    // A different client is unaffected.
    expect((await submitContactInquiry(contact, { ipHash: 'other-client' })).status).toBe('success')
  })

  it('never stores the raw client identifier in the rate-limit table', async () => {
    await submitContactInquiry(contact, ctx)
    const keys = (await db.rateLimit.findMany()).map((r) => r.key)
    expect(keys).toEqual(['contact:test-ip-hash'])
  })
})

describe('support interest (donations disabled mode)', () => {
  it('stores a non-financial interest registration', async () => {
    const result = await submitSupportInterest({ name: 'Luca Neri', email: 'luca@example.it', supportType: 'CORPORATE', message: '', consent: true }, ctx)
    expect(result.message).toBe('supportSuccess')
    const row = await db.contactInquiry.findFirstOrThrow()
    expect(row).toMatchObject({ source: 'DONATE_INTEREST', topic: 'SUPPORT_INTEREST', supportType: 'CORPORATE' })
    expect(await db.donation.count()).toBe(0)
  })
})

describe('sponsor enquiries', () => {
  it('persists a partnership enquiry', async () => {
    const result = await submitSponsorInquiry(
      {
        organizationName: 'Cantiere Esempio Srl',
        contactName: 'Marco Bianchi',
        email: 'Marco@Example.it',
        phone: '',
        website: 'https://example.it',
        packageInterest: 'REGATTA_PARTNER',
        message: 'Interested in supporting the youth programme.',
        consent: true,
      },
      ctx,
    )
    expect(result.message).toBe('sponsorSuccess')
    const row = await db.sponsorInquiry.findFirstOrThrow()
    expect(row).toMatchObject({ email: 'marco@example.it', phone: null, packageInterest: 'REGATTA_PARTNER', emailStatus: 'NOT_CONFIGURED' })
  })
})

describe('event interest', () => {
  const base = { eventSlug: 'test-gala', name: 'Anna Verdi', email: 'anna@example.it', partySize: '2', consent: true }

  it('registers once per email and updates on resubmission', async () => {
    await createEvent()
    expect((await submitEventInterest(base, ctx)).message).toBe('eventSuccess')
    expect((await submitEventInterest({ ...base, partySize: '4' }, ctx)).message).toBe('eventUpdated')
    const rows = await db.eventInterest.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.partySize).toBe(4)
  })

  it.each([
    ['cancelled', { status: 'CANCELLED' as const }],
    ['closed', { interestOpen: false }],
  ])('rejects registrations for %s events', async (_label, overrides) => {
    await createEvent(overrides)
    expect(await submitEventInterest(base, ctx)).toEqual({ status: 'error', message: 'eventClosed' })
  })

  it('rejects unknown events', async () => {
    expect(await submitEventInterest({ ...base, eventSlug: 'missing' }, ctx)).toEqual({ status: 'error', message: 'eventClosed' })
  })
})
