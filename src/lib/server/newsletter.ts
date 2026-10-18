import 'server-only'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { can, type Permission } from '@/lib/auth/permissions'
import { PRIVACY_NOTICE_VERSION } from '@/lib/constants'
import { getNewsletterSenderAddress, getSiteUrl, isEmailConfigured } from '@/lib/env'
import { newsletterIssueSchema, adminErrors } from '@/lib/admin-validation'
import { maskEmail, newsletterPath } from '@/lib/newsletter/privacy'
import { emailLocale, newsletterConsentText, renderConfirmationEmail, renderIssueEmail, type EmailLocale } from '@/lib/newsletter/templates'
import { confirmTokenExpiry, generateToken, hashToken, isTokenExpired, isWellFormedToken } from '@/lib/newsletter/tokens'
import { HONEYPOT_FIELD, newsletterSubscribeSchema, toFieldErrors, type FormState } from '@/lib/validation'
import type { RoleName } from '@/generated/prisma/enums'
import { audit } from './audit'
import { MAX_BATCH_SIZE, sendEmail, sendEmailBatch, type BatchEmailResult, type EmailMessage, type EmailResult } from './email'
import { consumeRateLimit, RATE_LIMITS } from './rate-limit'
import { hashIdentifier } from './request'

/**
 * Newsletter with double opt-in.
 *
 * Public flows never reveal whether an address is already known: every valid sign-up gets the
 * same "check your inbox" answer. Subscribers are stored FIRST and the confirmation email is
 * attempted afterwards, recording the outcome so the admin can resend once email is configured.
 */

export type OutgoingEmail = EmailMessage & { to: string }
export type NewsletterMailer = (message: OutgoingEmail) => Promise<EmailResult>
export type NewsletterTransport = {
  configured: boolean
  sendBatch: (messages: OutgoingEmail[], idempotencyKey: string) => Promise<BatchEmailResult>
}

const defaultMailer: NewsletterMailer = (message) => sendEmail(message)

function defaultTransport(): NewsletterTransport {
  return { configured: isEmailConfigured(), sendBatch: (messages, key) => sendEmailBatch(messages, key) }
}

const CHECK_INBOX: FormState = { status: 'success', message: 'newsletterCheckInbox' }

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export function confirmUrl(locale: string, token: string): string {
  return `${getSiteUrl()}${newsletterPath(locale, '/newsletter/confirm')}?token=${encodeURIComponent(token)}`
}

export function unsubscribePageUrl(locale: string, token: string): string {
  return `${getSiteUrl()}${newsletterPath(locale, '/newsletter/unsubscribe')}?token=${encodeURIComponent(token)}`
}

/** RFC 8058 one-click endpoint (POST only), used in the List-Unsubscribe header. */
export function oneClickUnsubscribeUrl(token: string): string {
  return `${getSiteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

export function listUnsubscribeHeaders(token: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl(token)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// ---------------------------------------------------------------------------
// Public: subscribe, confirm, unsubscribe
// ---------------------------------------------------------------------------

async function sendConfirmation(
  subscriber: { id: string; email: string; locale: string },
  token: string,
  mailer: NewsletterMailer,
): Promise<EmailResult> {
  const locale = emailLocale(subscriber.locale)
  const email = renderConfirmationEmail({ locale, confirmUrl: confirmUrl(locale, token), siteUrl: getSiteUrl() })
  const result = await mailer({ to: subscriber.email, subject: email.subject, text: email.text, html: email.html })
  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      confirmEmailStatus: result.status,
      confirmEmailError: result.status === 'FAILED' ? result.error : null,
      ...(result.status === 'SENT' ? { confirmEmailSentAt: new Date() } : {}),
    },
  })
  return result
}

function freshConfirmToken() {
  const token = generateToken()
  return { token, data: { confirmTokenHash: hashToken(token), confirmTokenExpiresAt: confirmTokenExpiry() } }
}

export async function subscribeToNewsletter(
  raw: Record<string, unknown>,
  ctx: { ipHash: string },
  mailer: NewsletterMailer = defaultMailer,
): Promise<FormState> {
  const honeypot = raw[HONEYPOT_FIELD]
  if (typeof honeypot === 'string' && honeypot.trim()) return CHECK_INBOX

  const parsed = newsletterSubscribeSchema.safeParse(raw)
  if (!parsed.success) return { status: 'error', message: 'fixErrors', fieldErrors: toFieldErrors(parsed.error) }

  const limited = await consumeRateLimit(RATE_LIMITS.newsletter, ctx.ipHash)
  if (!limited.allowed) return { status: 'error', message: 'rateLimited' }

  const input = parsed.data
  // Per-address limit: nobody can flood someone else's inbox with confirmation emails.
  // Exceeding it still returns the neutral answer, so it does not reveal anything either.
  const perAddress = await consumeRateLimit(RATE_LIMITS.newsletterAddress, hashIdentifier(`newsletter:${input.email}`))
  if (!perAddress.allowed) return CHECK_INBOX

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: input.email }, select: { status: true } })
  // Already confirmed: nothing to do, and nothing to reveal.
  if (existing?.status === 'CONFIRMED') return CHECK_INBOX

  const { token, data: tokenData } = freshConfirmToken()
  const data = {
    ...tokenData,
    locale: input.locale,
    status: 'PENDING' as const,
    consentText: newsletterConsentText(emailLocale(input.locale)),
    consentAt: new Date(),
    privacyVersion: PRIVACY_NOTICE_VERSION,
    source: input.source,
    confirmedAt: null,
    unsubscribedAt: null,
    confirmEmailStatus: 'PENDING' as const,
    confirmEmailError: null,
  }
  const subscriber = await db.newsletterSubscriber.upsert({
    where: { email: input.email },
    create: { ...data, email: input.email, unsubscribeToken: generateToken() },
    update: data,
    select: { id: true, email: true, locale: true },
  })
  await sendConfirmation(subscriber, token, mailer)
  return CHECK_INBOX
}

export type ConfirmTokenState = 'valid' | 'invalid' | 'expired'

/** Read-only check used by the confirmation page before the visitor presses the button. */
export async function checkConfirmToken(token: unknown, now: Date = new Date()): Promise<ConfirmTokenState> {
  if (!isWellFormedToken(token)) return 'invalid'
  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { confirmTokenHash: hashToken(token) },
    select: { status: true, confirmTokenExpiresAt: true },
  })
  if (!subscriber || subscriber.status !== 'PENDING') return 'invalid'
  return isTokenExpired(subscriber.confirmTokenExpiresAt, now) ? 'expired' : 'valid'
}

export async function confirmSubscription(token: unknown, now: Date = new Date()): Promise<'confirmed' | 'invalid' | 'expired'> {
  const state = await checkConfirmToken(token, now)
  if (state !== 'valid') return state
  const tokenHash = hashToken(token as string)
  const { count } = await db.newsletterSubscriber.updateMany({
    where: { confirmTokenHash: tokenHash, status: 'PENDING' },
    data: { status: 'CONFIRMED', confirmedAt: now, confirmTokenHash: null, confirmTokenExpiresAt: null },
  })
  return count === 1 ? 'confirmed' : 'invalid'
}

export type UnsubscribeState = { state: 'invalid' } | { state: 'subscribed'; maskedEmail: string } | { state: 'unsubscribed' }

/** Read-only: what the unsubscribe page should show. GET requests never change anything. */
export async function getUnsubscribeState(token: unknown): Promise<UnsubscribeState> {
  if (!isWellFormedToken(token)) return { state: 'invalid' }
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token }, select: { email: true, status: true } })
  if (!subscriber) return { state: 'invalid' }
  if (subscriber.status === 'UNSUBSCRIBED') return { state: 'unsubscribed' }
  return { state: 'subscribed', maskedEmail: maskEmail(subscriber.email) }
}

/** Idempotent: unsubscribing twice is fine. */
export async function unsubscribeByToken(token: unknown, now: Date = new Date()): Promise<'unsubscribed' | 'invalid'> {
  if (!isWellFormedToken(token)) return 'invalid'
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token }, select: { id: true, status: true } })
  if (!subscriber) return 'invalid'
  if (subscriber.status !== 'UNSUBSCRIBED') {
    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: now, confirmTokenHash: null, confirmTokenExpiresAt: null },
    })
  }
  return 'unsubscribed'
}

// ---------------------------------------------------------------------------
// Admin: subscribers
// ---------------------------------------------------------------------------

export type Actor = { id: string; email: string; role: RoleName | null }
export type ServiceResult = { ok: true; message: string; id?: string } | { ok: false; error: string; code?: 'forbidden' | 'not_found' | 'not_configured' | 'invalid' }

const FORBIDDEN: Record<string, string> = {
  'newsletter:manage': 'Your role cannot manage the newsletter.',
  'newsletter:send': 'Only administrators can send a newsletter to subscribers.',
  'newsletter:erase': 'Only administrators can permanently erase subscribers.',
}

function deny(actor: Actor, permission: Permission): ServiceResult | null {
  return can(actor.role, permission) ? null : { ok: false, code: 'forbidden', error: FORBIDDEN[permission] ?? 'Forbidden.' }
}

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  'Email is not configured: set RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified in Resend), then try again.'

export async function resendConfirmation(actor: Actor, subscriberId: string, mailer: NewsletterMailer = defaultMailer): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { id: subscriberId }, select: { id: true, email: true, locale: true, status: true } })
  if (!subscriber) return { ok: false, code: 'not_found', error: 'Subscriber not found.' }
  if (subscriber.status !== 'PENDING') return { ok: false, code: 'invalid', error: 'Only pending subscribers can be sent a confirmation email.' }

  const { token, data } = freshConfirmToken()
  await db.newsletterSubscriber.update({ where: { id: subscriber.id }, data })
  const result = await sendConfirmation(subscriber, token, mailer)
  await audit({ actorId: actor.id, action: 'newsletter.confirmation.resend', entityType: 'NewsletterSubscriber', entityId: subscriber.id, metadata: { outcome: result.status } })
  if (result.status === 'NOT_CONFIGURED') return { ok: false, code: 'not_configured', error: EMAIL_NOT_CONFIGURED_MESSAGE }
  if (result.status === 'FAILED') return { ok: false, error: `The confirmation email could not be sent: ${result.error}` }
  return { ok: true, message: 'Confirmation email sent with a new 7-day link.' }
}

/** Sends confirmations that never went out (e.g. signed up before email was configured). */
export async function resendUnsentConfirmations(actor: Actor, mailer: NewsletterMailer = defaultMailer, limit = 200): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const pending = await db.newsletterSubscriber.findMany({
    where: { status: 'PENDING', confirmEmailStatus: { in: ['NOT_CONFIGURED', 'FAILED'] } },
    select: { id: true, email: true, locale: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  let sent = 0
  let failed = 0
  for (const subscriber of pending) {
    const { token, data } = freshConfirmToken()
    await db.newsletterSubscriber.update({ where: { id: subscriber.id }, data })
    const result = await sendConfirmation(subscriber, token, mailer)
    if (result.status === 'NOT_CONFIGURED') return { ok: false, code: 'not_configured', error: EMAIL_NOT_CONFIGURED_MESSAGE }
    if (result.status === 'SENT') sent++
    else failed++
  }
  await audit({ actorId: actor.id, action: 'newsletter.confirmation.resend_unsent', entityType: 'NewsletterSubscriber', metadata: { sent, failed } })
  if (pending.length === 0) return { ok: true, message: 'There were no unsent confirmation emails.' }
  return failed
    ? { ok: false, error: `${sent} confirmation email(s) sent, ${failed} failed. Check the error shown on each subscriber.` }
    : { ok: true, message: `${sent} confirmation email(s) sent.` }
}

export async function adminUnsubscribe(actor: Actor, subscriberId: string): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const { count } = await db.newsletterSubscriber.updateMany({
    where: { id: subscriberId, status: { not: 'UNSUBSCRIBED' } },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date(), confirmTokenHash: null, confirmTokenExpiresAt: null },
  })
  if (!count) return { ok: false, code: 'not_found', error: 'Subscriber not found or already unsubscribed.' }
  await audit({ actorId: actor.id, action: 'newsletter.subscriber.unsubscribe', entityType: 'NewsletterSubscriber', entityId: subscriberId })
  return { ok: true, message: 'The subscriber was unsubscribed.' }
}

/** GDPR erasure: removes the subscriber and their delivery records. The audit entry holds no address. */
export async function eraseSubscriber(actor: Actor, subscriberId: string): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:erase')
  if (denied) return denied
  const { count } = await db.newsletterSubscriber.deleteMany({ where: { id: subscriberId } })
  if (!count) return { ok: false, code: 'not_found', error: 'Subscriber not found.' }
  await audit({ actorId: actor.id, action: 'newsletter.subscriber.erase', entityType: 'NewsletterSubscriber', entityId: subscriberId })
  return { ok: true, message: 'The subscriber was permanently erased.' }
}

// ---------------------------------------------------------------------------
// Admin: issues
// ---------------------------------------------------------------------------

export async function saveIssue(actor: Actor, raw: Record<string, unknown>, issueId?: string | null): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const parsed = newsletterIssueSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, code: 'invalid', error: adminErrors(parsed.error).join(' ') }

  if (issueId) {
    const { count } = await db.newsletterIssue.updateMany({ where: { id: issueId, status: 'DRAFT' }, data: parsed.data })
    if (!count) return { ok: false, code: 'invalid', error: 'Only drafts can be edited; issues that have been sent are read-only.' }
    await audit({ actorId: actor.id, action: 'newsletter.issue.update', entityType: 'NewsletterIssue', entityId: issueId })
    return { ok: true, message: 'Draft saved.', id: issueId }
  }
  const issue = await db.newsletterIssue.create({ data: { ...parsed.data, createdById: actor.id } })
  await audit({ actorId: actor.id, action: 'newsletter.issue.create', entityType: 'NewsletterIssue', entityId: issue.id })
  return { ok: true, message: 'Draft created.', id: issue.id }
}

export async function deleteDraftIssue(actor: Actor, issueId: string): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const { count } = await db.newsletterIssue.deleteMany({ where: { id: issueId, status: 'DRAFT' } })
  if (!count) return { ok: false, code: 'invalid', error: 'Only drafts can be deleted.' }
  await audit({ actorId: actor.id, action: 'newsletter.issue.delete', entityType: 'NewsletterIssue', entityId: issueId })
  return { ok: true, message: 'Draft deleted.' }
}

type IssueContent = { subjectEn: string; subjectIt: string; bodyEn: string; bodyIt: string }

function issueEmailFor(issue: IssueContent, locale: EmailLocale, unsubscribeUrl: string, isTest = false) {
  return renderIssueEmail({
    locale,
    subject: locale === 'it' ? issue.subjectIt : issue.subjectEn,
    body: locale === 'it' ? issue.bodyIt : issue.bodyEn,
    siteUrl: getSiteUrl(),
    unsubscribeUrl,
    senderAddress: getNewsletterSenderAddress(),
    isTest,
  })
}

/** Sends both language versions to the signed-in staff member's own address. */
export async function sendTestIssue(actor: Actor, issueId: string, mailer: NewsletterMailer = defaultMailer): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:manage')
  if (denied) return denied
  const issue = await db.newsletterIssue.findUnique({ where: { id: issueId } })
  if (!issue) return { ok: false, code: 'not_found', error: 'Issue not found.' }

  const outcomes: EmailResult[] = []
  for (const locale of ['en', 'it'] as const) {
    // Staff are not subscribers: the test copy links to the public newsletter page instead.
    const email = issueEmailFor(issue, locale, `${getSiteUrl()}${newsletterPath(locale, '/newsletter')}`, true)
    outcomes.push(await mailer({ to: actor.email, subject: email.subject, text: email.text, html: email.html }))
  }
  await audit({ actorId: actor.id, action: 'newsletter.issue.test_send', entityType: 'NewsletterIssue', entityId: issueId, metadata: { outcomes: outcomes.map((o) => o.status) } })
  if (outcomes.some((o) => o.status === 'NOT_CONFIGURED')) return { ok: false, code: 'not_configured', error: EMAIL_NOT_CONFIGURED_MESSAGE }
  const failure = outcomes.find((o): o is Extract<EmailResult, { status: 'FAILED' }> => o.status === 'FAILED')
  if (failure) return { ok: false, error: `The test email could not be sent: ${failure.error}` }
  return { ok: true, message: `Test emails (English and Italian) sent to ${actor.email}.` }
}

export async function confirmedAudience(): Promise<{ total: number; en: number; it: number }> {
  const groups = await db.newsletterSubscriber.groupBy({ by: ['locale'], where: { status: 'CONFIRMED' }, _count: { _all: true } })
  const it = groups.filter((g) => g.locale === 'it').reduce((sum, g) => sum + g._count._all, 0)
  const total = groups.reduce((sum, g) => sum + g._count._all, 0)
  return { total, en: total - it, it }
}

/** A SENDING issue whose sender stopped (crash, timeout) can be resumed after this long. */
export const STALE_SENDING_MS = 15 * 60 * 1000

export type SendOptions = { transport?: NewsletterTransport; batchSize?: number; pauseMs?: number; now?: () => Date }

/**
 * Sends an issue to every CONFIRMED subscriber, each in their own language.
 *
 * Idempotent and resumable: a NewsletterDelivery row is created per (issue, subscriber) before
 * sending, and only PENDING/FAILED rows are ever sent, so a retry never emails anyone twice.
 * Each batch carries an idempotency key derived from its delivery ids, so even a batch whose
 * outcome was lost is deduplicated by Resend when retried.
 */
export async function sendIssue(actor: Actor, issueId: string, options: SendOptions = {}): Promise<ServiceResult> {
  const denied = deny(actor, 'newsletter:send')
  if (denied) return denied
  const transport = options.transport ?? defaultTransport()
  if (!transport.configured) return { ok: false, code: 'not_configured', error: `Sending is disabled. ${EMAIL_NOT_CONFIGURED_MESSAGE}` }
  const batchSize = Math.min(Math.max(1, options.batchSize ?? 50), MAX_BATCH_SIZE)
  const pauseMs = options.pauseMs ?? 600
  const now = options.now ?? (() => new Date())

  const issue = await db.newsletterIssue.findUnique({ where: { id: issueId } })
  if (!issue) return { ok: false, code: 'not_found', error: 'Issue not found.' }
  if (issue.status === 'SENT') return { ok: false, code: 'invalid', error: 'This issue has already been sent.' }

  const audience = await confirmedAudience()
  const outstanding = await db.newsletterDelivery.count({ where: { issueId, status: { in: ['PENDING', 'FAILED'] } } })
  if (audience.total === 0 && outstanding === 0) return { ok: false, code: 'invalid', error: 'There are no confirmed subscribers to send to.' }

  // Claim the issue so two administrators (or a double click) cannot send it concurrently.
  const claimed = await db.newsletterIssue.updateMany({
    where: {
      id: issueId,
      OR: [{ status: { in: ['DRAFT', 'FAILED'] } }, { status: 'SENDING', updatedAt: { lt: new Date(now().getTime() - STALE_SENDING_MS) } }],
    },
    data: { status: 'SENDING', sentById: actor.id },
  })
  if (!claimed.count) return { ok: false, code: 'invalid', error: 'This issue is already being sent. Refresh the page in a few minutes.' }
  await audit({ actorId: actor.id, action: 'newsletter.issue.send_started', entityType: 'NewsletterIssue', entityId: issueId, metadata: { confirmed: audience.total } })

  // Snapshot the audience. Existing rows (from an earlier attempt) are kept as they are.
  const confirmed = await db.newsletterSubscriber.findMany({ where: { status: 'CONFIRMED' }, select: { id: true, locale: true } })
  await db.newsletterDelivery.createMany({
    data: confirmed.map((s) => ({ issueId, subscriberId: s.id, locale: emailLocale(s.locale) })),
    skipDuplicates: true,
  })

  const todo = await db.newsletterDelivery.findMany({
    where: { issueId, status: { in: ['PENDING', 'FAILED'] } },
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  let aborted: string | null = null

  for (let start = 0; start < todo.length; start += batchSize) {
    const ids = todo.slice(start, start + batchSize).map((d) => d.id)
    const deliveries = await db.newsletterDelivery.findMany({
      where: { id: { in: ids }, status: { in: ['PENDING', 'FAILED'] } },
      include: { subscriber: { select: { email: true, status: true, unsubscribeToken: true } } },
      orderBy: { id: 'asc' },
    })
    // Someone who unsubscribed after the snapshot must not receive the issue.
    const skipped = deliveries.filter((d) => d.subscriber.status !== 'CONFIRMED')
    if (skipped.length) {
      await db.newsletterDelivery.updateMany({ where: { id: { in: skipped.map((d) => d.id) } }, data: { status: 'SKIPPED', error: null } })
    }
    const sendable = deliveries.filter((d) => d.subscriber.status === 'CONFIRMED')
    if (sendable.length === 0) continue

    const messages: OutgoingEmail[] = sendable.map((d) => {
      const locale = emailLocale(d.locale)
      const email = issueEmailFor(issue, locale, unsubscribePageUrl(locale, d.subscriber.unsubscribeToken))
      return { to: d.subscriber.email, subject: email.subject, text: email.text, html: email.html, headers: listUnsubscribeHeaders(d.subscriber.unsubscribeToken) }
    })
    const key = `newsletter-${issueId}-${createHash('sha256').update(sendable.map((d) => d.id).join(',')).digest('hex').slice(0, 32)}`
    const result = await transport.sendBatch(messages, key)

    if (result.status === 'SENT') {
      const sentAt = now()
      await db.$transaction(
        sendable.map((d, i) =>
          db.newsletterDelivery.update({ where: { id: d.id }, data: { status: 'SENT', sentAt, error: null, providerId: result.ids[i] ?? null } }),
        ),
      )
    } else {
      const error = result.status === 'FAILED' ? result.error : 'Email is not configured.'
      await db.newsletterDelivery.updateMany({ where: { id: { in: sendable.map((d) => d.id) } }, data: { status: 'FAILED', error } })
      if (result.status === 'NOT_CONFIGURED') {
        aborted = EMAIL_NOT_CONFIGURED_MESSAGE
        break
      }
    }
    // Keeps the SENDING claim fresh, and stays under the provider's request-rate limit.
    await db.newsletterIssue.update({ where: { id: issueId }, data: { status: 'SENDING' } })
    if (pauseMs > 0 && start + batchSize < todo.length) await new Promise((resolve) => setTimeout(resolve, pauseMs))
  }

  const counts = await db.newsletterDelivery.groupBy({ by: ['status'], where: { issueId }, _count: { _all: true } })
  const countOf = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0
  const sentCount = countOf('SENT')
  const failedCount = countOf('FAILED') + countOf('PENDING')
  const recipientCount = sentCount + failedCount
  const status = failedCount > 0 ? 'FAILED' : 'SENT'
  await db.newsletterIssue.update({
    where: { id: issueId },
    data: { status, sentCount, failedCount, recipientCount, sentAt: sentCount > 0 ? (issue.sentAt ?? now()) : issue.sentAt },
  })
  await audit({ actorId: actor.id, action: 'newsletter.issue.send', entityType: 'NewsletterIssue', entityId: issueId, metadata: { status, recipientCount, sentCount, failedCount } })

  if (aborted) return { ok: false, code: 'not_configured', error: aborted }
  if (status === 'FAILED') {
    return { ok: false, error: `Sent to ${sentCount} of ${recipientCount} subscribers; ${failedCount} failed. Press send again to retry only the failed ones — nobody receives the issue twice.` }
  }
  return { ok: true, message: `Sent to ${sentCount} subscriber${sentCount === 1 ? '' : 's'}.` }
}
