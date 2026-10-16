import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { audit } from '@/lib/server/audit'
import { consumeRateLimit, RATE_LIMITS, resetRateLimit } from '@/lib/server/rate-limit'
import { hashIdentifier } from '@/lib/server/request'
import type { RoleName } from '@/generated/prisma/enums'
import { verifyPassword } from './password'

/**
 * Authentication core, independent of Next.js request APIs so it can be integration-tested.
 */

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const MAX_FAILED_LOGINS = 5
export const LOCKOUT_MS = 15 * 60 * 1000

export type SessionUser = { id: string; email: string; name: string; role: RoleName }

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: 'invalid' | 'locked' | 'rate_limited' | 'inactive' }

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function authenticate(
  emailInput: string,
  password: string,
  ctx: { ipHash: string },
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase()
  const accountKey = hashIdentifier(`acct:${email}`)

  const [ipLimit, accountLimit] = await Promise.all([
    consumeRateLimit(RATE_LIMITS.loginIp, ctx.ipHash),
    consumeRateLimit(RATE_LIMITS.loginAccount, accountKey),
  ])
  if (!ipLimit.allowed || !accountLimit.allowed) {
    await audit({ action: 'auth.rate_limited', entityType: 'User', metadata: { accountKey } })
    return { ok: false, reason: 'rate_limited' }
  }

  const user = await db.user.findUnique({ where: { email }, include: { role: true } })
  // Always run bcrypt so response time does not reveal whether the account exists.
  const passwordOk = await verifyPassword(password, user?.passwordHash)

  if (!user) {
    await audit({ action: 'auth.login_failed', entityType: 'User', metadata: { reason: 'unknown_account' } })
    return { ok: false, reason: 'invalid' }
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit({ actorId: user.id, action: 'auth.login_locked', entityType: 'User', entityId: user.id })
    return { ok: false, reason: 'locked' }
  }
  if (!passwordOk) {
    const failed = user.failedLoginCount + 1
    const lock = failed >= MAX_FAILED_LOGINS
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : user.lockedUntil,
      },
    })
    await audit({
      actorId: user.id,
      action: lock ? 'auth.account_locked' : 'auth.login_failed',
      entityType: 'User',
      entityId: user.id,
    })
    return { ok: false, reason: lock ? 'locked' : 'invalid' }
  }
  if (!user.isActive) {
    await audit({ actorId: user.id, action: 'auth.login_inactive', entityType: 'User', entityId: user.id })
    return { ok: false, reason: 'inactive' }
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
  await resetRateLimit(RATE_LIMITS.loginAccount, accountKey)
  await audit({ actorId: user.id, action: 'auth.login', entityType: 'User', entityId: user.id })

  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role.name } }
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({
    data: { id: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) ?? null },
  })
  // Opportunistic cleanup of expired sessions for this user.
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
  return { token, expiresAt }
}

export async function validateSessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 100) return null
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { role: true } } },
  })
  if (!session) return null
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  const { user } = session
  return { id: user.id, email: user.email, name: user.name, role: user.role.name }
}

export async function revokeSession(token: string | null | undefined): Promise<void> {
  if (!token) return
  await db.session.deleteMany({ where: { id: hashToken(token) } })
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } })
}
