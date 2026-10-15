import 'server-only'
import { db } from '@/lib/db'
import type { Prisma } from '@/generated/prisma/client'

export async function audit(entry: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
      },
    })
  } catch (error) {
    // Auditing must never break the primary operation, but failures are surfaced in logs.
    console.error('[audit] failed to write audit log', error)
  }
}
