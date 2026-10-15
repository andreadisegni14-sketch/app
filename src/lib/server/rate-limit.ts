import 'server-only'
import { db } from '@/lib/db'

export type RateLimitRule = { action: string; limit: number; windowSeconds: number }

export const RATE_LIMITS = {
  contact: { action: 'contact', limit: 5, windowSeconds: 600 },
  sponsor: { action: 'sponsor', limit: 5, windowSeconds: 600 },
  eventInterest: { action: 'event-interest', limit: 5, windowSeconds: 600 },
  supportInterest: { action: 'support-interest', limit: 5, windowSeconds: 600 },
  donationCheckout: { action: 'donation-checkout', limit: 10, windowSeconds: 600 },
  loginIp: { action: 'login-ip', limit: 20, windowSeconds: 900 },
  loginAccount: { action: 'login-account', limit: 8, windowSeconds: 900 },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitResult = { allowed: boolean; count: number; remaining: number }

/**
 * Atomic fixed-window counter in Postgres (works across serverless instances).
 * `identifier` must already be hashed — raw IPs or emails are never stored.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const key = `${rule.action}:${identifier}`
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, NOW(), NOW() + make_interval(secs => ${rule.windowSeconds}), NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN NOW() ELSE "RateLimit"."windowStart" END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW()
        THEN NOW() + make_interval(secs => ${rule.windowSeconds}) ELSE "RateLimit"."expiresAt" END,
      "updatedAt" = NOW()
    RETURNING "count"
  `
  const count = Number(rows[0]?.count ?? 1)
  return { allowed: count <= rule.limit, count, remaining: Math.max(0, rule.limit - count) }
}

export async function resetRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key: `${rule.action}:${identifier}` } })
}

/** Housekeeping: removes expired windows. Safe to call opportunistically. */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return count
}
