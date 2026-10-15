import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, Field, formatDate, PageTitle, Pill, Select } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { createUserAction, resetPasswordAction, updateUserAction } from '../../actions'

export const metadata: Metadata = { title: 'Users' }

const ROLES = [
  { value: 'ADMIN', label: 'Admin — everything, incl. personal-data exports' },
  { value: 'EDITOR', label: 'Editor — content and enquiry handling' },
  { value: 'VIEWER', label: 'Viewer — read-only, no personal data' },
]

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireUser('users:manage')
  const query = await searchParams
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' }, include: { role: true } })
  return (
    <>
      <PageTitle title="Users" description="Grant the least privilege needed. Deactivating a user signs them out everywhere." />
      {query.error === 'self' && <p role="alert" className="mb-4 rounded-md bg-error/10 px-4 py-2 text-sm text-error">You cannot remove your own admin role or deactivate yourself.</p>}
      <Card title="Add user" className="mb-6">
        <AdminForm action={createUserAction} submitLabel="Create user" resetOnSuccess>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Select label="Role" name="role" required defaultValue="VIEWER" options={ROLES} />
            <Field label="Temporary password" name="password" type="password" required hint="At least 12 characters with letters and a number." />
          </div>
        </AdminForm>
      </Card>
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{u.name}</span>
              <span className="text-muted">{u.email}</span>
              <Pill value={u.isActive ? 'RESOLVED' : 'ARCHIVED'} label={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
              {u.lockedUntil && u.lockedUntil > new Date() && <Pill value="FAILED" label="LOCKED" />}
              <span className="ml-auto text-xs text-muted">Last sign-in {formatDate(u.lastLoginAt)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <form action={updateUserAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={u.id} />
                <Select label="Role" name="role" required defaultValue={u.role.name} options={ROLES.map((r) => ({ value: r.value, label: r.value }))} />
                <Select label="Access" name="isActive" required defaultValue={String(u.isActive)} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }]} />
                <button type="submit" className="rounded-md border border-navy px-3 py-2 text-sm font-semibold text-navy" disabled={u.id === me.id}>
                  Apply
                </button>
              </form>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-navy">Reset password</summary>
                <div className="mt-3 max-w-sm">
                  <AdminForm action={resetPasswordAction} submitLabel="Reset" resetOnSuccess>
                    <input type="hidden" name="id" value={u.id} />
                    <Field label="New temporary password" name="password" type="password" required />
                  </AdminForm>
                </div>
              </details>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
