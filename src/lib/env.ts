import 'server-only'
import { createHash } from 'node:crypto'
import { databaseUrl, siteUrl } from '@/lib/runtime-config'

/**
 * Server-side configuration and feature flags.
 *
 * All flags default to the SAFE state. Donations in particular require three independent,
 * explicit confirmations before any payment flow is shown (see `donationsMode`).
 */

function bool(value: string | undefined): boolean {
  return value === 'true' || value === '1'
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export type PaymentsMode = 'stripe' | 'mock'

export type DonationsMode =
  | { enabled: false; reason: 'flag_off' | 'compliance_unconfirmed' | 'payments_unconfigured' }
  | { enabled: true; provider: PaymentsMode }

export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production' || bool(process.env.RENDER) || bool(process.env.PRODUCTION_DEPLOYMENT)
}

export function getPaymentsMode(): PaymentsMode | null {
  const mode = nonEmpty(process.env.PAYMENTS_MODE) ?? 'stripe'
  if (mode === 'mock') {
    // The mock provider exists for automated tests and local demos only.
    if (isProductionDeployment() || !bool(process.env.ALLOW_MOCK_PAYMENTS)) return null
    return 'mock'
  }
  if (nonEmpty(process.env.STRIPE_SECRET_KEY) && nonEmpty(process.env.STRIPE_WEBHOOK_SECRET)) {
    return 'stripe'
  }
  return null
}

/**
 * Donations are enabled only when:
 *  1. FEATURE_DONATIONS_ENABLED=true, and
 *  2. DONATIONS_COMPLIANCE_CONFIRMED=true — an operator affirms that the entity is incorporated,
 *     the payment provider has verified it, and donation terms have been legally approved, and
 *  3. a payment provider is fully configured (Stripe keys + webhook secret).
 */
export function getDonationsMode(): DonationsMode {
  if (!bool(process.env.FEATURE_DONATIONS_ENABLED)) return { enabled: false, reason: 'flag_off' }
  if (!bool(process.env.DONATIONS_COMPLIANCE_CONFIRMED)) {
    return { enabled: false, reason: 'compliance_unconfirmed' }
  }
  const provider = getPaymentsMode()
  if (!provider) return { enabled: false, reason: 'payments_unconfigured' }
  return { enabled: true, provider }
}

export function getSiteUrl(): string {
  return siteUrl()
}

export function getEmailConfig() {
  return {
    apiKey: nonEmpty(process.env.RESEND_API_KEY),
    from: nonEmpty(process.env.EMAIL_FROM),
    notificationTo: nonEmpty(process.env.NOTIFICATION_EMAIL),
  }
}

export function isEmailConfigured(): boolean {
  const config = getEmailConfig()
  return Boolean(config.apiKey && config.from)
}

/** Postal/contact line shown in every newsletter footer (NEWSLETTER_SENDER_ADDRESS). */
export function getNewsletterSenderAddress(): string | undefined {
  return nonEmpty(process.env.NEWSLETTER_SENDER_ADDRESS)
}

export function getStripeConfig() {
  return {
    secretKey: nonEmpty(process.env.STRIPE_SECRET_KEY),
    webhookSecret: nonEmpty(process.env.STRIPE_WEBHOOK_SECRET),
  }
}

let warnedAboutSalt = false

export function getHashSalt(): string {
  const salt = nonEmpty(process.env.RATE_LIMIT_SALT)
  if (salt) return salt
  // Without an explicit salt, derive a stable secret from the database credentials, which are
  // private and already present in every deployment.
  const db = databaseUrl()
  if (db) return createHash('sha256').update(`blf-rate-limit:${db}`).digest('hex')
  if (isProductionDeployment() && !warnedAboutSalt) {
    warnedAboutSalt = true
    console.warn('[config] RATE_LIMIT_SALT is not set; using an insecure default. Set it in production.')
  }
  return 'blf-insecure-default-salt'
}
