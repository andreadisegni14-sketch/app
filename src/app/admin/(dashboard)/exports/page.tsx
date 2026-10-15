import type { Metadata } from 'next'
import { Card, PageTitle } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { EXPORT_DATASETS } from '@/lib/server/exports'

export const metadata: Metadata = { title: 'Exports' }

export default async function ExportsPage() {
  await requireUser('exports:download')
  return (
    <>
      <PageTitle title="Exports" description="CSV downloads for reporting and reconciliation. Exports containing personal data are logged; store them securely and delete them when no longer needed." />
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(EXPORT_DATASETS).map(([key, dataset]) => (
          <Card key={key} title={dataset.label}>
            <p className="mb-4 text-sm text-muted">{dataset.description}</p>
            <a href={`/admin/exports/${key}`} className="inline-block rounded-md bg-navy px-4 py-2 text-sm font-semibold text-ivory hover:bg-navy-soft" download>
              Download CSV
            </a>
          </Card>
        ))}
      </div>
    </>
  )
}
