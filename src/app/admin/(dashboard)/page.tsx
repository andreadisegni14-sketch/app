import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, formatDate, PageTitle, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getDonationsMode, getEmailConfig } from '@/lib/env'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireUser('dashboard:view')
  const canSeeInquiries = can(user.role, 'inquiries:view')
  const email = getEmailConfig()
  const donations = getDonationsMode()

  const [projectsByStatus, newContact, newSponsor, newEvent, emailFailures, recentContact, recentSponsor] = await Promise.all([
    db.project.groupBy({ by: ['status'], _count: true }),
    db.contactInquiry.count({ where: { status: 'NEW' } }),
    db.sponsorInquiry.count({ where: { status: 'NEW' } }),
    db.eventInterest.count({ where: { status: 'NEW' } }),
    Promise.all([
      db.contactInquiry.count({ where: { emailStatus: 'FAILED' } }),
      db.sponsorInquiry.count({ where: { emailStatus: 'FAILED' } }),
      db.eventInterest.count({ where: { emailStatus: 'FAILED' } }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
    canSeeInquiries
      ? db.contactInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, topic: true, source: true, status: true, createdAt: true } })
      : Promise.resolve([]),
    canSeeInquiries
      ? db.sponsorInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, organizationName: true, status: true, createdAt: true } })
      : Promise.resolve([]),
  ])

  const stats = [
    { label: 'New contact & support enquiries', value: newContact, href: '/admin/inquiries?type=contact&status=NEW' },
    { label: 'New partnership enquiries', value: newSponsor, href: '/admin/inquiries?type=sponsor&status=NEW' },
    { label: 'New event interest', value: newEvent, href: '/admin/inquiries?type=events&status=NEW' },
  ]

  return (
    <>
      <PageTitle title={`Welcome, ${user.name.split(' ')[0]}`} description="Enquiries are always stored in the database first, so they appear here even if email notifications are unavailable." />

      {canSeeInquiries && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="rounded-lg border border-line bg-white p-5 hover:border-navy">
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 font-display text-4xl">{s.value}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="System status">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Email notifications</dt>
              <dd>{email.apiKey && email.from && email.notificationTo ? <Pill value="SENT" label="CONFIGURED" /> : <Pill value="NOT_CONFIGURED" />}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Notification failures (all time)</dt>
              <dd>{emailFailures > 0 ? <Pill value="FAILED" label={String(emailFailures)} /> : '0'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Donations</dt>
              <dd>{donations.enabled ? <Pill value="SUCCEEDED" label={`ENABLED · ${donations.provider}`} /> : <Pill value="NOT_CONFIGURED" label={`DISABLED · ${donations.reason.replaceAll('_', ' ')}`} />}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Projects by status">
          {projectsByStatus.length === 0 ? (
            <p className="text-sm text-muted">No projects yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {projectsByStatus.map((row) => (
                <li key={row.status} className="flex justify-between">
                  <span>{row.status.replaceAll('_', ' ')}</span>
                  <span className="font-semibold">{row._count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {canSeeInquiries && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Latest contact & support enquiries">
            {recentContact.length === 0 ? (
              <p className="text-sm text-muted">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentContact.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/inquiries/contact/${i.id}`} className="font-medium text-navy hover:underline">
                      {i.name}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {i.source === 'DONATE_INTEREST' ? 'Support interest' : i.topic.replaceAll('_', ' ').toLowerCase()} · {formatDate(i.createdAt)} <Pill value={i.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Latest partnership enquiries">
            {recentSponsor.length === 0 ? (
              <p className="text-sm text-muted">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentSponsor.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/inquiries/sponsor/${i.id}`} className="font-medium text-navy hover:underline">
                      {i.organizationName}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {formatDate(i.createdAt)} <Pill value={i.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
