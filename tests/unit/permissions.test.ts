import { describe, expect, it } from 'vitest'
import { can, PERMISSIONS } from '@/lib/auth/permissions'

describe('role permissions', () => {
  it('gives admins every permission', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can('ADMIN', permission)).toBe(true)
    }
  })

  it('keeps personal data away from viewers', () => {
    expect(can('VIEWER', 'dashboard:view')).toBe(true)
    expect(can('VIEWER', 'projects:view')).toBe(true)
    expect(can('VIEWER', 'inquiries:view')).toBe(false)
    expect(can('VIEWER', 'exports:download')).toBe(false)
    expect(can('VIEWER', 'donations:view')).toBe(false)
    expect(can('VIEWER', 'projects:edit')).toBe(false)
  })

  it('lets editors manage content but not users, exports or donations', () => {
    expect(can('EDITOR', 'projects:edit')).toBe(true)
    expect(can('EDITOR', 'inquiries:update')).toBe(true)
    expect(can('EDITOR', 'users:manage')).toBe(false)
    expect(can('EDITOR', 'exports:download')).toBe(false)
    expect(can('EDITOR', 'donations:reconcile')).toBe(false)
    expect(can('EDITOR', 'projects:delete')).toBe(false)
  })

  it('lets viewers read the newsletter, editors manage it, and only admins send or erase', () => {
    expect(can('VIEWER', 'newsletter:view')).toBe(true)
    expect(can('VIEWER', 'newsletter:manage')).toBe(false)
    expect(can('EDITOR', 'newsletter:manage')).toBe(true)
    expect(can('EDITOR', 'newsletter:send')).toBe(false)
    expect(can('EDITOR', 'newsletter:erase')).toBe(false)
    expect(can('ADMIN', 'newsletter:send')).toBe(true)
    expect(can('ADMIN', 'newsletter:erase')).toBe(true)
  })

  it('denies anonymous users', () => {
    expect(can(null, 'dashboard:view')).toBe(false)
  })
})
