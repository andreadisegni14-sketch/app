import Link from 'next/link'
import type { Metadata } from 'next'
import { EmailNotConfiguredNotice, NewsletterTabs } from '@/components/admin/NewsletterChrome'
import { Empty, formatDate, PageTitle, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { isEmailConfigured } from '@/lib/env'

export const metadata: Metadata = { title: 'Newsletter issues' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewsletterIssuesPage({ searchParams }: Props) {
  const user = await requireUser('newsletter:view')
  const query = await searchParams
  const issues = await db.newsletterIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })

  return (
    <>
      <PageTitle
        title="Newsletter"
        description="Write each issue in English and Italian; every subscriber receives their own language. Sent issues are read-only."
        actions={
          can(user.role, 'newsletter:manage') ? (
            <Link href="/admin/newsletter/issues/new" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-ivory hover:bg-navy-soft">
              New issue
            </Link>
          ) : undefined
        }
      />
      <NewsletterTabs active="issues" />
      {!isEmailConfigured() && <EmailNotConfiguredNotice>Drafts can be written and previewed, but test sends and sending to subscribers are disabled until RESEND_API_KEY and EMAIL_FROM are set.</EmailNotConfiguredNotice>}
      {query.deleted && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-2 text-sm text-success">The draft was deleted.</p>}
      {issues.length === 0 ? (
        <Empty>No issues yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm" data-testid="issues-table">
            <thead className="bg-ivory-deep text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Subject</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Recipients</th>
                <th scope="col" className="px-4 py-3">Updated</th>
                <th scope="col" className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/newsletter/issues/${issue.id}`} className="font-medium text-navy hover:underline">
                      {issue.subjectEn}
                    </Link>
                    <div className="text-xs text-muted">{issue.subjectIt}</div>
                  </td>
                  <td className="px-4 py-3"><Pill value={issue.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {issue.status === 'DRAFT' ? '—' : `${issue.sentCount} sent${issue.failedCount ? ` · ${issue.failedCount} failed` : ''}`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(issue.updatedAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(issue.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
