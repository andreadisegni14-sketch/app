import type { RoleName } from '@/generated/prisma/enums'

/**
 * Role-based permissions (least privilege). Checked on the server for every admin page,
 * server action and export route. The client only uses this to hide links.
 *
 * - ADMIN: everything, including personal data exports, donations, users and settings.
 * - EDITOR: programme content (projects, events, media) and enquiry handling.
 * - VIEWER: read-only access to programme content and aggregate dashboard figures — no personal data.
 */
const ALL: readonly RoleName[] = ['ADMIN', 'EDITOR', 'VIEWER']
const STAFF: readonly RoleName[] = ['ADMIN', 'EDITOR']
const ADMIN_ONLY: readonly RoleName[] = ['ADMIN']

export const PERMISSIONS = {
  'dashboard:view': ALL,
  'projects:view': ALL,
  'projects:edit': STAFF,
  'projects:delete': ADMIN_ONLY,
  'events:view': ALL,
  'events:edit': STAFF,
  'media:view': STAFF,
  'media:edit': STAFF,
  'media:delete': ADMIN_ONLY,
  'inquiries:view': STAFF,
  'inquiries:update': STAFF,
  'beneficiaries:view': STAFF,
  'beneficiaries:edit': STAFF,
  'donations:view': ADMIN_ONLY,
  'donations:reconcile': ADMIN_ONLY,
  'exports:download': ADMIN_ONLY,
  'users:manage': ADMIN_ONLY,
  'settings:edit': ADMIN_ONLY,
  'audit:view': ADMIN_ONLY,
  // Newsletter: viewers see figures and issues (subscriber addresses are masked for them);
  // staff handle subscribers and drafts; only administrators send to the list or erase records.
  'newsletter:view': ALL,
  'newsletter:manage': STAFF,
  'newsletter:send': ADMIN_ONLY,
  'newsletter:erase': ADMIN_ONLY,
} as const satisfies Record<string, readonly RoleName[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: RoleName | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly RoleName[]).includes(role)
}
