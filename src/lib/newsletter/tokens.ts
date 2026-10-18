import { createHash, randomBytes } from 'node:crypto'

/** Confirmation links are valid for seven days. */
export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** URL-safe random token (256 bits). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Only this hash of a confirmation token is stored, so a database leak cannot confirm anyone. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function confirmTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + CONFIRM_TOKEN_TTL_MS)
}

export function isTokenExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() <= now.getTime()
}

/** Cheap shape check before touching the database: base64url, 43 characters for 32 bytes. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(token)
}
