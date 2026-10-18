import 'server-only'
import { getEmailConfig } from '@/lib/env'

export type EmailResult =
  | { status: 'SENT'; id?: string }
  | { status: 'NOT_CONFIGURED' }
  | { status: 'FAILED'; error: string }

export type EmailMessage = {
  subject: string
  text: string
  html?: string
  replyTo?: string
  to?: string
  /** Extra headers, e.g. List-Unsubscribe. */
  headers?: Record<string, string>
}

const RESEND_API = 'https://api.resend.com'

function resendPayload(message: EmailMessage, from: string, to: string) {
  return {
    from,
    to: [to],
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    ...(message.headers ? { headers: message.headers } : {}),
  }
}

/**
 * Sends a transactional email through Resend's HTTP API when configured.
 * Never throws: callers persist data first and record the delivery outcome afterwards.
 */
export async function sendEmail(message: EmailMessage, fetchImpl: typeof fetch = fetch): Promise<EmailResult> {
  const config = getEmailConfig()
  const to = message.to ?? config.notificationTo
  if (!config.apiKey || !config.from || !to) return { status: 'NOT_CONFIGURED' }

  try {
    const response = await fetchImpl(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resendPayload(message, config.from, to)),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { status: 'FAILED', error: `HTTP ${response.status}: ${body.slice(0, 300)}` }
    }
    const data = (await response.json().catch(() => ({}))) as { id?: string }
    return { status: 'SENT', id: data.id }
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 300) : 'Unknown error' }
  }
}

export function emailOutcome(result: EmailResult): { emailStatus: 'SENT' | 'FAILED' | 'NOT_CONFIGURED'; emailError: string | null } {
  return {
    emailStatus: result.status,
    emailError: result.status === 'FAILED' ? result.error : null,
  }
}

export type BatchEmailResult =
  | { status: 'SENT'; ids: (string | undefined)[] }
  | { status: 'NOT_CONFIGURED' }
  | { status: 'FAILED'; error: string }

/** Resend accepts at most 100 messages per batch call. */
export const MAX_BATCH_SIZE = 100

/**
 * Sends up to 100 messages in one call to Resend's batch endpoint. Every message needs an explicit
 * `to`. The idempotency key makes a retried batch (same key, same content) a no-op on Resend's side
 * for 24 hours. Never throws.
 */
export async function sendEmailBatch(
  messages: (EmailMessage & { to: string })[],
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BatchEmailResult> {
  const config = getEmailConfig()
  if (!config.apiKey || !config.from) return { status: 'NOT_CONFIGURED' }
  if (messages.length === 0) return { status: 'SENT', ids: [] }
  if (messages.length > MAX_BATCH_SIZE) return { status: 'FAILED', error: `Batch too large (${messages.length})` }
  const from = config.from

  try {
    const response = await fetchImpl(`${RESEND_API}/emails/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(messages.map((m) => resendPayload(m, from, m.to))),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { status: 'FAILED', error: `HTTP ${response.status}: ${body.slice(0, 300)}` }
    }
    const data = (await response.json().catch(() => ({}))) as { data?: { id?: string }[] }
    return { status: 'SENT', ids: messages.map((_, i) => data.data?.[i]?.id) }
  } catch (error) {
    return { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 300) : 'Unknown error' }
  }
}
