import { describe, expect, it } from 'vitest'
import {
  contactSchema,
  donationCheckoutSchema,
  eventInterestSchema,
  formDataToObject,
  sponsorSchema,
  supportInterestSchema,
  toFieldErrors,
} from '@/lib/validation'

const validContact = {
  name: 'Giulia Rossi',
  email: '  Giulia.Rossi@Example.IT ',
  topic: 'GENERAL',
  message: 'I would like to know more about the pilot.',
  consent: true,
  locale: 'it',
}

describe('contact schema', () => {
  it('accepts valid input and normalises email', () => {
    const result = contactSchema.parse(validContact)
    expect(result.email).toBe('giulia.rossi@example.it')
    expect(result.locale).toBe('it')
  })

  it('requires consent', () => {
    const result = contactSchema.safeParse({ ...validContact, consent: false })
    expect(result.success).toBe(false)
    expect(toFieldErrors(result.error!)).toEqual({ consent: 'consentRequired' })
  })

  it('reports translation keys for each invalid field', () => {
    const result = contactSchema.safeParse({ name: 'G', email: 'not-an-email', topic: 'HACK', message: 'short', consent: true })
    expect(result.success).toBe(false)
    expect(toFieldErrors(result.error!)).toEqual({ name: 'tooShort', email: 'email', topic: 'required', message: 'tooShort' })
  })

  it('rejects overly long messages and falls back to English for unknown locales', () => {
    expect(contactSchema.safeParse({ ...validContact, message: 'x'.repeat(5001) }).success).toBe(false)
    expect(contactSchema.parse({ ...validContact, locale: 'fr' }).locale).toBe('en')
  })

  it('does not accept the internal SUPPORT_INTEREST topic from the public contact form', () => {
    expect(contactSchema.safeParse({ ...validContact, topic: 'SUPPORT_INTEREST' }).success).toBe(false)
  })
})

describe('sponsor schema', () => {
  const valid = {
    organizationName: 'Cantiere Esempio Srl',
    contactName: 'Marco Bianchi',
    email: 'marco@example.it',
    phone: '+39 010 123 4567',
    website: 'https://example.it',
    packageInterest: 'FOUNDING_PARTNER',
    message: 'We would like to discuss an in-kind partnership.',
    consent: true,
  }

  it('accepts valid input and treats empty optional fields as undefined', () => {
    expect(sponsorSchema.parse(valid).website).toBe('https://example.it')
    const result = sponsorSchema.parse({ ...valid, phone: '', website: '' })
    expect(result.phone).toBeUndefined()
    expect(result.website).toBeUndefined()
  })

  it('validates phone and website formats', () => {
    const result = sponsorSchema.safeParse({ ...valid, phone: 'call me', website: 'example' })
    expect(toFieldErrors(result.error!)).toMatchObject({ phone: 'phone', website: 'url' })
  })
})

describe('event interest schema', () => {
  const valid = { eventSlug: 'blue-legacy-gala-2027', name: 'Anna Verdi', email: 'anna@example.it', consent: true }

  it('treats an empty party size as not provided', () => {
    expect(eventInterestSchema.parse({ ...valid, partySize: '' }).partySize).toBeUndefined()
    expect(eventInterestSchema.parse({ ...valid, partySize: '4' }).partySize).toBe(4)
  })

  it('bounds party size and slug format', () => {
    expect(toFieldErrors(eventInterestSchema.safeParse({ ...valid, partySize: '50' }).error!)).toEqual({ partySize: 'partySize' })
    expect(eventInterestSchema.safeParse({ ...valid, eventSlug: '../etc' }).success).toBe(false)
  })
})

describe('support interest schema', () => {
  it('allows an empty message but requires a support type', () => {
    const base = { name: 'Luca Neri', email: 'luca@example.it', consent: true, message: '' }
    expect(supportInterestSchema.safeParse({ ...base, supportType: 'ONE_OFF' }).success).toBe(true)
    expect(toFieldErrors(supportInterestSchema.safeParse(base).error!)).toEqual({ supportType: 'required' })
  })
})

describe('donation checkout schema', () => {
  const valid = { amount: '50', idempotencyKey: '7c3b0f5e-2a51-4a1f-9b9d-3f9a6c1e2d4b', terms: true, locale: 'en' }

  it('converts the amount to cents', () => {
    expect(donationCheckoutSchema.parse(valid).amount).toBe(5_000)
    expect(donationCheckoutSchema.parse({ ...valid, amount: '25,50' }).amount).toBe(2_550)
  })

  it.each([
    ['4.99', 'amountMin'],
    ['10000.01', 'amountMax'],
    ['fifty', 'amountInvalid'],
  ])('rejects %s with %s', (amount, key) => {
    expect(toFieldErrors(donationCheckoutSchema.safeParse({ ...valid, amount }).error!)).toEqual({ amount: key })
  })

  it('requires a UUID idempotency key and accepted terms', () => {
    const errors = toFieldErrors(donationCheckoutSchema.safeParse({ ...valid, idempotencyKey: 'x', terms: false }).error!)
    expect(errors).toEqual({ idempotencyKey: 'required', terms: 'consentRequired' })
  })
})

describe('formDataToObject', () => {
  it('maps checkboxes to booleans and drops action metadata', () => {
    const fd = new FormData()
    fd.set('name', 'Test')
    fd.set('consent', 'on')
    fd.set('$ACTION_ID_abc', '')
    expect(formDataToObject(fd, ['consent', 'other'])).toEqual({ name: 'Test', consent: true, other: false })
  })
})
