import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { can } from '@/lib/auth/permissions'
import {
  authenticate,
  createSession,
  hashToken,
  MAX_FAILED_LOGINS,
  revokeAllSessionsForUser,
  revokeSession,
  validateSessionToken,
} from '@/lib/auth/service'
import { createUser } from './factories'

const ctx = { ipHash: 'auth-test-ip' }

describe('authenticate', () => {
  it('signs in with the correct password (email is case-insensitive) and audits it', async () => {
    const { user, password } = await createUser('ADMIN')
    const result = await authenticate('  ADMIN@example.test ', password, ctx)
    expect(result).toEqual({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: 'ADMIN' } })
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).lastLoginAt).not.toBeNull()
    expect(await db.auditLog.count({ where: { action: 'auth.login', actorId: user.id } })).toBe(1)
  })

  it('rejects wrong passwords and unknown accounts with the same reason', async () => {
    await createUser('EDITOR')
    expect(await authenticate('editor@example.test', 'wrong-password-123', ctx)).toEqual({ ok: false, reason: 'invalid' })
    expect(await authenticate('nobody@example.test', 'wrong-password-123', ctx)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('locks the account after repeated failures, even for the right password', async () => {
    const { user, password } = await createUser('EDITOR')
    for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
      expect((await authenticate(user.email, 'bad-password-xyz1', { ipHash: `ip-${i}` })).ok).toBe(false)
    }
    expect(await authenticate(user.email, 'bad-password-xyz1', { ipHash: 'ip-last' })).toEqual({ ok: false, reason: 'locked' })
    expect(await authenticate(user.email, password, { ipHash: 'ip-other' })).toEqual({ ok: false, reason: 'locked' })
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).lockedUntil).not.toBeNull()
  })

  it('refuses deactivated users', async () => {
    const { user, password } = await createUser('VIEWER', { isActive: false })
    expect(await authenticate(user.email, password, ctx)).toEqual({ ok: false, reason: 'inactive' })
  })

  it('rate-limits a single client trying many accounts', async () => {
    let last
    for (let i = 0; i < 21; i++) last = await authenticate(`user${i}@example.test`, 'whatever-password-1', ctx)
    expect(last).toEqual({ ok: false, reason: 'rate_limited' })
  })
})

describe('sessions', () => {
  it('stores only a hash of the token and resolves the user and role', async () => {
    const { user } = await createUser('VIEWER')
    const { token } = await createSession(user.id, 'vitest')
    const stored = await db.session.findFirstOrThrow()
    expect(stored.id).toBe(hashToken(token))
    expect(stored.id).not.toBe(token)
    const sessionUser = await validateSessionToken(token)
    expect(sessionUser).toMatchObject({ id: user.id, role: 'VIEWER' })
    // Server-side authorisation decisions are derived from the stored role.
    expect(can(sessionUser!.role, 'exports:download')).toBe(false)
  })

  it('rejects malformed, unknown, expired and revoked tokens', async () => {
    const { user } = await createUser('ADMIN')
    expect(await validateSessionToken(undefined)).toBeNull()
    expect(await validateSessionToken('short')).toBeNull()
    expect(await validateSessionToken('x'.repeat(43))).toBeNull()

    const expired = await createSession(user.id)
    await db.session.update({ where: { id: hashToken(expired.token) }, data: { expiresAt: new Date(Date.now() - 1000) } })
    expect(await validateSessionToken(expired.token)).toBeNull()
    expect(await db.session.count({ where: { id: hashToken(expired.token) } })).toBe(0)

    const live = await createSession(user.id)
    await revokeSession(live.token)
    expect(await validateSessionToken(live.token)).toBeNull()
  })

  it('invalidates sessions when a user is deactivated or revoked', async () => {
    const { user } = await createUser('EDITOR')
    const a = await createSession(user.id)
    const b = await createSession(user.id)
    await db.user.update({ where: { id: user.id }, data: { isActive: false } })
    expect(await validateSessionToken(a.token)).toBeNull()
    await revokeAllSessionsForUser(user.id)
    expect(await validateSessionToken(b.token)).toBeNull()
  })
})
