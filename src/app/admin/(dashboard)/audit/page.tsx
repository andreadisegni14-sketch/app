import type { Metadata } from 'next'
import { Empty, formatDate, PageTitle, Pagination, parsePage } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Audit log' }

const PAGE = 50

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser('audit:view')
  const page = parsePage((await searchParams).page)
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE, include: { actor: { select: { email: true } } } }),
    db.auditLog.count(),
  ])
  return (
    <>
      <PageTitle title="Audit log" description="Sign-ins, changes, exports and payment events. Entries are append-only." />
      {entries.length === 0 ? (
        <Empty>No entries.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="bg-ivory-deep tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2">When</th>
                <th scope="col" className="px-3 py-2">Who</th>
                <th scope="col" className="px-3 py-2">Action</th>
                <th scope="col" className="px-3 py-2">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td className="px-3 py-2">{e.actor?.email ?? 'system'}</td>
                  <td className="px-3 py-2 font-mono">{e.action}</td>
                  <td className="px-3 py-2 text-muted">{e.entityType}{e.entityId ? ` · ${e.entityId}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => `/admin/audit?page=${p}`} />
    </>
  )
}
