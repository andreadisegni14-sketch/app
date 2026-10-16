import 'server-only'
import { getEmailConfig } from '@/lib/env'

export type EmailResult =
  | { status: 'SENT'; id?: string }
  | { status: 'NOT_CONFIGURED' }
  | { status: 'FAILED'; error: string }

export type EmailMessage = { subject: string; text: string; replyTo?: string; to?: string }

/**
 * Sends a transactional email through Resend's HTTP API when configured.
 * Never throws: callers persist data first and record the delivery outcome afterwards.
 */
export async function sendEmail(message: EmailMessage, fetchImpl: typeof fetch = fetch): Promise<EmailResult> {
  const config = getEmailConfig()
  const to = message.to ?? config.notificationTo
  if (!config.apiKey || !config.from || !to) return { status: 'NOT_CONFIGURED' }

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
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
