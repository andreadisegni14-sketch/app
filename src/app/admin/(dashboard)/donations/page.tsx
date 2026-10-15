import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, Empty, Field, formatDate, PageTitle, Pagination, parsePage, Pill, Select } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { getDonationsMode } from '@/lib/env'
import { formatMoney } from '@/lib/finance'
import { reconcileDonationAction } from '../../actions'

export const metadata: Metadata = { title: 'Donations' }

export default async function DonationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser('donations:view')
  const page = parsePage((await searchParams).page)
  const mode = getDonationsMode()
  const [donations, total, events] = await Promise.all([
    db.donation.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE, include: { project: { select: { titleEn: true } } } }),
    db.donation.count(),
    db.donationEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ])
  return (
    <>
      <PageTitle
        title="Donation ledger"
        description="Status is driven only by verified Stripe webhooks. Reconcile each succeeded donation against the Stripe payout and bank statement. No card data is ever stored."
      />
      <Card className="mb-6">
        <p className="text-sm">
          Donations are currently <strong>{mode.enabled ? `enabled (${mode.provider})` : `disabled — ${mode.reason.replaceAll('_', ' ')}`}</strong>. See LAUNCH_CHECKLIST.md before enabling.
        </p>
      </Card>
      {donations.length === 0 ? (
        <Empty>No donations recorded.</Empty>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-display text-xl tabular-nums">{formatMoney(d.amountCents, 'en', d.currency, true)}</span>
                <Pill value={d.status} />
                <Pill value={d.reconciliationStatus} />
                {!d.livemode && <Pill value="ARCHIVED" label={d.provider === 'MOCK' ? 'MOCK' : 'TEST MODE'} />}
                <span className="text-muted">{formatDate(d.createdAt)} · {d.project?.titleEn ?? 'General'} · {d.donorEmail ?? 'no email yet'}</span>
              </div>
              {d.amountReceivedCents !== null && d.amountReceivedCents !== d.amountCents && (
                <p className="mt-2 text-xs text-error">Received {formatMoney(d.amountReceivedCents, 'en', d.currency, true)} differs from requested amount.</p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Reconcile</summary>
                <div className="mt-3 max-w-xl">
                  <p className="mb-3 text-xs text-muted">Checkout session: {d.stripeCheckoutSessionId ?? '—'} · Payment intent: {d.stripePaymentIntentId ?? '—'}</p>
                  <AdminForm action={reconcileDonationAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Select label="Reconciliation" name="reconciliationStatus" required defaultValue={d.reconciliationStatus} options={['UNRECONCILED', 'RECONCILED', 'DISCREPANCY'].map((v) => ({ value: v, label: v }))} />
                    <Field label="Note" name="reconciliationNote" rows={2} defaultValue={d.reconciliationNote} />
                  </AdminForm>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))} hrefFor={(p) => `/admin/donations?page=${p}`} />
      <Card title="Latest processed webhook events" className="mt-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted">None.</p>
        ) : (
          <ul className="divide-y divide-line text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 py-2">
                <span className="font-mono">{e.type}</span>
                <span className="text-muted">{e.donationId ? 'matched' : 'unmatched'} · {formatDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
