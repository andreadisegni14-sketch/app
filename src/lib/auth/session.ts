import 'server-only'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { can, type Permission } from './permissions'
import { createSession, revokeSession, validateSessionToken, type SessionUser } from './service'

export const SESSION_COOKIE = 'blf_session'

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  return validateSessionToken(jar.get(SESSION_COOKIE)?.value)
}

/**
 * Server-side authorisation gate for admin pages, actions and routes.
 * Redirects to the login page when unauthenticated and to /admin/forbidden when the role
 * lacks the permission.
 */
export async function requireUser(permission: Permission = 'dashboard:view'): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  if (!can(user.role, permission)) redirect('/admin/forbidden')
  return user
}

export async function startSession(userId: string): Promise<void> {
  const h = await headers()
  const { token, expiresAt } = await createSession(userId, h.get('user-agent'))
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession(): Promise<void> {
  const jar = await cookies()
  await revokeSession(jar.get(SESSION_COOKIE)?.value)
  jar.delete(SESSION_COOKIE)
}
