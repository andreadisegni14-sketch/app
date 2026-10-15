import { NextResponse } from 'next/server'
import { getStripeConfig } from '@/lib/env'
import { processStripeEvent } from '@/lib/server/donations'
import { constructWebhookEvent } from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook endpoint. Verifies the signature against the raw body, then applies the event
 * idempotently to the donation ledger. Returns 2xx only once the event is durably recorded.
 */
export async function POST(request: Request) {
  const { webhookSecret } = getStripeConfig()
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const payload = await request.text()
  let event
  try {
    event = constructWebhookEvent(payload, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const outcome = await processStripeEvent(event)
    return NextResponse.json({ received: true, outcome })
  } catch (error) {
    console.error('[stripe] webhook processing failed', event.id, error)
    // 500 makes Stripe retry later; nothing was committed thanks to the transaction.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
