import { z } from 'zod'
import {
  CONTACT_TOPICS,
  DONATION_LIMITS,
  LOCALES,
  SPONSOR_PACKAGES,
  SUPPORT_TYPES,
} from '@/lib/constants'
import { parseAmountToCents } from '@/lib/finance'

/**
 * Shared validation schemas. These run in the browser (instant feedback) and again on the server
 * (authoritative). Error messages are translation keys resolved under `forms.errors.*`.
 */

const text = (min: number, max: number) =>
  z
    .string('required')
    .trim()
    .min(min, min <= 1 ? 'required' : 'tooShort')
    .max(max, 'tooLong')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'tooLong')
    .optional()
    .transform((v) => (v ? v : undefined))

const email = z
  .string('required')
  .trim()
  .min(1, 'required')
  .max(254, 'tooLong')
  .pipe(z.email('email'))
  .transform((v) => v.toLowerCase())

const consent = z.literal(true, 'consentRequired')
const locale = z.enum(LOCALES).catch('en')

export const contactSchema = z.object({
  name: text(2, 120),
  email,
  topic: z.enum(CONTACT_TOPICS as [string, ...string[]], 'required'),
  message: text(10, 5000),
  consent,
  locale,
})
export type ContactInput = z.infer<typeof contactSchema>

export const supportInterestSchema = z.object({
  name: text(2, 120),
  email,
  supportType: z.enum(SUPPORT_TYPES as [string, ...string[]], 'required'),
  message: optionalText(2000),
  consent,
  locale,
})
export type SupportInterestInput = z.infer<typeof supportInterestSchema>

export const sponsorSchema = z.object({
  organizationName: text(2, 160),
  contactName: text(2, 120),
  email,
  phone: z
    .string()
    .trim()
    .max(40, 'tooLong')
    .refine((v) => v === '' || /^\+?[0-9 ()./-]{6,40}$/.test(v), 'phone')
    .optional()
    .transform((v) => (v ? v : undefined)),
  website: z
    .string()
    .trim()
    .max(300, 'tooLong')
    .refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'url')
    .optional()
    .transform((v) => (v ? v : undefined)),
  packageInterest: z.enum(SPONSOR_PACKAGES as [string, ...string[]], 'required'),
  message: text(10, 5000),
  consent,
  locale,
})
export type SponsorInput = z.infer<typeof sponsorSchema>

export const eventInterestSchema = z.object({
  eventSlug: z.string().trim().min(1, 'required').max(120).regex(/^[a-z0-9-]+$/, 'required'),
  name: text(2, 120),
  email,
  organization: optionalText(160),
  partySize: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number('number').int('number').min(1, 'partySize').max(20, 'partySize').optional(),
  ),
  message: optionalText(2000),
  consent,
  locale,
})
export type EventInterestInput = z.infer<typeof eventInterestSchema>

export const donationCheckoutSchema = z.object({
  amount: z
    .string('amountInvalid')
    .transform((value, ctx) => {
      const cents = parseAmountToCents(value)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'amountInvalid' })
        return z.NEVER
      }
      return cents
    })
    .pipe(
      z
        .number()
        .int()
        .min(DONATION_LIMITS.minCents, 'amountMin')
        .max(DONATION_LIMITS.maxCents, 'amountMax'),
    ),
  projectId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : undefined)),
  idempotencyKey: z.uuid('required'),
  terms: consent,
  locale,
})
export type DonationCheckoutInput = z.infer<typeof donationCheckoutSchema>

export const loginSchema = z.object({
  email,
  password: z.string('required').min(1, 'required').max(200, 'tooLong'),
})

export type FieldErrors = Record<string, string>

/** Flattens Zod issues into { field: translationKey }, keeping the first issue per field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form')
    if (!(field in result)) result[field] = issue.message
  }
  return result
}

/**
 * Converts FormData into a plain object for validation. Checkbox fields listed in `booleans`
 * become true/false; empty optional strings are kept as '' and normalised by the schemas.
 */
export function formDataToObject(
  formData: FormData,
  booleans: readonly string[] = [],
): Record<string, unknown> {
  const object: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION')) continue
    if (typeof value === 'string') object[key] = value
  }
  for (const key of booleans) {
    const value = formData.get(key)
    object[key] = value === 'on' || value === 'true'
  }
  return object
}

/** Honeypot field name: visually hidden; real people leave it empty. */
export const HONEYPOT_FIELD = 'company_website'

export type FormState = {
  status: 'idle' | 'success' | 'error'
  /** Translation key under `forms.messages.*`. */
  message?: string
  fieldErrors?: FieldErrors
}

export const initialFormState: FormState = { status: 'idle' }
