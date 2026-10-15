import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminForm, ConfirmButton } from '@/components/admin/AdminForm'
import { Card, Check, Field, formatDate, PageTitle, Pill } from '@/components/admin/ui'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  addMilestoneAction,
  addProjectUpdateAction,
  deleteMilestoneAction,
  deleteProjectAction,
  deleteProjectUpdateAction,
  saveProjectAction,
  toggleMilestoneAction,
  toggleProjectUpdateAction,
} from '../../../actions'
import { ProjectFields } from '../ProjectFields'

export const metadata: Metadata = { title: 'Edit project' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function EditProjectPage({ params, searchParams }: Props) {
  const user = await requireUser('projects:view')
  const { id } = await params
  const query = await searchParams
  const [project, images] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: { milestones: { orderBy: { sortOrder: 'asc' } }, updates: { orderBy: { createdAt: 'desc' } } },
    }),
    db.mediaAsset.findMany({ where: { kind: 'IMAGE' }, select: { id: true, fileName: true }, orderBy: { createdAt: 'desc' } }),
  ])
  if (!project) notFound()
  const editable = can(user.role, 'projects:edit')

  return (
    <>
      <p className="mb-4 text-sm"><Link href="/admin/projects" className="text-navy hover:underline">← Projects</Link></p>
      <PageTitle
        title={project.titleEn}
        description={`/${project.slug} · last updated ${formatDate(project.updatedAt)}`}
        actions={project.isPublished && <Link href={`/projects/${project.slug}`} className="text-sm font-semibold text-navy hover:underline" target="_blank">View public page ↗</Link>}
      />
      {query.created && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-2 text-sm text-success">Project created.</p>}
      {query.error === 'confirm' && <p role="alert" className="mb-4 rounded-md bg-error/10 px-4 py-2 text-sm text-error">Type the exact slug to confirm deletion.</p>}
      {query.error === 'donations' && <p role="alert" className="mb-4 rounded-md bg-error/10 px-4 py-2 text-sm text-error">This project has donations in the ledger and cannot be deleted. Unpublish it instead.</p>}

      {editable ? (
        <Card>
          <AdminForm action={saveProjectAction} submitLabel="Save project" testId="project-form">
            <input type="hidden" name="id" value={project.id} />
            <ProjectFields project={project} images={images} />
          </AdminForm>
        </Card>
      ) : (
        <Card title="Read-only">
          <p className="text-sm text-muted">Your role can view but not edit projects.</p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Milestones">
          {project.milestones.length === 0 ? (
            <p className="mb-4 text-sm text-muted">No milestones yet.</p>
          ) : (
            <ul className="mb-5 divide-y divide-line text-sm">
              {project.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {m.titleEn} {m.targetLabelEn && <span className="text-xs text-muted">· {m.targetLabelEn}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <Pill value={m.completedAt ? 'RESOLVED' : 'PENDING'} label={m.completedAt ? 'DONE' : 'PLANNED'} />
                    {editable && (
                      <>
                        <form action={toggleMilestoneAction}><input type="hidden" name="id" value={m.id} /><button className="text-xs font-semibold text-navy hover:underline">Toggle</button></form>
                        <form action={deleteMilestoneAction}><input type="hidden" name="id" value={m.id} /><ConfirmButton label="Delete" message="Delete this milestone?" className="text-xs font-semibold text-error hover:underline" /></form>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <AdminForm action={addMilestoneAction} submitLabel="Add milestone" resetOnSuccess>
              <input type="hidden" name="projectId" value={project.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title (EN)" name="titleEn" required />
                <Field label="Titolo (IT)" name="titleIt" required />
                <Field label="Target (EN)" name="targetLabelEn" placeholder="e.g. Spring 2027" />
                <Field label="Periodo (IT)" name="targetLabelIt" placeholder="es. Primavera 2027" />
                <Field label="Description (EN)" name="descriptionEn" rows={2} />
                <Field label="Descrizione (IT)" name="descriptionIt" rows={2} />
                <Field label="Order" name="sortOrder" type="number" defaultValue={project.milestones.length} />
                <div className="pt-6"><Check label="Already completed" name="completed" /></div>
              </div>
            </AdminForm>
          )}
        </Card>

        <Card title="Updates">
          {project.updates.length === 0 ? (
            <p className="mb-4 text-sm text-muted">No updates yet.</p>
          ) : (
            <ul className="mb-5 divide-y divide-line text-sm">
              {project.updates.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{u.titleEn} <span className="text-xs text-muted">· {formatDate(u.publishedAt ?? u.createdAt)}</span></span>
                  <span className="flex items-center gap-3">
                    <Pill value={u.isPublished ? 'RESOLVED' : 'ARCHIVED'} label={u.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    {editable && (
                      <>
                        <form action={toggleProjectUpdateAction}><input type="hidden" name="id" value={u.id} /><button className="text-xs font-semibold text-navy hover:underline">{u.isPublished ? 'Unpublish' : 'Publish'}</button></form>
                        <form action={deleteProjectUpdateAction}><input type="hidden" name="id" value={u.id} /><ConfirmButton label="Delete" message="Delete this update?" className="text-xs font-semibold text-error hover:underline" /></form>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <AdminForm action={addProjectUpdateAction} submitLabel="Add update" resetOnSuccess>
              <input type="hidden" name="projectId" value={project.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title (EN)" name="titleEn" required />
                <Field label="Titolo (IT)" name="titleIt" required />
                <Field label="Text (EN)" name="bodyEn" rows={4} required />
                <Field label="Testo (IT)" name="bodyIt" rows={4} required />
              </div>
              <Check label="Publish immediately" name="isPublished" hint="Updates must not identify minors or unconsented beneficiaries." />
            </AdminForm>
          )}
        </Card>
      </div>

      {can(user.role, 'projects:delete') && (
        <Card title="Delete project" className="mt-6 border-error/30">
          <form action={deleteProjectAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={project.id} />
            <div>
              <label htmlFor="confirmSlug" className="block text-sm">Type <code className="font-mono">{project.slug}</code> to confirm</label>
              <input id="confirmSlug" name="confirmSlug" className="mt-1 rounded-md border border-line px-3 py-2 text-sm" autoComplete="off" />
            </div>
            <ConfirmButton label="Delete project" message="Delete this project, its milestones and updates?" className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white" />
          </form>
        </Card>
      )}
    </>
  )
}
