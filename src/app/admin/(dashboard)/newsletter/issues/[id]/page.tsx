import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ActionButton } from '@/components/admin/ActionButton'
import { IssueEditor, IssuePreview } from '@/components/admin/IssueEditor'
import { EmailNotConfiguredNotice } from '@/components/admin/NewsletterChrome'
import { Card, formatDate, PageTitle, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getNewsletterSenderAddress, getSiteUrl, isEmailConfigured } from '@/lib/env'
import { confirmedAudience } from '@/lib/server/newsletter'
import { deleteIssueAction, sendIssueAction, sendTestIssueAction } from '../../../../newsletter-actions'

export const metadata: Metadata = { title: 'Newsletter issue' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IssuePage({ params, searchParams }: Props) {
  const user = await requireUser('newsletter:view')
  const { id } = await params
  const query = await searchParams
  const issue = await db.newsletterIssue.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } }, sentBy: { select: { name: true } } },
  })
  if (!issue) notFound()

  const canManage = can(user.role, 'newsletter:manage')
  const canSend = can(user.role, 'newsletter:send')
  const emailConfigured = isEmailConfigured()
  const editable = issue.status === 'DRAFT' && canManage
  const sendable = issue.status === 'DRAFT' || issue.status === 'FAILED' || issue.status === 'SENDING'
  const audience = await confirmedAudience()
  const deliveryCounts = await db.newsletterDelivery.groupBy({ by: ['status'], where: { issueId: id }, _count: { _all: true } })
  const siteUrl = getSiteUrl()
  const senderAddress = getNewsletterSenderAddress() ?? null
  const confirmStep = query.step === 'confirm' && canSend && sendable && emailConfigured

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/newsletter/issues" className="text-navy hover:underline">← Issues</Link>
      </p>
      <PageTitle
        title={issue.subjectEn}
        description={`Created ${formatDate(issue.createdAt)}${issue.createdBy ? ` by ${issue.createdBy.name}` : ''}${issue.sentAt ? ` · sent ${formatDate(issue.sentAt)}${issue.sentBy ? ` by ${issue.sentBy.name}` : ''}` : ''}`}
        actions={<Pill value={issue.status} />}
      />
      {query.created && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-2 text-sm text-success">Draft created.</p>}
      {!emailConfigured && sendable && (
        <EmailNotConfiguredNotice>Test sends and sending to subscribers are disabled until RESEND_API_KEY and EMAIL_FROM are set.</EmailNotConfiguredNotice>
      )}

      {sendable && (canManage || canSend) && (
        <Card title="Send" className="mb-6">
          {confirmStep ? (
            <div className="space-y-4" data-testid="send-confirmation">
              <p className="text-sm leading-relaxed">
                You are about to send <strong>“{issue.subjectEn}”</strong> / <strong>“{issue.subjectIt}”</strong> to{' '}
                <strong>{audience.total} confirmed subscriber{audience.total === 1 ? '' : 's'}</strong> ({audience.en} in English, {audience.it} in Italian). This
                cannot be undone. Anyone who already received this issue will not receive it again.
              </p>
              <div className="flex flex-wrap items-start gap-4">
                <ActionButton action={sendIssueAction} fields={{ id }} label={`Yes, send to ${audience.total} subscribers now`} pendingLabel="Sending… keep this page open" tone="primary" testId="send-now" />
                <Link href={`/admin/newsletter/issues/${id}`} className="py-2 text-sm font-semibold text-navy hover:underline">
                  Cancel
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-4">
              {canManage && emailConfigured && (
                <ActionButton action={sendTestIssueAction} fields={{ id }} label={`Send test to ${user.email}`} pendingLabel="Sending test…" />
              )}
              {canSend && emailConfigured && audience.total > 0 && (
                <Link href={`/admin/newsletter/issues/${id}?step=confirm`} className="inline-flex min-h-10 items-center rounded-md bg-navy px-5 text-sm font-semibold text-ivory hover:bg-navy-soft">
                  {issue.status === 'DRAFT' ? `Send to ${audience.total} confirmed subscriber${audience.total === 1 ? '' : 's'}…` : 'Resume sending…'}
                </Link>
              )}
              {canSend && audience.total === 0 && <p className="text-sm text-muted">There are no confirmed subscribers yet.</p>}
              {!canSend && <p className="text-sm text-muted">Only administrators can send an issue to subscribers.</p>}
            </div>
          )}
        </Card>
      )}

      {issue.status !== 'DRAFT' && (
        <Card title="Delivery" className="mb-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-4" data-testid="delivery-stats">
            <div><dt className="text-xs text-muted">Recipients</dt><dd className="text-2xl">{issue.recipientCount}</dd></div>
            <div><dt className="text-xs text-muted">Sent</dt><dd className="text-2xl">{issue.sentCount}</dd></div>
            <div><dt className="text-xs text-muted">Failed</dt><dd className="text-2xl">{issue.failedCount}</dd></div>
            <div><dt className="text-xs text-muted">Skipped (unsubscribed meanwhile)</dt><dd className="text-2xl">{deliveryCounts.find((c) => c.status === 'SKIPPED')?._count._all ?? 0}</dd></div>
          </dl>
          {issue.status === 'FAILED' && <p className="mt-3 text-sm text-error">Some emails failed. Sending again retries only those; nobody receives the issue twice.</p>}
        </Card>
      )}

      {editable ? (
        <>
          <IssueEditor issue={{ id: issue.id, subjectEn: issue.subjectEn, subjectIt: issue.subjectIt, bodyEn: issue.bodyEn, bodyIt: issue.bodyIt }} siteUrl={siteUrl} senderAddress={senderAddress} />
          <div className="mt-10 border-t border-line pt-6">
            <ActionButton action={deleteIssueAction} fields={{ id }} label="Delete draft" tone="danger" confirm="Delete this draft? This cannot be undone." />
          </div>
        </>
      ) : (
        <div className="grid gap-8 xl:grid-cols-2">
          <Card title="Content">
            {issue.status !== 'DRAFT' && <p className="mb-4 text-xs text-muted">This issue is read-only because sending has started.</p>}
            <h3 className="text-sm font-semibold">English</h3>
            <p className="mt-1 font-medium">{issue.subjectEn}</p>
            <pre className="mt-2 font-sans text-sm whitespace-pre-wrap">{issue.bodyEn}</pre>
            <h3 className="mt-6 text-sm font-semibold">Italian</h3>
            <p className="mt-1 font-medium">{issue.subjectIt}</p>
            <pre className="mt-2 font-sans text-sm whitespace-pre-wrap">{issue.bodyIt}</pre>
          </Card>
          <IssuePreview content={{ subjectEn: issue.subjectEn, subjectIt: issue.subjectIt, bodyEn: issue.bodyEn, bodyIt: issue.bodyIt }} siteUrl={siteUrl} senderAddress={senderAddress} />
        </div>
      )}
    </>
  )
}
