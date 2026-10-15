import { NextResponse } from 'next/server'
import { can } from '@/lib/auth/permissions'
import { getCurrentUser } from '@/lib/auth/session'
import { audit } from '@/lib/server/audit'
import { EXPORT_DATASETS } from '@/lib/server/exports'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!can(user.role, 'exports:download')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { dataset } = await params
  const definition = Object.hasOwn(EXPORT_DATASETS, dataset) ? EXPORT_DATASETS[dataset] : undefined
  if (!definition) return NextResponse.json({ error: 'Unknown dataset' }, { status: 404 })

  const csv = await definition.build()
  await audit({ actorId: user.id, action: 'export.download', entityType: 'Export', entityId: dataset, metadata: { personalData: definition.personalData } })

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="blue-legacy-${dataset}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
