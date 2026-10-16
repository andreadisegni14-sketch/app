import Link from 'next/link'
import type { Metadata } from 'next'
import { Empty, formatDate, PageTitle, Pagination, parsePage, Pill } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { ADMIN_PAGE_SIZE, INQUIRY_STATUSES } from '@/lib/constants'
import type { InquiryStatus } from '@/generated/prisma/enums'

export const metadata: Metadata = { title: 'Enquiries' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const TABS = [
  { key: 'contact', label: 'Contact & support interest' },
  { key: 'sponsor', label: 'Partnerships' },
  { key: 'events', label: 'Event interest' },
] as const

type Row = { id: string; title: string; subtitle: string; email: string; status: string; emailStatus: string; createdAt: Date }

export default async function InquiriesPage({ searchParams }: Props) {
  await requireUser('inquiries:view')
  const query = await searchParams
  const type = TABS.find((t) => t.key === query.type)?.key ?? 'contact'
  const status = (INQUIRY_STATUSES as string[]).includes(String(query.status)) ? (query.status as InquiryStatus) : undefined
  const page = parsePage(query.page)
  const skip = (page - 1) * ADMIN_PAGE_SIZE
  const where = status ? { status } : {}

  let rows: Row[] = []
  let total = 0
  if (type === 'contact') {
    const [items, count] = await Promise.all([
      db.contactInquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: ADMIN_PAGE_SIZE }),
      db.contactInquiry.count({ where }),
    ])
    total = count
    rows = items.map((i) => ({
      id: i.id,
      title: i.name,
      subtitle: i.source === 'DONATE_INTEREST' ? `Support interest · ${i.supportType ?? ''}` : i.topic,
      email: i.email,
      status: i.status,
      emailStatus: i.emailStatus,
      createdAt: i.createdAt,
    }))
  } else if (type === 'sponsor') {
    const [items, count] = await Promise.all([
      db.sponsorInquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: ADMIN_PAGE_SIZE }),
      db.sponsorInquiry.count({ where }),
    ])
    total = count
    rows = items.map((i) => ({ id: i.id, title: i.organizationName, subtitle: `${i.contactName} · ${i.packageInterest}`, email: i.email, status: i.status, emailStatus: i.emailStatus, createdAt: i.createdAt }))
  } else {
    const [items, count] = await Promise.all([
      db.eventInterest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: ADMIN_PAGE_SIZE, include: { event: { select: { titleEn: true } } } }),
      db.eventInterest.count({ where }),
    ])
    total = count
    rows = items.map((i) => ({ id: i.id, title: i.name, subtitle: i.event.titleEn, email: i.email, status: i.status, emailStatus: i.emailStatus, createdAt: i.createdAt }))
  }

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
  const href = (p: { type?: string; status?: string; page?: number }) => {
    const params = new URLSearchParams()
    params.set('type', p.type ?? type)
    const s = 'status' in p ? p.status : status
    if (s) params.set('status', s)
    if (p.page && p.page > 1) params.set('page', String(p.page))
    return `/admin/inquiries?${params.toString()}`
  }

  return (
    <>
      <PageTitle title="Enquiries" description="All public form submissions. Email delivery status is shown for each record; failed notifications never lose data." />
      {query.erased && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-2 text-sm text-success">The record was permanently erased.</p>}

      <nav aria-label="Enquiry type" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={href({ type: tab.key, status: undefined })}
            aria-current={tab.key === type ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${tab.key === type ? 'border-navy bg-navy text-ivory' : 'border-line bg-white hover:border-navy'}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Status filter" className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link href={href({ status: undefined })} aria-current={!status ? 'true' : undefined} className={`rounded px-2 py-1 ${!status ? 'bg-ivory-deep font-semibold' : 'hover:underline'}`}>
          All
        </Link>
        {INQUIRY_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} aria-current={status === s ? 'true' : undefined} className={`rounded px-2 py-1 ${status === s ? 'bg-ivory-deep font-semibold' : 'hover:underline'}`}>
            {s.replaceAll('_', ' ')}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty>No enquiries match this view.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm" data-testid="inquiries-table">
            <thead className="bg-ivory-deep text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">From</th>
                <th scope="col" className="px-4 py-3">Subject</th>
                <th scope="col" className="px-4 py-3">Received</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/inquiries/${type}/${row.id}`} className="font-medium text-navy hover:underline">
                      {row.title}
                    </Link>
                    <div className="text-xs text-muted">{row.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.subtitle.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3"><Pill value={row.status} /></td>
                  <td className="px-4 py-3"><Pill value={row.emailStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => href({ page: p })} />
    </>
  )
}
