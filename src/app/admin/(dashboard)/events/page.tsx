import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, Check, Empty, Field, PageTitle, Pill, Select } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { EVENT_STATUSES } from '@/lib/constants'
import { updateEventAction } from '../../actions'

export const metadata: Metadata = { title: 'Events' }

export default async function AdminEventsPage() {
  const user = await requireUser('events:view')
  const editable = can(user.role, 'events:edit')
  const events = await db.event.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { interests: true } } } })
  return (
    <>
      <PageTitle title="Events" description="Events must remain PROPOSED until venue, permits, insurance and partner agreements are signed. Ticket sales are not available." />
      {events.length === 0 ? (
        <Empty>No events.</Empty>
      ) : (
        <div className="space-y-6">
          {events.map((e) => (
            <Card key={e.id}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl">{e.titleEn}</h2>
                <div className="flex gap-2">
                  <Pill value={e.status === 'CONFIRMED' ? 'RESOLVED' : 'PENDING'} label={e.status} />
                  {e.isDemo && <Pill value="PENDING" label="DEMO" />}
                  <Pill value="IN_PROGRESS" label={`${e._count.interests} interested`} />
                </div>
              </div>
              {editable ? (
                <AdminForm action={updateEventAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select label="Status" name="status" required defaultValue={e.status} options={EVENT_STATUSES.map((s) => ({ value: s, label: s }))} />
                    <div className="space-y-2 pt-6">
                      <Check label="Published" name="isPublished" defaultChecked={e.isPublished} />
                      <Check label="Interest registration open" name="interestOpen" defaultChecked={e.interestOpen} />
                    </div>
                    <Field label="Timing (EN)" name="dateLabelEn" required defaultValue={e.dateLabelEn} />
                    <Field label="Periodo (IT)" name="dateLabelIt" required defaultValue={e.dateLabelIt} />
                    <Field label="Location (EN)" name="locationEn" required defaultValue={e.locationEn} />
                    <Field label="Luogo (IT)" name="locationIt" required defaultValue={e.locationIt} />
                  </div>
                </AdminForm>
              ) : (
                <p className="text-sm text-muted">{e.dateLabelEn} · {e.locationEn}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
