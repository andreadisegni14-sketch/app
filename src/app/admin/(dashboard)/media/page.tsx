import type { Metadata } from 'next'
import { AdminForm, ConfirmButton } from '@/components/admin/AdminForm'
import { Card, Check, Empty, Field, formatDate, PageTitle, Pill, Select } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { deleteMediaAction, updateMediaAction, uploadMediaAction } from '../../actions'

export const metadata: Metadata = { title: 'Media' }

export default async function AdminMediaPage() {
  const user = await requireUser('media:view')
  const [assets, projects] = await Promise.all([
    db.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true, fileName: true, mimeType: true, sizeBytes: true, altEn: true, altIt: true, credit: true, license: true, sourceUrl: true, isPublic: true, depictsMinors: true, guardianConsentConfirmed: true, projectId: true, createdAt: true },
    }),
    db.project.findMany({ select: { id: true, titleEn: true }, orderBy: { sortOrder: 'asc' } }),
  ])
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.titleEn }))

  const metaFields = (a?: (typeof assets)[number]) => (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Alt text (EN)" name="altEn" defaultValue={a?.altEn} hint="Required for public images." />
      <Field label="Testo alternativo (IT)" name="altIt" defaultValue={a?.altIt} />
      <Field label="Credit" name="credit" defaultValue={a?.credit} placeholder="Photographer / owner" />
      <Field label="Licence" name="license" defaultValue={a?.license} placeholder="e.g. CC BY 4.0, or 'Owned'" />
      <Field label="Source URL" name="sourceUrl" defaultValue={a?.sourceUrl} />
      <Select label="Linked project (evidence / gallery)" name="projectId" defaultValue={a?.projectId} options={projectOptions} />
      <div className="space-y-2 md:col-span-2">
        <Check label="Public" name="isPublic" defaultChecked={a?.isPublic} hint="Only publish media you hold a licence for." />
        <Check label="Depicts minors" name="depictsMinors" defaultChecked={a?.depictsMinors} />
        <Check label="Documented guardian consent confirmed" name="guardianConsentConfirmed" defaultChecked={a?.guardianConsentConfirmed} hint="Required before any image of a minor can be public. Keep consent forms on file." />
      </div>
    </div>
  )

  return (
    <>
      <PageTitle title="Media" description="Images (JPEG, PNG, WebP, AVIF) and PDF evidence up to 4 MB. Files are type-checked by content, not by extension." />
      {can(user.role, 'media:edit') && (
        <Card title="Upload" className="mb-6">
          <AdminForm action={uploadMediaAction} submitLabel="Upload" resetOnSuccess encType="multipart/form-data">
            <div>
              <label htmlFor="file" className="block text-sm font-medium">File</label>
              <input id="file" name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className="mt-1 block text-sm" />
            </div>
            {metaFields()}
          </AdminForm>
        </Card>
      )}
      {assets.length === 0 ? (
        <Empty>No media uploaded yet. The public site uses original illustrations until licensed photography is added.</Empty>
      ) : (
        <div className="space-y-4">
          {assets.map((a) => (
            <Card key={a.id}>
              <div className="mb-3 flex flex-wrap items-center gap-4">
                {a.kind === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of private media
                  <img src={`/api/media/${a.id}`} alt={a.altEn} className="h-16 w-24 rounded object-cover" />
                ) : (
                  <a href={`/api/media/${a.id}`} className="text-sm font-semibold text-navy underline" target="_blank" rel="noopener">Open PDF</a>
                )}
                <div className="text-sm">
                  <p className="font-medium">{a.fileName}</p>
                  <p className="text-xs text-muted">{a.mimeType} · {Math.ceil(a.sizeBytes / 1024)} KB · {formatDate(a.createdAt)}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Pill value={a.isPublic ? 'RESOLVED' : 'ARCHIVED'} label={a.isPublic ? 'PUBLIC' : 'PRIVATE'} />
                  {a.depictsMinors && <Pill value={a.guardianConsentConfirmed ? 'IN_PROGRESS' : 'FAILED'} label={a.guardianConsentConfirmed ? 'MINORS · CONSENT' : 'MINORS · NO CONSENT'} />}
                </div>
              </div>
              {can(user.role, 'media:edit') && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Edit details</summary>
                  <div className="mt-4">
                    <AdminForm action={updateMediaAction}>
                      <input type="hidden" name="id" value={a.id} />
                      {metaFields(a)}
                    </AdminForm>
                  </div>
                </details>
              )}
              {can(user.role, 'media:delete') && (
                <form action={deleteMediaAction} className="mt-3">
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton label="Delete file" message="Delete this file permanently?" />
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
