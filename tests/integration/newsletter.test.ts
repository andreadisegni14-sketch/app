import { describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/newsletter/tokens'
import {
  adminUnsubscribe,
  checkConfirmToken,
  confirmSubscription,
  eraseSubscriber,
  getUnsubscribeState,
  resendConfirmation,
  resendUnsentConfirmations,
  saveIssue,
  sendIssue,
  sendTestIssue,
  subscribeToNewsletter,
  unsubscribeByToken,
  type NewsletterTransport,
  type OutgoingEmail,
} from '@/lib/server/newsletter'
import { createUser } from './factories'

const ctx = { ipHash: 'newsletter-test-ip' }
const CHECK_INBOX = { status: 'success', message: 'newsletterCheckInbox' }

/** Captures outgoing mail and extracts the confirmation token from the link. */
function captureMailer() {
  const sent: OutgoingEmail[] = []
  const mailer = vi.fn(async (message: OutgoingEmail) => {
    sent.push(message)
    return { status: 'SENT' as const, id: `em_${sent.length}` }
  })
  const lastToken = () => /token=([A-Za-z0-9_-]+)/.exec(sent.at(-1)?.text ?? '')?.[1] ?? ''
  return { sent, mailer, lastToken }
}

function fakeTransport(fail: (message: OutgoingEmail) => boolean = () => false) {
  const batches: { messages: OutgoingEmail[]; key: string }[] = []
  const transport: NewsletterTransport = {
    configured: true,
    sendBatch: vi.fn(async (messages: OutgoingEmail[], key: string) => {
      batches.push({ messages, key })
      if (messages.some(fail)) return { status: 'FAILED' as const, error: 'HTTP 500: simulated' }
      return { status: 'SENT' as const, ids: messages.map((_, i) => `prov_${batches.length}_${i}`) }
    }),
  }
  return { transport, batches, recipients: () => batches.flatMap((b) => b.messages.map((m) => m.to)) }
}

/** A signed-in staff member as the admin actions see them (id, email and role). */
async function staff(role: 'ADMIN' | 'EDITOR' | 'VIEWER') {
  const { user } = await createUser(role)
  return { user: { id: user.id, email: user.email, role } }
}

async function subscribe(email: string, locale = 'en', mailer = captureMailer().mailer) {
  return subscribeToNewsletter({ email, consent: true, locale, source: 'footer' }, { ipHash: `ip-${email}` }, mailer)
}

async function subscribeAndConfirm(email: string, locale = 'en') {
  const m = captureMailer()
  await subscribe(email, locale, m.mailer)
  expect(await confirmSubscription(m.lastToken())).toBe('confirmed')
}

async function draftIssue(actorId: string) {
  return db.newsletterIssue.create({
    data: { subjectEn: 'Autumn news', subjectIt: 'Notizie d’autunno', bodyEn: 'Hello **all**', bodyIt: 'Ciao **a tutti**', createdById: actorId },
  })
}

describe('newsletter subscription (double opt-in)', () => {
  it('stores a PENDING subscriber with only a hash of the token and the consent wording', async () => {
    const m = captureMailer()
    const result = await subscribeToNewsletter({ email: ' Giulia@Example.IT ', consent: true, locale: 'it', source: 'newsletter-page' }, ctx, m.mailer)
    expect(result).toEqual(CHECK_INBOX)

    const row = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: 'giulia@example.it' } })
    const token = m.lastToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(row).toMatchObject({ status: 'PENDING', locale: 'it', source: 'newsletter-page', confirmEmailStatus: 'SENT', confirmedAt: null })
    expect(row.confirmTokenHash).toBe(hashToken(token))
    expect(JSON.stringify(row)).not.toContain(token)
    expect(row.consentText).toContain('Desidero ricevere la newsletter')
    expect(row.consentText).not.toContain('<privacy>')
    expect(row.confirmTokenExpiresAt!.getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000)
    expect(row.unsubscribeToken).toMatch(/^[A-Za-z0-9_-]{43}$/)

    // The confirmation email is in the subscriber's language and links to the localized page.
    expect(m.sent[0]).toMatchObject({ to: 'giulia@example.it' })
    expect(m.sent[0]!.subject).toMatch(/Conferma/)
    expect(m.sent[0]!.html).toContain(`/it/newsletter/confirm?token=${token}`)
  })

  it('keeps the subscriber and records NOT_CONFIGURED when email is not set up', async () => {
    expect(await subscribeToNewsletter({ email: 'later@example.org', consent: true, locale: 'en' }, ctx)).toEqual(CHECK_INBOX)
    const row = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: 'later@example.org' } })
    expect(row).toMatchObject({ status: 'PENDING', confirmEmailStatus: 'NOT_CONFIGURED', source: 'footer' })
  })

  it('validates input, requires consent and discards honeypot submissions', async () => {
    expect(await subscribeToNewsletter({ email: 'nope', consent: false }, ctx)).toEqual({
      status: 'error',
      message: 'fixErrors',
      fieldErrors: { email: 'email', consent: 'consentRequired' },
    })
    expect(await subscribeToNewsletter({ email: 'bot@example.org', consent: true, company_website: 'x' }, ctx)).toEqual(CHECK_INBOX)
    expect(await db.newsletterSubscriber.count()).toBe(0)
  })

  it('confirms with the token, clears it, and rejects reuse', async () => {
    const m = captureMailer()
    await subscribe('anna@example.org', 'en', m.mailer)
    const token = m.lastToken()
    expect(await checkConfirmToken(token)).toBe('valid')
    // Looking at the confirmation page changes nothing.
    expect((await db.newsletterSubscriber.findFirstOrThrow()).status).toBe('PENDING')

    expect(await confirmSubscription(token)).toBe('confirmed')
    const row = await db.newsletterSubscriber.findFirstOrThrow()
    expect(row).toMatchObject({ status: 'CONFIRMED', confirmTokenHash: null, confirmTokenExpiresAt: null })
    expect(row.confirmedAt).not.toBeNull()
    expect(await confirmSubscription(token)).toBe('invalid')
  })

  it('rejects expired and invalid tokens', async () => {
    const m = captureMailer()
    await subscribe('slow@example.org', 'en', m.mailer)
    const eightDaysLater = new Date(Date.now() + 8 * 24 * 3600 * 1000)
    expect(await confirmSubscription(m.lastToken(), eightDaysLater)).toBe('expired')
    expect(await confirmSubscription('A'.repeat(43))).toBe('invalid')
    expect(await confirmSubscription('not a token')).toBe('invalid')
    expect(await confirmSubscription(undefined)).toBe('invalid')
    expect((await db.newsletterSubscriber.findFirstOrThrow()).status).toBe('PENDING')
  })

  it('re-subscribing never creates duplicates and always gives the same neutral answer', async () => {
    const m = captureMailer()
    expect(await subscribe('repeat@example.org', 'en', m.mailer)).toEqual(CHECK_INBOX)
    const firstToken = m.lastToken()
    // Pending again: a fresh link replaces the old one.
    expect(await subscribe('REPEAT@example.org', 'it', m.mailer)).toEqual(CHECK_INBOX)
    expect(await db.newsletterSubscriber.count()).toBe(1)
    expect(await confirmSubscription(firstToken)).toBe('invalid')
    expect(await confirmSubscription(m.lastToken())).toBe('confirmed')

    // Confirmed: same answer, nothing sent, nothing changed.
    const before = await db.newsletterSubscriber.findFirstOrThrow()
    const mailsBefore = m.sent.length
    expect(await subscribe('repeat@example.org', 'en', m.mailer)).toEqual(CHECK_INBOX)
    expect(m.sent.length).toBe(mailsBefore)
    expect(await db.newsletterSubscriber.findFirstOrThrow()).toEqual(before)

    // Unsubscribed: back to PENDING with a new double opt-in (after the per-address window).
    await unsubscribeByToken(before.unsubscribeToken)
    await db.rateLimit.deleteMany()
    expect(await subscribe('repeat@example.org', 'en', m.mailer)).toEqual(CHECK_INBOX)
    const after = await db.newsletterSubscriber.findFirstOrThrow()
    expect(after).toMatchObject({ status: 'PENDING', confirmedAt: null, unsubscribedAt: null, unsubscribeToken: before.unsubscribeToken })
    expect(await db.newsletterSubscriber.count()).toBe(1)
  })

  it('limits confirmation emails per address without revealing it', async () => {
    const m = captureMailer()
    for (let i = 0; i < 5; i++) {
      expect(await subscribeToNewsletter({ email: 'victim@example.org', consent: true }, { ipHash: `rotating-ip-${i}` }, m.mailer)).toEqual(CHECK_INBOX)
    }
    expect(m.sent).toHaveLength(3)
  })

  it('unsubscribes by token (idempotently) and GET-style lookups change nothing', async () => {
    await subscribeAndConfirm('leaver@example.org')
    const { unsubscribeToken } = await db.newsletterSubscriber.findFirstOrThrow()
    expect(await getUnsubscribeState(unsubscribeToken)).toEqual({ state: 'subscribed', maskedEmail: 'l•••@example.org' })
    expect((await db.newsletterSubscriber.findFirstOrThrow()).status).toBe('CONFIRMED')

    expect(await unsubscribeByToken(unsubscribeToken)).toBe('unsubscribed')
    const row = await db.newsletterSubscriber.findFirstOrThrow()
    expect(row.status).toBe('UNSUBSCRIBED')
    expect(row.unsubscribedAt).not.toBeNull()
    expect(await unsubscribeByToken(unsubscribeToken)).toBe('unsubscribed')
    expect(await getUnsubscribeState(unsubscribeToken)).toEqual({ state: 'unsubscribed' })
    expect(await unsubscribeByToken('B'.repeat(43))).toBe('invalid')
  })
})

describe('sending an issue', () => {
  it('sends each confirmed subscriber the issue in their language, with unsubscribe headers', async () => {
    const { user } = await staff('ADMIN')
    await subscribeAndConfirm('en1@example.org', 'en')
    await subscribeAndConfirm('it1@example.org', 'it')
    await subscribe('pending@example.org', 'en')
    await subscribeAndConfirm('gone@example.org', 'en')
    await unsubscribeByToken((await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: 'gone@example.org' } })).unsubscribeToken)
    const issue = await draftIssue(user.id)

    const fake = fakeTransport()
    const result = await sendIssue(user, issue.id, { transport: fake.transport, pauseMs: 0 })
    expect(result).toEqual({ ok: true, message: 'Sent to 2 subscribers.' })
    expect(fake.recipients().sort()).toEqual(['en1@example.org', 'it1@example.org'])

    const messages = fake.batches.flatMap((b) => b.messages)
    const en = messages.find((m) => m.to === 'en1@example.org')!
    const it_ = messages.find((m) => m.to === 'it1@example.org')!
    expect(en.subject).toBe('Autumn news')
    expect(en.html).toContain('<strong>all</strong>')
    expect(it_.subject).toBe('Notizie d’autunno')
    expect(it_.html).toContain('<html lang="it">')
    const itSub = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: 'it1@example.org' } })
    expect(it_.html).toContain(`/it/newsletter/unsubscribe?token=${itSub.unsubscribeToken}`)
    expect(it_.headers).toEqual({
      'List-Unsubscribe': `<http://localhost:3000/api/newsletter/unsubscribe?token=${itSub.unsubscribeToken}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })

    const deliveries = await db.newsletterDelivery.findMany({ where: { issueId: issue.id }, include: { subscriber: true } })
    expect(deliveries.map((d) => [d.subscriber.email, d.locale, d.status]).sort()).toEqual([
      ['en1@example.org', 'en', 'SENT'],
      ['it1@example.org', 'it', 'SENT'],
    ])
    expect(deliveries.every((d) => d.providerId && d.sentAt)).toBe(true)
    expect(await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })).toMatchObject({ status: 'SENT', recipientCount: 2, sentCount: 2, failedCount: 0, sentById: user.id })
    expect(await db.auditLog.count({ where: { action: 'newsletter.issue.send', entityId: issue.id } })).toBe(1)

    // Sent issues are final: no second send, no edits.
    expect(await sendIssue(user, issue.id, { transport: fake.transport, pauseMs: 0 })).toMatchObject({ ok: false, error: 'This issue has already been sent.' })
    expect(await saveIssue(user, { subjectEn: 'x', subjectIt: 'x', bodyEn: 'x', bodyIt: 'x' }, issue.id)).toMatchObject({ ok: false })
    expect(fake.recipients()).toHaveLength(2)
  })

  it('is idempotent: a retry after a partial failure only sends to those who did not receive it', async () => {
    const { user } = await staff('ADMIN')
    for (const n of [1, 2, 3, 4, 5]) await subscribeAndConfirm(`r${n}@example.org`)
    const issue = await draftIssue(user.id)

    // Batches of 2; the batch containing r3 fails.
    const flaky = fakeTransport((m) => m.to === 'r3@example.org')
    const first = await sendIssue(user, issue.id, { transport: flaky.transport, batchSize: 2, pauseMs: 0 })
    expect(first.ok).toBe(false)
    const afterFirst = await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })
    expect(afterFirst).toMatchObject({ status: 'FAILED', sentCount: 3, failedCount: 2, recipientCount: 5 })

    // Someone who joins in between also receives it on the retry; nobody gets it twice.
    await subscribeAndConfirm('late@example.org')
    const healthy = fakeTransport()
    expect(await sendIssue(user, issue.id, { transport: healthy.transport, batchSize: 2, pauseMs: 0 })).toMatchObject({ ok: true })
    const delivered = [...flaky.batches.filter((b) => !b.messages.some((m) => m.to === 'r3@example.org')).flatMap((b) => b.messages.map((m) => m.to)), ...healthy.recipients()]
    expect(delivered.sort()).toEqual(['late@example.org', 'r1@example.org', 'r2@example.org', 'r3@example.org', 'r4@example.org', 'r5@example.org'])
    expect(new Set(delivered).size).toBe(delivered.length)
    expect(await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })).toMatchObject({ status: 'SENT', sentCount: 6, failedCount: 0 })

    // The retried batch reuses the same idempotency key, so the provider can deduplicate it too.
    const failedKey = flaky.batches.find((b) => b.messages.some((m) => m.to === 'r3@example.org'))!.key
    expect(healthy.batches.map((b) => b.key)).toContain(failedKey)
  })

  it('skips subscribers who unsubscribed after the audience snapshot', async () => {
    const { user } = await staff('ADMIN')
    await subscribeAndConfirm('a@example.org')
    await subscribeAndConfirm('b@example.org')
    const issue = await draftIssue(user.id)
    const failing = fakeTransport(() => true)
    await sendIssue(user, issue.id, { transport: failing.transport, pauseMs: 0 })
    await unsubscribeByToken((await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: 'b@example.org' } })).unsubscribeToken)

    const healthy = fakeTransport()
    await sendIssue(user, issue.id, { transport: healthy.transport, pauseMs: 0 })
    expect(healthy.recipients()).toEqual(['a@example.org'])
    const skipped = await db.newsletterDelivery.findFirstOrThrow({ where: { subscriber: { email: 'b@example.org' } } })
    expect(skipped.status).toBe('SKIPPED')
    expect(await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })).toMatchObject({ status: 'SENT', recipientCount: 1, sentCount: 1 })
  })

  it('refuses to send when email is not configured, or when there is nobody to send to', async () => {
    const { user } = await staff('ADMIN')
    const issue = await draftIssue(user.id)
    const off: NewsletterTransport = { configured: false, sendBatch: vi.fn() }
    expect(await sendIssue(user, issue.id, { transport: off })).toMatchObject({ ok: false, code: 'not_configured' })
    expect(await sendIssue(user, issue.id, { transport: fakeTransport().transport })).toMatchObject({ ok: false, error: 'There are no confirmed subscribers to send to.' })
    expect((await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })).status).toBe('DRAFT')
    expect(off.sendBatch).not.toHaveBeenCalled()
  })

  it('does not let two sends run at once', async () => {
    const { user } = await staff('ADMIN')
    await subscribeAndConfirm('x@example.org')
    const issue = await draftIssue(user.id)
    await db.newsletterIssue.update({ where: { id: issue.id }, data: { status: 'SENDING' } })
    const fake = fakeTransport()
    expect(await sendIssue(user, issue.id, { transport: fake.transport, pauseMs: 0 })).toMatchObject({ ok: false })
    expect(fake.recipients()).toEqual([])
  })

  it('sends a test of both languages to the staff member only', async () => {
    const { user } = await staff('EDITOR')
    await subscribeAndConfirm('subscriber@example.org')
    const issue = await draftIssue(user.id)
    const m = captureMailer()
    expect(await sendTestIssue(user, issue.id, m.mailer)).toMatchObject({ ok: true })
    expect(m.sent.map((s) => [s.to, s.subject])).toEqual([
      ['editor@example.test', '[TEST] Autumn news'],
      ['editor@example.test', '[TEST] Notizie d’autunno'],
    ])
    expect(await db.newsletterDelivery.count()).toBe(0)
  })
})

describe('newsletter permissions and admin actions', () => {
  it('lets only administrators send', async () => {
    const { user: admin } = await staff('ADMIN')
    const { user: editor } = await staff('EDITOR')
    const { user: viewer } = await staff('VIEWER')
    await subscribeAndConfirm('reader@example.org')
    const issue = await draftIssue(admin.id)
    const fake = fakeTransport()
    for (const actor of [viewer, editor]) {
      expect(await sendIssue(actor, issue.id, { transport: fake.transport })).toMatchObject({ ok: false, code: 'forbidden' })
    }
    expect(fake.transport.sendBatch).not.toHaveBeenCalled()
    expect((await db.newsletterIssue.findUniqueOrThrow({ where: { id: issue.id } })).status).toBe('DRAFT')
  })

  it('lets only administrators erase; editors can unsubscribe; viewers can do neither', async () => {
    const { user: admin } = await staff('ADMIN')
    const { user: editor } = await staff('EDITOR')
    const { user: viewer } = await staff('VIEWER')
    await subscribeAndConfirm('person@example.org')
    const sub = await db.newsletterSubscriber.findFirstOrThrow()

    expect(await eraseSubscriber(editor, sub.id)).toMatchObject({ ok: false, code: 'forbidden' })
    expect(await eraseSubscriber(viewer, sub.id)).toMatchObject({ ok: false, code: 'forbidden' })
    expect(await adminUnsubscribe(viewer, sub.id)).toMatchObject({ ok: false, code: 'forbidden' })
    expect(await saveIssue(viewer, { subjectEn: 'a', subjectIt: 'a', bodyEn: 'a', bodyIt: 'a' })).toMatchObject({ ok: false, code: 'forbidden' })
    expect(await db.newsletterSubscriber.count()).toBe(1)

    expect(await adminUnsubscribe(editor, sub.id)).toMatchObject({ ok: true })
    expect((await db.newsletterSubscriber.findFirstOrThrow()).status).toBe('UNSUBSCRIBED')
    expect(await eraseSubscriber(admin, sub.id)).toMatchObject({ ok: true })
    expect(await db.newsletterSubscriber.count()).toBe(0)

    const audit = await db.auditLog.findMany({ where: { entityType: 'NewsletterSubscriber' }, orderBy: { createdAt: 'asc' } })
    expect(audit.map((a) => a.action)).toEqual(['newsletter.subscriber.unsubscribe', 'newsletter.subscriber.erase'])
    expect(JSON.stringify(audit)).not.toContain('person@example.org')
  })

  it('resends confirmations that could not be sent before email was configured', async () => {
    const { user: editor } = await staff('EDITOR')
    await subscribe('one@example.org', 'en', vi.fn().mockResolvedValue({ status: 'NOT_CONFIGURED' }))
    await subscribe('two@example.org', 'it', vi.fn().mockResolvedValue({ status: 'NOT_CONFIGURED' }))
    const m = captureMailer()
    expect(await resendUnsentConfirmations(editor, m.mailer)).toEqual({ ok: true, message: '2 confirmation email(s) sent.' })
    expect(m.sent.map((s) => s.to).sort()).toEqual(['one@example.org', 'two@example.org'])
    expect(await db.newsletterSubscriber.count({ where: { confirmEmailStatus: 'SENT' } })).toBe(2)
    // The links in the resent emails work.
    expect(await confirmSubscription(/token=([A-Za-z0-9_-]+)/.exec(m.sent[0]!.text)![1])).toBe('confirmed')

    const pending = await db.newsletterSubscriber.findFirstOrThrow({ where: { status: 'PENDING' } })
    expect(await resendConfirmation(editor, pending.id, m.mailer)).toMatchObject({ ok: true })
    const confirmed = await db.newsletterSubscriber.findFirstOrThrow({ where: { status: 'CONFIRMED' } })
    expect(await resendConfirmation(editor, confirmed.id, m.mailer)).toMatchObject({ ok: false })
    expect(await db.auditLog.count({ where: { action: { startsWith: 'newsletter.confirmation' } } })).toBe(2)
  })
})
