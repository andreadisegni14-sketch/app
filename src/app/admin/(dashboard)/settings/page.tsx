import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, Field, PageTitle } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getDonationsMode, getEmailConfig, getPaymentsMode } from '@/lib/env'
import { saveSettingsAction } from '../../actions'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireUser('settings:edit')
  const row = await db.siteSetting.findUnique({ where: { key: 'launchStatusNote' } })
  const note = (row?.value ?? {}) as { en?: string; it?: string }
  const email = getEmailConfig()
  const donations = getDonationsMode()
  return (
    <>
      <PageTitle title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Launch status note (homepage)">
          <AdminForm action={saveSettingsAction}>
            <Field label="Note (EN)" name="launchStatusNoteEn" rows={3} defaultValue={note.en} hint="Factual updates only, e.g. 'Statute in drafting with our notary.'" />
            <Field label="Nota (IT)" name="launchStatusNoteIt" rows={3} defaultValue={note.it} />
          </AdminForm>
        </Card>
        <Card title="Environment flags (read-only)">
          <p className="mb-3 text-xs text-muted">These are set as environment variables in the hosting platform, not here — see .env.example.</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt>Donations</dt><dd>{donations.enabled ? `enabled (${donations.provider})` : `disabled (${donations.reason})`}</dd></div>
            <div className="flex justify-between gap-4"><dt>Payment provider configured</dt><dd>{getPaymentsMode() ?? 'none'}</dd></div>
            <div className="flex justify-between gap-4"><dt>Email (Resend)</dt><dd>{email.apiKey ? 'API key set' : 'not configured'}</dd></div>
            <div className="flex justify-between gap-4"><dt>Notification address</dt><dd>{email.notificationTo ? 'set' : 'not set'}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  )
}
