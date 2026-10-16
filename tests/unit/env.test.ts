import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDonationsMode } from '@/lib/env'

afterEach(() => vi.unstubAllEnvs())

function stub(env: Record<string, string>) {
  for (const key of ['FEATURE_DONATIONS_ENABLED', 'DONATIONS_COMPLIANCE_CONFIRMED', 'PAYMENTS_MODE', 'ALLOW_MOCK_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VERCEL_ENV', 'PRODUCTION_DEPLOYMENT']) {
    vi.stubEnv(key, env[key] ?? '')
  }
}

describe('donation feature flags', () => {
  it('are disabled by default', () => {
    stub({})
    expect(getDonationsMode()).toEqual({ enabled: false, reason: 'flag_off' })
  })

  it('require compliance confirmation in addition to the feature flag', () => {
    stub({ FEATURE_DONATIONS_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' })
    expect(getDonationsMode()).toEqual({ enabled: false, reason: 'compliance_unconfirmed' })
  })

  it('require a complete payment configuration', () => {
    stub({ FEATURE_DONATIONS_ENABLED: 'true', DONATIONS_COMPLIANCE_CONFIRMED: 'true', STRIPE_SECRET_KEY: 'sk_test_x' })
    expect(getDonationsMode()).toEqual({ enabled: false, reason: 'payments_unconfigured' })
  })

  it('enable Stripe when everything is confirmed', () => {
    stub({ FEATURE_DONATIONS_ENABLED: 'true', DONATIONS_COMPLIANCE_CONFIRMED: 'true', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' })
    expect(getDonationsMode()).toEqual({ enabled: true, provider: 'stripe' })
  })

  it('allow the mock provider only when explicitly permitted outside production', () => {
    stub({ FEATURE_DONATIONS_ENABLED: 'true', DONATIONS_COMPLIANCE_CONFIRMED: 'true', PAYMENTS_MODE: 'mock' })
    expect(getDonationsMode().enabled).toBe(false)
    stub({ FEATURE_DONATIONS_ENABLED: 'true', DONATIONS_COMPLIANCE_CONFIRMED: 'true', PAYMENTS_MODE: 'mock', ALLOW_MOCK_PAYMENTS: 'true' })
    expect(getDonationsMode()).toEqual({ enabled: true, provider: 'mock' })
    stub({ FEATURE_DONATIONS_ENABLED: 'true', DONATIONS_COMPLIANCE_CONFIRMED: 'true', PAYMENTS_MODE: 'mock', ALLOW_MOCK_PAYMENTS: 'true', VERCEL_ENV: 'production' })
    expect(getDonationsMode().enabled).toBe(false)
  })
})
