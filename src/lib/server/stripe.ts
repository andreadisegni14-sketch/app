import 'server-only'
import Stripe from 'stripe'
import { getStripeConfig } from '@/lib/env'

let client: Stripe | null = null

/** Returns a configured Stripe client, or null when keys are absent (the safe default). */
export function getStripe(): Stripe | null {
  const { secretKey } = getStripeConfig()
  if (!secretKey) return null
  if (!client) {
    client = new Stripe(secretKey, {
      appInfo: { name: 'blue-legacy-foundation', version: '0.1.0' },
      maxNetworkRetries: 2,
      timeout: 15_000,
    })
  }
  return client
}

/**
 * Verifies a webhook signature. Uses a key-less client when needed: signature verification is
 * purely local and requires only the webhook signing secret.
 */
export function constructWebhookEvent(payload: string, signature: string, secret: string): Stripe.Event {
  const verifier = getStripe() ?? new Stripe('sk_verify_only_no_network')
  return verifier.webhooks.constructEvent(payload, signature, secret)
}
