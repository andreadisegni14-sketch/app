import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/ActionButton'
import { EmailNotConfiguredNotice, NewsletterTabs } from '@/components/admin/NewsletterChrome'
import { Empty, formatDate, PageTitle, Pagination, parsePage, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { isEmailConfigured } from '@/lib/env'
import { maskEmail } from '@/lib/newsletter/privacy'
import { NewsletterStatus } from '@/generated/prisma/enums'
import type { Prisma } from '@/generated/prisma/client'
import {
  eraseSubscriberAction,
  resendConfirmationAction,
  resendUnsentConfirmationsAction,
  unsubscribeSubscriberAction,
} from '../../newsletter-actions'

export const metadata: Metadata = { title: 'Newsletter subscribers' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const STATUSES = Object.values(NewsletterStatus)
const STATUS_LABELS: Record<NewsletterStatus, string> = { PENDING: 'Pending confirmation', CONFIRMED: 'Confirmed', UNSUBSCRIBED: 'Unsubscribed' }

export default async function NewsletterSubscribersPage({ searchParams }: Props) {
  const user = await requireUser('newsletter:view')
  const canManage = can(user.role, 'newsletter:manage')
  const canErase = can(user.role, 'newsletter:erase')
  const canExport = can(user.role, 'exports:download')
  const emailConfigured = isEmailConfigured()

  const query = await searchParams
  const status = (STATUSES as string[]).includes(String(query.status)) ? (query.status as NewsletterStatus) : undefined
  // Searching by address is limited to staff: viewers only see masked addresses.
  const q = canManage && typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  const page = parsePage(query.page)

  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { email: { contains: q.toLowerCase() } } : {}),
  }
  const [rows, total, groups, unsent] = await Promise.all([
    db.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.groupBy({ by: ['status'], _count: { _all: true } }),
    db.newsletterSubscriber.count({ where: { status: 'PENDING', confirmEmailStatus: { in: ['NOT_CONFIGURED', 'FAILED'] } } }),
  ])
  const counts = Object.fromEntries(STATUSES.map((s) => [s, groups.find((g) => g.status === s)?._count._all ?? 0])) as Record<NewsletterStatus, number>
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))

  const href = (p: { status?: string; page?: number }) => {
    const params = new URLSearchParams()
    const s = 'status' in p ? p.status : status
    if (s) params.set('status', s)
    if (q) params.set('q', q)
    if (p.page && p.page > 1) params.set('page', String(p.page))
    const qs = params.toString()
    return `/admin/newsletter${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <PageTitle
        title="Newsletter"
        description="Double opt-in subscribers. Only confirmed subscribers receive issues; every email carries a one-click unsubscribe link."
        actions={
          canExport ? (
            <a href="/admin/exports/newsletter-subscribers" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy" download>
              Export CSV
            </a>
          ) : undefined
        }
      />
      <NewsletterTabs active="subscribers" />

      {!emailConfigured && (
        <EmailNotConfiguredNotice>
          Sign-ups are stored, but confirmation emails cannot be sent
          {unsent > 0 ? ` — ${unsent} pending subscriber${unsent === 1 ? ' has' : 's have'} not received one yet` : ''}. Set RESEND_API_KEY and
          EMAIL_FROM, redeploy, then use “Send unsent confirmations”.
        </EmailNotConfiguredNotice>
      )}

      <dl className="mb-6 grid gap-4 sm:grid-cols-3" data-testid="newsletter-counts">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-lg border border-line bg-white p-4">
            <dt className="text-xs tracking-wide text-muted uppercase">{STATUS_LABELS[s]}</dt>
            <dd className="mt-1 font-display text-3xl">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      {canManage && unsent > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4 text-sm">
          <p className="min-w-[16rem] flex-1">
            <strong>{unsent}</strong> pending subscriber{unsent === 1 ? '' : 's'} never received a confirmation email (email not configured or delivery failed).
          </p>
          <ActionButton action={resendUnsentConfirmationsAction} label="Send unsent confirmations" pendingLabel="Sending…" tone="primary" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Status filter" className="flex flex-wrap gap-2 text-xs">
          <Link href={href({ status: undefined })} aria-current={!status ? 'true' : undefined} className={`rounded px-2 py-1 ${!status ? 'bg-ivory-deep font-semibold' : 'hover:underline'}`}>
            All
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} aria-current={status === s ? 'true' : undefined} className={`rounded px-2 py-1 ${status === s ? 'bg-ivory-deep font-semibold' : 'hover:underline'}`}>
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </nav>
        {canManage && (
          <form action="/admin/newsletter" method="get" role="search" className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="newsletter-search" className="sr-only">
              Search by email address
            </label>
            <input id="newsletter-search" name="q" type="search" defaultValue={q} placeholder="Search email…" className="w-56 rounded-md border border-line bg-white px-3 py-1.5 text-sm" />
            <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-ivory hover:bg-navy-soft">
              Search
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty>{q || status ? 'No subscribers match this view.' : 'No one has subscribed yet.'}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[60rem] text-left text-sm" data-testid="subscribers-table">
            <thead className="bg-ivory-deep text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Lang.</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Source</th>
                <th scope="col" className="px-4 py-3">Dates</th>
                <th scope="col" className="px-4 py-3">Confirmation email</th>
                {canManage && <th scope="col" className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="min-w-[15rem] px-4 py-3 font-medium [overflow-wrap:anywhere]">{canManage ? row.email : maskEmail(row.email)}</td>
                  <td className="px-4 py-3 uppercase">{row.locale}</td>
                  <td className="px-4 py-3">
                    <Pill value={row.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{row.source}</td>
                  <td className="min-w-[9rem] px-4 py-3 text-xs text-muted">
                    <div>Signed up {formatDate(row.consentAt)}</div>
                    {row.confirmedAt && <div>Confirmed {formatDate(row.confirmedAt)}</div>}
                    {row.unsubscribedAt && <div>Unsubscribed {formatDate(row.unsubscribedAt)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'PENDING' ? (
                      <>
                        <Pill value={row.confirmEmailStatus} label={row.confirmEmailStatus === 'NOT_CONFIGURED' ? 'NOT SENT (EMAIL OFF)' : undefined} />
                        {row.confirmEmailError && <p className="mt-1 max-w-[14rem] text-xs break-words text-error">{row.confirmEmailError}</p>}
                        {row.confirmTokenExpiresAt && row.confirmTokenExpiresAt < new Date() && <p className="mt-1 text-xs text-muted">Link expired</p>}
                      </>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        {row.status === 'PENDING' && emailConfigured && (
                          <ActionButton action={resendConfirmationAction} fields={{ id: row.id }} label="Resend confirmation" pendingLabel="Sending…" />
                        )}
                        {row.status !== 'UNSUBSCRIBED' && (
                          <ActionButton action={unsubscribeSubscriberAction} fields={{ id: row.id }} label="Unsubscribe" confirm={`Unsubscribe ${row.email}?`} />
                        )}
                        {canErase && (
                          <ActionButton
                            action={eraseSubscriberAction}
                            fields={{ id: row.id }}
                            label="Erase"
                            tone="danger"
                            confirm={`Permanently erase ${row.email} and their delivery history (GDPR erasure)? This cannot be undone, and the address will no longer be on record as having opted out.`}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => href({ page: p })} />
      {!canManage && <p className="mt-4 text-xs text-muted">Addresses are masked for your role.</p>}
    </>
  )
}
