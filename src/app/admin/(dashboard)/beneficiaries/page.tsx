import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, Check, Empty, Field, PageTitle, Pill, Select } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { saveBeneficiaryAction } from '../../actions'

export const metadata: Metadata = { title: 'Beneficiary organisations' }

const TYPES = ['SCHOOL', 'SAILING_CLUB', 'NONPROFIT', 'PUBLIC_BODY', 'OTHER'].map((v) => ({ value: v, label: v.replaceAll('_', ' ') }))
const DD = ['NOT_STARTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED'].map((v) => ({ value: v, label: v.replaceAll('_', ' ') }))

export default async function BeneficiariesPage() {
  const user = await requireUser('beneficiaries:view')
  const editable = can(user.role, 'beneficiaries:edit')
  const orgs = await db.beneficiaryOrganization.findMany({ orderBy: { name: 'asc' } })

  const fields = (o?: (typeof orgs)[number]) => (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Organisation name" name="name" required defaultValue={o?.name} />
      <Select label="Type" name="type" required defaultValue={o?.type ?? 'SCHOOL'} options={TYPES} />
      <Field label="Region" name="region" defaultValue={o?.region} />
      <Select label="Due diligence" name="dueDiligenceStatus" required defaultValue={o?.dueDiligenceStatus ?? 'NOT_STARTED'} options={DD} />
      <Field label="Contact name" name="contactName" defaultValue={o?.contactName} />
      <Field label="Contact email" name="contactEmail" type="email" defaultValue={o?.contactEmail} />
      <div className="md:col-span-2"><Field label="Due-diligence notes" name="dueDiligenceNotes" rows={3} defaultValue={o?.dueDiligenceNotes} hint="Legal status, authorisations, safeguarding policy, references. See OPERATIONS.md." /></div>
      <Check label="Written consent to be named publicly" name="publicNameConsent" defaultChecked={o?.publicNameConsent} />
    </div>
  )

  return (
    <>
      <PageTitle title="Beneficiary organisations" description="Internal due-diligence register. Organisations are never named publicly without written consent. There are no confirmed beneficiaries yet." />
      {editable && (
        <Card title="Add organisation" className="mb-6">
          <AdminForm action={saveBeneficiaryAction} submitLabel="Add" resetOnSuccess>{fields()}</AdminForm>
        </Card>
      )}
      {orgs.length === 0 ? (
        <Empty>No organisations recorded.</Empty>
      ) : (
        <div className="space-y-4">
          {orgs.map((o) => (
            <Card key={o.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{o.name} <span className="text-xs text-muted">· {o.type.replaceAll('_', ' ')} · {o.region ?? '—'}</span></p>
                <div className="flex gap-2">
                  <Pill value={o.dueDiligenceStatus === 'APPROVED' ? 'RESOLVED' : o.dueDiligenceStatus === 'REJECTED' ? 'FAILED' : 'PENDING'} label={`DD: ${o.dueDiligenceStatus.replaceAll('_', ' ')}`} />
                  {o.isDemo && <Pill value="PENDING" label="DEMO" />}
                </div>
              </div>
              {editable && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Edit</summary>
                  <div className="mt-4">
                    <AdminForm action={saveBeneficiaryAction}>
                      <input type="hidden" name="id" value={o.id} />
                      {fields(o)}
                    </AdminForm>
                  </div>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
