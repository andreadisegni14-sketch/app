import 'server-only'
import { db } from '@/lib/db'
import { PRIVACY_NOTICE_VERSION } from '@/lib/constants'
import { getSiteUrl } from '@/lib/env'
import {
  HONEYPOT_FIELD,
  contactSchema,
  eventInterestSchema,
  sponsorSchema,
  supportInterestSchema,
  toFieldErrors,
  type FormState,
} from '@/lib/validation'
import { consumeRateLimit, RATE_LIMITS, type RateLimitRule } from './rate-limit'
import { emailOutcome, sendEmail, type EmailResult } from './email'
import type {
  ContactTopic,
  SponsorPackage,
  SupportType,
} from '@/generated/prisma/enums'

/**
 * Public enquiry services. Each one:
 *  1. silently accepts-and-discards honeypot submissions,
 *  2. validates with the shared Zod schema,
 *  3. enforces a per-client rate limit,
 *  4. persists to the database FIRST (so nothing is lost if email fails), then
 *  5. attempts a staff notification email and records the outcome on the record.
 */

export type SubmissionContext = { ipHash: string }

type Mailer = (message: { subject: string; text: string; replyTo?: string }) => Promise<EmailResult>

const defaultMailer: Mailer = (message) => sendEmail(message)

function isHoneypotTriggered(raw: Record<string, unknown>): boolean {
  const value = raw[HONEYPOT_FIELD]
  return typeof value === 'string' && value.trim().length > 0
}

async function checkLimit(rule: RateLimitRule, ctx: SubmissionContext): Promise<FormState | null> {
  const result = await consumeRateLimit(rule, ctx.ipHash)
  return result.allowed ? null : { status: 'error', message: 'rateLimited' }
}

function adminLink(path: string): string {
  return `${getSiteUrl()}/admin${path}`
}

export async function submitContactInquiry(
  raw: Record<string, unknown>,
  ctx: SubmissionContext,
  mailer: Mailer = defaultMailer,
): Promise<FormState> {
  if (isHoneypotTriggered(raw)) return { status: 'success', message: 'contactSuccess' }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }
  }
  const limited = await checkLimit(RATE_LIMITS.contact, ctx)
  if (limited) return limited

  const input = parsed.data
  const inquiry = await db.contactInquiry.create({
    data: {
      source: 'CONTACT_FORM',
      topic: input.topic as ContactTopic,
      name: input.name,
      email: input.email,
      message: input.message,
      locale: input.locale,
      consentAt: new Date(),
      privacyVersion: PRIVACY_NOTICE_VERSION,
    },
  })

  const result = await mailer({
    subject: `[Blue Legacy] New contact enquiry (${input.topic})`,
    text: [
      `A new contact enquiry was received.`,
      ``,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Topic: ${input.topic}`,
      ``,
      input.message,
      ``,
      `Review in the admin dashboard: ${adminLink(`/inquiries/contact/${inquiry.id}`)}`,
    ].join('\n'),
    replyTo: input.email,
  })
  await db.contactInquiry.update({ where: { id: inquiry.id }, data: emailOutcome(result) })

  return { status: 'success', message: 'contactSuccess' }
}

export async function submitSupportInterest(
  raw: Record<string, unknown>,
  ctx: SubmissionContext,
  mailer: Mailer = defaultMailer,
): Promise<FormState> {
  if (isHoneypotTriggered(raw)) return { status: 'success', message: 'supportSuccess' }

  const parsed = supportInterestSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }
  }
  const limited = await checkLimit(RATE_LIMITS.supportInterest, ctx)
  if (limited) return limited

  const input = parsed.data
  const inquiry = await db.contactInquiry.create({
    data: {
      source: 'DONATE_INTEREST',
      topic: 'SUPPORT_INTEREST',
      supportType: input.supportType as SupportType,
      name: input.name,
      email: input.email,
      message: input.message ?? '',
      locale: input.locale,
      consentAt: new Date(),
      privacyVersion: PRIVACY_NOTICE_VERSION,
    },
  })

  const result = await mailer({
    subject: `[Blue Legacy] New interest in supporting the foundation (${input.supportType})`,
    text: [
      `Someone registered interest in supporting the foundation (no payment was taken).`,
      ``,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Type of support: ${input.supportType}`,
      ``,
      input.message ?? '(no message)',
      ``,
      `Review: ${adminLink(`/inquiries/contact/${inquiry.id}`)}`,
    ].join('\n'),
    replyTo: input.email,
  })
  await db.contactInquiry.update({ where: { id: inquiry.id }, data: emailOutcome(result) })

  return { status: 'success', message: 'supportSuccess' }
}

export async function submitSponsorInquiry(
  raw: Record<string, unknown>,
  ctx: SubmissionContext,
  mailer: Mailer = defaultMailer,
): Promise<FormState> {
  if (isHoneypotTriggered(raw)) return { status: 'success', message: 'sponsorSuccess' }

  const parsed = sponsorSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }
  }
  const limited = await checkLimit(RATE_LIMITS.sponsor, ctx)
  if (limited) return limited

  const input = parsed.data
  const inquiry = await db.sponsorInquiry.create({
    data: {
      organizationName: input.organizationName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      website: input.website ?? null,
      packageInterest: input.packageInterest as SponsorPackage,
      message: input.message,
      locale: input.locale,
      consentAt: new Date(),
      privacyVersion: PRIVACY_NOTICE_VERSION,
    },
  })

  const result = await mailer({
    subject: `[Blue Legacy] New partnership enquiry: ${input.organizationName}`,
    text: [
      `A new partnership / sponsorship enquiry was received.`,
      ``,
      `Organisation: ${input.organizationName}`,
      `Contact: ${input.contactName} <${input.email}>`,
      `Package of interest (proposal): ${input.packageInterest}`,
      ``,
      input.message,
      ``,
      `Review: ${adminLink(`/inquiries/sponsor/${inquiry.id}`)}`,
    ].join('\n'),
    replyTo: input.email,
  })
  await db.sponsorInquiry.update({ where: { id: inquiry.id }, data: emailOutcome(result) })

  return { status: 'success', message: 'sponsorSuccess' }
}

export async function submitEventInterest(
  raw: Record<string, unknown>,
  ctx: SubmissionContext,
  mailer: Mailer = defaultMailer,
): Promise<FormState> {
  if (isHoneypotTriggered(raw)) return { status: 'success', message: 'eventSuccess' }

  const parsed = eventInterestSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }
  }
  const input = parsed.data

  const event = await db.event.findUnique({ where: { slug: input.eventSlug } })
  if (
    !event ||
    !event.isPublished ||
    !event.interestOpen ||
    event.status === 'CANCELLED' ||
    event.status === 'COMPLETED'
  ) {
    return { status: 'error', message: 'eventClosed' }
  }

  const limited = await checkLimit(RATE_LIMITS.eventInterest, ctx)
  if (limited) return limited

  const data = {
    name: input.name,
    organization: input.organization ?? null,
    partySize: input.partySize ?? null,
    message: input.message ?? null,
    locale: input.locale,
    consentAt: new Date(),
    privacyVersion: PRIVACY_NOTICE_VERSION,
  }
  const existing = await db.eventInterest.findUnique({
    where: { eventId_email: { eventId: event.id, email: input.email } },
    select: { id: true },
  })
  const interest = await db.eventInterest.upsert({
    where: { eventId_email: { eventId: event.id, email: input.email } },
    create: { ...data, eventId: event.id, email: input.email },
    update: { ...data, emailStatus: 'PENDING' },
  })

  const result = await mailer({
    subject: `[Blue Legacy] ${existing ? 'Updated' : 'New'} interest: ${event.titleEn}`,
    text: [
      `Interest registration for "${event.titleEn}" (status: ${event.status}).`,
      ``,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      input.organization ? `Organisation: ${input.organization}` : null,
      input.partySize ? `Party size: ${input.partySize}` : null,
      ``,
      input.message ?? '(no message)',
      ``,
      `Review: ${adminLink(`/inquiries/events/${interest.id}`)}`,
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
    replyTo: input.email,
  })
  await db.eventInterest.update({ where: { id: interest.id }, data: emailOutcome(result) })

  return { status: 'success', message: existing ? 'eventUpdated' : 'eventSuccess' }
}
