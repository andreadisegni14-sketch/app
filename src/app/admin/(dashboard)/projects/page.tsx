import Link from 'next/link'
import type { Metadata } from 'next'
import { Empty, formatDate, PageTitle, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/finance'

export const metadata: Metadata = { title: 'Projects' }

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser('projects:view')
  const query = await searchParams
  const projects = await db.project.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, slug: true, titleEn: true, status: true, pillar: true, isPublished: true, isDemo: true, isFeatured: true, budgetCents: true, updatedAt: true },
  })
  return (
    <>
      <PageTitle
        title="Projects"
        description="Every project shows its true status publicly. Mark sample content as Demo."
        actions={
          can(user.role, 'projects:edit') && (
            <Link href="/admin/projects/new" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-ivory hover:bg-navy-soft">
              New project
            </Link>
          )
        }
      />
      {query.deleted && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-2 text-sm text-success">Project deleted.</p>}
      {projects.length === 0 ? (
        <Empty>No projects yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm" data-testid="projects-table">
            <thead className="bg-ivory-deep text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Title</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Visibility</th>
                <th scope="col" className="px-4 py-3">Budget</th>
                <th scope="col" className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-navy hover:underline">{p.titleEn}</Link>
                    <div className="text-xs text-muted">{p.pillar.replaceAll('_', ' ')} · /{p.slug}</div>
                  </td>
                  <td className="px-4 py-3"><Pill value={p.status} /></td>
                  <td className="space-x-1 px-4 py-3">
                    <Pill value={p.isPublished ? 'RESOLVED' : 'ARCHIVED'} label={p.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    {p.isDemo && <Pill value="PENDING" label="DEMO" />}
                    {p.isFeatured && <Pill value="IN_PROGRESS" label="FEATURED" />}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(p.budgetCents, 'en')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
