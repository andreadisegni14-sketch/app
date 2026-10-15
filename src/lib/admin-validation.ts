import { z } from 'zod'
import { EVENT_STATUSES, INQUIRY_STATUSES, PILLARS, PROJECT_STATUSES } from '@/lib/constants'
import { parseAmountToCents } from '@/lib/finance'

/** Validation for admin forms. Messages are plain English (the admin UI is English-only). */

const req = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long (max ${max}).`)

const opt = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Too long (max ${max}).`)
    .optional()
    .transform((v) => (v ? v : null))

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return 0
      const cents = parseAmountToCents(value)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: `${label}: enter an amount like 1500 or 1500.00.` })
        return z.NEVER
      }
      return cents
    })

const lines = (label: string) =>
  z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(300, `${label}: each line must be under 300 characters.`)).max(20, `${label}: at most 20 lines.`))

export const budgetLineSchema = z.object({
  labelEn: z.string().trim().min(1).max(120),
  labelIt: z.string().trim().min(1).max(120),
  amountCents: z.number().int().min(0).max(100_000_000),
})
export const budgetLinesSchema = z.array(budgetLineSchema).max(30)
export type BudgetLine = z.infer<typeof budgetLineSchema>

/**
 * Budget lines are edited as text, one per line: "English label | Italian label | amount".
 */
export const budgetLinesTextSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const rows = (value ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const result: BudgetLine[] = []
    rows.forEach((row, index) => {
      const parts = row.split('|').map((p) => p.trim())
      const cents = parts[2] !== undefined ? parseAmountToCents(parts[2]) : null
      if (parts.length !== 3 || !parts[0] || !parts[1] || cents === null) {
        ctx.addIssue({
          code: 'custom',
          message: `Budget line ${index + 1}: use "English label | Italian label | amount".`,
        })
        return
      }
      result.push({ labelEn: parts[0], labelIt: parts[1], amountCents: cents })
    })
    return result
  })
  .pipe(budgetLinesSchema)

export function budgetLinesToText(value: unknown): string {
  const parsed = budgetLinesSchema.safeParse(value)
  if (!parsed.success) return ''
  return parsed.data.map((l) => `${l.labelEn} | ${l.labelIt} | ${(l.amountCents / 100).toFixed(2)}`).join('\n')
}

const checkbox = z.boolean()

export const projectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters.')
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers and single hyphens.'),
  pillar: z.enum(PILLARS as [string, ...string[]], 'Choose a pillar.'),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]], 'Choose a status.'),
  titleEn: req('English title', 160),
  titleIt: req('Italian title', 160),
  summaryEn: req('English summary', 400),
  summaryIt: req('Italian summary', 400),
  descriptionEn: req('English description', 10_000),
  descriptionIt: req('Italian description', 10_000),
  locationEn: req('English location', 160),
  locationIt: req('Italian location', 160),
  region: opt(80),
  goalsEn: lines('English goals'),
  goalsIt: lines('Italian goals'),
  budgetLines: budgetLinesTextSchema,
  budgetIsIllustrative: checkbox,
  pledged: money('Pledged'),
  spent: money('Spent'),
  privacyNoteEn: opt(2000),
  privacyNoteIt: opt(2000),
  sortOrder: z.coerce.number().int().min(0).max(10_000).catch(0),
  isPublished: checkbox,
  isFeatured: checkbox,
  isDemo: checkbox,
  coverMediaId: opt(40),
})
export type ProjectInput = z.infer<typeof projectSchema>

export const milestoneSchema = z.object({
  titleEn: req('English title', 160),
  titleIt: req('Italian title', 160),
  descriptionEn: opt(2000),
  descriptionIt: opt(2000),
  targetLabelEn: opt(80),
  targetLabelIt: opt(80),
  sortOrder: z.coerce.number().int().min(0).max(10_000).catch(0),
  completed: checkbox,
})

export const projectUpdateSchema = z.object({
  titleEn: req('English title', 160),
  titleIt: req('Italian title', 160),
  bodyEn: req('English text', 10_000),
  bodyIt: req('Italian text', 10_000),
  isPublished: checkbox,
})

export const inquiryUpdateSchema = z.object({
  status: z.enum(INQUIRY_STATUSES as [string, ...string[]], 'Choose a status.'),
  internalNotes: opt(5000),
})

export const eventUpdateSchema = z.object({
  status: z.enum(EVENT_STATUSES as [string, ...string[]], 'Choose a status.'),
  interestOpen: checkbox,
  isPublished: checkbox,
  dateLabelEn: req('English timing', 120),
  dateLabelIt: req('Italian timing', 120),
  locationEn: req('English location', 160),
  locationIt: req('Italian location', 160),
})

export const mediaMetaSchema = z.object({
  altEn: z.string().trim().max(300).default(''),
  altIt: z.string().trim().max(300).default(''),
  credit: opt(200),
  license: opt(120),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Source URL must start with http(s)://')
    .optional()
    .transform((v) => (v ? v : null)),
  projectId: opt(40),
  isPublic: checkbox,
  depictsMinors: checkbox,
  guardianConsentConfirmed: checkbox,
})

export const userCreateSchema = z.object({
  name: req('Name', 120),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'], 'Choose a role.'),
  password: z.string().min(12, 'Use at least 12 characters.').max(200),
})

export const reconcileSchema = z.object({
  reconciliationStatus: z.enum(['UNRECONCILED', 'RECONCILED', 'DISCREPANCY'], 'Choose a status.'),
  reconciliationNote: opt(2000),
})

export const beneficiarySchema = z.object({
  name: req('Name', 160),
  type: z.enum(['SCHOOL', 'SAILING_CLUB', 'NONPROFIT', 'PUBLIC_BODY', 'OTHER'], 'Choose a type.'),
  region: opt(80),
  contactName: opt(120),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address.')
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  dueDiligenceStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED'], 'Choose a status.'),
  dueDiligenceNotes: opt(5000),
  publicNameConsent: checkbox,
})

export const settingsSchema = z.object({
  launchStatusNoteEn: z.string().trim().max(600, 'Too long (max 600).'),
  launchStatusNoteIt: z.string().trim().max(600, 'Too long (max 600).'),
})

/** Flattens Zod issues into a list of human-readable messages for the admin UI. */
export function adminErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const field = issue.path.join('.')
    return issue.message.includes(' ') ? issue.message : `${field}: ${issue.message}`
  })
}
