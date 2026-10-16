import Link from 'next/link'
import type { Metadata } from 'next'
import { AdminForm } from '@/components/admin/AdminForm'
import { Card, PageTitle } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { saveProjectAction } from '../../../actions'
import { ProjectFields } from '../ProjectFields'

export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage() {
  await requireUser('projects:edit')
  const images = await db.mediaAsset.findMany({ where: { kind: 'IMAGE' }, select: { id: true, fileName: true }, orderBy: { createdAt: 'desc' } })
  return (
    <>
      <p className="mb-4 text-sm"><Link href="/admin/projects" className="text-navy hover:underline">← Projects</Link></p>
      <PageTitle title="New project" description="New projects are saved as drafts unless you choose to publish them." />
      <Card>
        <AdminForm action={saveProjectAction} submitLabel="Create project" testId="project-form">
          <ProjectFields images={images} />
        </AdminForm>
      </Card>
    </>
  )
}
