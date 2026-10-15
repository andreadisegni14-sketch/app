import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function createUser(role: 'ADMIN' | 'EDITOR' | 'VIEWER', overrides: { email?: string; password?: string; isActive?: boolean } = {}) {
  const roleRow = await db.role.upsert({ where: { name: role }, create: { name: role, description: role }, update: {} })
  const password = overrides.password ?? 'CorrectHorse2026Battery'
  const user = await db.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}@example.test`,
      name: `${role} Tester`,
      roleId: roleRow.id,
      passwordHash: await bcrypt.hash(password, 4),
      isActive: overrides.isActive ?? true,
    },
  })
  return { user, password }
}

export async function createEvent(overrides: Partial<{ slug: string; status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; interestOpen: boolean }> = {}) {
  return db.event.create({
    data: {
      slug: overrides.slug ?? 'test-gala',
      type: 'GALA',
      status: overrides.status ?? 'PROPOSED',
      interestOpen: overrides.interestOpen ?? true,
      titleEn: 'Test gala',
      titleIt: 'Gala di prova',
      summaryEn: 'Summary',
      summaryIt: 'Sintesi',
      locationEn: 'TBC',
      locationIt: 'Da confermare',
      dateLabelEn: '2027',
      dateLabelIt: '2027',
    },
  })
}
