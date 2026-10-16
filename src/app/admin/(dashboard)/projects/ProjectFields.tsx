import { Check, Field, Select } from '@/components/admin/ui'
import { budgetLinesToText } from '@/lib/admin-validation'
import { PILLARS, PROJECT_STATUSES } from '@/lib/constants'
import type { Project } from '@/generated/prisma/client'

export function ProjectFields({ project, images }: { project?: Project | null; images: { id: string; fileName: string }[] }) {
  const p = project
  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Classification</legend>
        <Field label="Slug (URL)" name="slug" required defaultValue={p?.slug} hint="lowercase-with-hyphens" />
        <Select label="Pillar" name="pillar" required defaultValue={p?.pillar ?? 'COASTAL_SCHOOL_RENEWAL'} options={PILLARS.map((v) => ({ value: v, label: v.replaceAll('_', ' ') }))} />
        <Select label="Status" name="status" required defaultValue={p?.status ?? 'IDEA'} options={PROJECT_STATUSES.map((v) => ({ value: v, label: v.replaceAll('_', ' ') }))} />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Content (English / Italian)</legend>
        <Field label="Title (EN)" name="titleEn" required defaultValue={p?.titleEn} />
        <Field label="Titolo (IT)" name="titleIt" required defaultValue={p?.titleIt} />
        <Field label="Summary (EN)" name="summaryEn" required rows={3} defaultValue={p?.summaryEn} />
        <Field label="Sintesi (IT)" name="summaryIt" required rows={3} defaultValue={p?.summaryIt} />
        <Field label="Description (EN)" name="descriptionEn" required rows={8} defaultValue={p?.descriptionEn} hint="Separate paragraphs with a blank line." />
        <Field label="Descrizione (IT)" name="descriptionIt" required rows={8} defaultValue={p?.descriptionIt} />
        <Field label="Location (EN)" name="locationEn" required defaultValue={p?.locationEn} hint="Never name a school or beneficiary without written consent." />
        <Field label="Luogo (IT)" name="locationIt" required defaultValue={p?.locationIt} />
        <Field label="Goals (EN), one per line" name="goalsEn" rows={5} defaultValue={p?.goalsEn.join('\n')} />
        <Field label="Obiettivi (IT), uno per riga" name="goalsIt" rows={5} defaultValue={p?.goalsIt.join('\n')} />
        <Field label="Region (internal, for filtering)" name="region" defaultValue={p?.region} />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Budget &amp; funding</legend>
        <div className="md:col-span-2">
          <Field
            label="Budget lines"
            name="budgetLines"
            rows={6}
            defaultValue={budgetLinesToText(p?.budgetLines)}
            hint='One per line: "English label | Italian label | amount in EUR" — e.g. "Classroom works | Lavori aule | 20000"'
          />
        </div>
        <Check label="Budget is illustrative (shown with a disclaimer)" name="budgetIsIllustrative" defaultChecked={p?.budgetIsIllustrative ?? true} />
        <div />
        <Field label="Pledged in writing (EUR)" name="pledged" defaultValue={p ? (p.pledgedCents / 100).toFixed(2) : '0'} hint="Only amounts backed by a signed pledge." />
        <Field label="Spent (EUR)" name="spent" defaultValue={p ? (p.spentCents / 100).toFixed(2) : '0'} hint="Only amounts supported by invoices." />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Beneficiary privacy</legend>
        <Field label="Privacy note (EN)" name="privacyNoteEn" rows={3} defaultValue={p?.privacyNoteEn} hint="Leave empty to use the standard safeguarding statement." />
        <Field label="Nota privacy (IT)" name="privacyNoteIt" rows={3} defaultValue={p?.privacyNoteIt} />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Publishing</legend>
        <Select label="Cover image" name="coverMediaId" defaultValue={p?.coverMediaId} options={images.map((i) => ({ value: i.id, label: i.fileName }))} />
        <Field label="Sort order" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} />
        <div className="space-y-2 pt-6">
          <Check label="Published on the public site" name="isPublished" defaultChecked={p?.isPublished ?? false} />
          <Check label="Featured on the homepage" name="isFeatured" defaultChecked={p?.isFeatured ?? false} />
          <Check label="Demo content (labelled DEMO publicly)" name="isDemo" defaultChecked={p?.isDemo ?? false} />
        </div>
      </fieldset>
    </div>
  )
}
