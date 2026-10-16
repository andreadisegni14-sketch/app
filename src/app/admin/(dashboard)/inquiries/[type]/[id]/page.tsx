import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminForm, ConfirmButton } from '@/components/admin/AdminForm'
import { Card, Field, formatDate, PageTitle, Pill, Select } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { INQUIRY_STATUSES } from '@/lib/constants'
import { deleteInquiryAction, updateInquiryAction } from '../../../../actions'

export const metadata: Metadata = { title: 'Enquiry' }

type Props = { params: Promise<{ type: string; id: string }> }

type Detail = { heading: string; fields: [string, string | number | null | undefined][]; message: string | null; status: string; emailStatus: string; emailError: string | null; internalNotes: string | null; createdAt: Date }

async function load(type: string, id: string): Promise<Detail | null> {
  if (type === 'contact') {
    const i = await db.contactInquiry.findUnique({ where: { id } })
    return i && {
      heading: i.source === 'DONATE_INTEREST' ? 'Support interest' : 'Contact enquiry',
      fields: [['Name', i.name], ['Email', i.email], ['Topic', i.topic], ['Type of support', i.supportType], ['Language', i.locale], ['Consent recorded', `${formatDate(i.consentAt)} (notice ${i.privacyVersion})`]],
      message: i.message,
      status: i.status, emailStatus: i.emailStatus, emailError: i.emailError, internalNotes: i.internalNotes, createdAt: i.createdAt,
    }
  }
  if (type === 'sponsor') {
    const i = await db.sponsorInquiry.findUnique({ where: { id } })
    return i && {
      heading: 'Partnership enquiry',
      fields: [['Organisation', i.organizationName], ['Contact', i.contactName], ['Email', i.email], ['Phone', i.phone], ['Website', i.website], ['Package of interest', i.packageInterest], ['Language', i.locale], ['Consent recorded', `${formatDate(i.consentAt)} (notice ${i.privacyVersion})`]],
      message: i.message,
      status: i.status, emailStatus: i.emailStatus, emailError: i.emailError, internalNotes: i.internalNotes, createdAt: i.createdAt,
    }
  }
  if (type === 'events') {
    const i = await db.eventInterest.findUnique({ where: { id }, include: { event: { select: { titleEn: true, status: true } } } })
    return i && {
      heading: `Event interest — ${i.event.titleEn}`,
      fields: [['Name', i.name], ['Email', i.email], ['Organisation', i.organization], ['Party size', i.partySize], ['Event status', i.event.status], ['Language', i.locale], ['Consent recorded', `${formatDate(i.consentAt)} (notice ${i.privacyVersion})`]],
      message: i.message,
      status: i.status, emailStatus: i.emailStatus, emailError: i.emailError, internalNotes: i.internalNotes, createdAt: i.createdAt,
    }
  }
  return null
}

export default async function InquiryDetailPage({ params }: Props) {
  const user = await requireUser('inquiries:view')
  const { type, id } = await params
  const item = await load(type, id)
  if (!item) notFound()

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/inquiries?type=${type}`} className="text-navy hover:underline">← All enquiries</Link>
      </p>
      <PageTitle title={item.heading} description={`Received ${formatDate(item.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {item.fields.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-medium break-words">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Message">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.message || '(no message)'}</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Notification email">
            <Pill value={item.emailStatus} />
            {item.emailError && <p className="mt-2 text-xs break-words text-error">{item.emailError}</p>}
            {item.emailStatus !== 'SENT' && <p className="mt-2 text-xs text-muted">No email was delivered for this record. Follow up from this dashboard.</p>}
          </Card>
          {can(user.role, 'inquiries:update') && (
            <Card title="Handling">
              <AdminForm action={updateInquiryAction} submitLabel="Update">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="id" value={id} />
                <Select label="Status" name="status" required defaultValue={item.status} options={INQUIRY_STATUSES.map((s) => ({ value: s, label: s.replaceAll('_', ' ') }))} />
                <Field label="Internal notes" name="internalNotes" rows={5} defaultValue={item.internalNotes} hint="Visible to staff only. Do not record unnecessary personal data." />
              </AdminForm>
            </Card>
          )}
          {can(user.role, 'users:manage') && (
            <Card title="Erasure (GDPR)">
              <p className="mb-3 text-xs text-muted">Permanently delete this record, e.g. in response to an erasure request. This cannot be undone.</p>
              <form action={deleteInquiryAction}>
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="id" value={id} />
                <ConfirmButton label="Erase permanently" message="Permanently erase this record? This cannot be undone." />
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
