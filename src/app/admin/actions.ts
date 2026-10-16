'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { MEDIA_LIMITS } from '@/lib/constants'
import {
  adminErrors,
  beneficiarySchema,
  eventUpdateSchema,
  inquiryUpdateSchema,
  mediaMetaSchema,
  milestoneSchema,
  projectSchema,
  projectUpdateSchema,
  reconcileSchema,
  settingsSchema,
  userCreateSchema,
} from '@/lib/admin-validation'
import { hashPassword, passwordPolicyError } from '@/lib/auth/password'
import { authenticate, revokeAllSessionsForUser } from '@/lib/auth/service'
import { endSession, requireUser, startSession } from '@/lib/auth/session'
import { audit } from '@/lib/server/audit'
import { getRequestContext } from '@/lib/server/request'
import { formDataToObject, loginSchema } from '@/lib/validation'
import { Prisma } from '@/generated/prisma/client'
import type {
  EventStatus,
  InquiryStatus,
  Pillar,
  ProjectStatus,
  RoleName,
} from '@/generated/prisma/enums'

export type AdminFormState = { ok: boolean; errors: string[]; message?: string }

const ok = (message: string): AdminFormState => ({ ok: true, errors: [], message })
const fail = (...errors: string[]): AdminFormState => ({ ok: false, errors })

function str(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function uniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function loginAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const parsed = loginSchema.safeParse({ email: str(formData, 'email'), password: str(formData, 'password') })
  if (!parsed.success) return fail('Enter your email address and password.')

  const ctx = await getRequestContext()
  const result = await authenticate(parsed.data.email, parsed.data.password, ctx)
  if (!result.ok) {
    const messages = {
      invalid: 'Incorrect email address or password.',
      locked: 'This account is temporarily locked after repeated failed attempts. Try again in 15 minutes.',
      rate_limited: 'Too many sign-in attempts. Please wait and try again.',
      inactive: 'This account has been deactivated. Contact an administrator.',
    }
    return fail(messages[result.reason])
  }
  await startSession(result.user.id)
  redirect('/admin')
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function saveProjectAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('projects:edit')
  const id = str(formData, 'id') || null
  const parsed = projectSchema.safeParse(formDataToObject(formData, ['budgetIsIllustrative', 'isPublished', 'isFeatured', 'isDemo']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const input = parsed.data

  if (input.coverMediaId) {
    const cover = await db.mediaAsset.findUnique({ where: { id: input.coverMediaId }, select: { kind: true } })
    if (!cover || cover.kind !== 'IMAGE') return fail('Cover image: choose an existing image from the media library.')
  }

  const budgetCents = input.budgetLines.reduce((sum, l) => sum + l.amountCents, 0)
  const data = {
    slug: input.slug,
    pillar: input.pillar as Pillar,
    status: input.status as ProjectStatus,
    titleEn: input.titleEn,
    titleIt: input.titleIt,
    summaryEn: input.summaryEn,
    summaryIt: input.summaryIt,
    descriptionEn: input.descriptionEn,
    descriptionIt: input.descriptionIt,
    locationEn: input.locationEn,
    locationIt: input.locationIt,
    region: input.region,
    goalsEn: input.goalsEn,
    goalsIt: input.goalsIt,
    budgetLines: input.budgetLines,
    budgetCents,
    budgetIsIllustrative: input.budgetIsIllustrative,
    pledgedCents: input.pledged,
    spentCents: input.spent,
    privacyNoteEn: input.privacyNoteEn,
    privacyNoteIt: input.privacyNoteIt,
    sortOrder: input.sortOrder,
    isPublished: input.isPublished,
    isFeatured: input.isFeatured,
    isDemo: input.isDemo,
    coverMediaId: input.coverMediaId,
  }

  let projectId: string
  try {
    if (id) {
      await db.project.update({ where: { id }, data })
      projectId = id
    } else {
      projectId = (await db.project.create({ data })).id
    }
  } catch (error) {
    if (uniqueViolation(error)) return fail('Another project already uses this slug.')
    throw error
  }

  await audit({ actorId: user.id, action: id ? 'project.update' : 'project.create', entityType: 'Project', entityId: projectId, metadata: { slug: input.slug, status: input.status, isPublished: input.isPublished } })
  revalidatePath('/admin/projects')
  if (!id) redirect(`/admin/projects/${projectId}?created=1`)
  return ok('Project saved.')
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser('projects:delete')
  const id = str(formData, 'id')
  const confirm = str(formData, 'confirmSlug')
  const project = await db.project.findUnique({ where: { id }, select: { slug: true, _count: { select: { donations: true } } } })
  if (!project || confirm !== project.slug) redirect(`/admin/projects/${id}?error=confirm`)
  if (project._count.donations > 0) redirect(`/admin/projects/${id}?error=donations`)
  await db.project.delete({ where: { id } })
  await audit({ actorId: user.id, action: 'project.delete', entityType: 'Project', entityId: id, metadata: { slug: project.slug } })
  revalidatePath('/admin/projects')
  redirect('/admin/projects?deleted=1')
}

export async function addMilestoneAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('projects:edit')
  const projectId = str(formData, 'projectId')
  const parsed = milestoneSchema.safeParse(formDataToObject(formData, ['completed']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const { completed, ...rest } = parsed.data
  const milestone = await db.projectMilestone.create({ data: { ...rest, projectId, completedAt: completed ? new Date() : null } })
  await audit({ actorId: user.id, action: 'milestone.create', entityType: 'ProjectMilestone', entityId: milestone.id, metadata: { projectId } })
  revalidatePath(`/admin/projects/${projectId}`)
  return ok('Milestone added.')
}

export async function toggleMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser('projects:edit')
  const id = str(formData, 'id')
  const milestone = await db.projectMilestone.findUniqueOrThrow({ where: { id } })
  await db.projectMilestone.update({ where: { id }, data: { completedAt: milestone.completedAt ? null : new Date() } })
  await audit({ actorId: user.id, action: 'milestone.toggle', entityType: 'ProjectMilestone', entityId: id })
  revalidatePath(`/admin/projects/${milestone.projectId}`)
}

export async function deleteMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser('projects:edit')
  const id = str(formData, 'id')
  const milestone = await db.projectMilestone.delete({ where: { id } })
  await audit({ actorId: user.id, action: 'milestone.delete', entityType: 'ProjectMilestone', entityId: id })
  revalidatePath(`/admin/projects/${milestone.projectId}`)
}

export async function addProjectUpdateAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('projects:edit')
  const projectId = str(formData, 'projectId')
  const parsed = projectUpdateSchema.safeParse(formDataToObject(formData, ['isPublished']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const update = await db.projectUpdate.create({
    data: { ...parsed.data, projectId, publishedAt: parsed.data.isPublished ? new Date() : null },
  })
  await audit({ actorId: user.id, action: 'project_update.create', entityType: 'ProjectUpdate', entityId: update.id, metadata: { projectId } })
  revalidatePath(`/admin/projects/${projectId}`)
  return ok('Update saved.')
}

export async function toggleProjectUpdateAction(formData: FormData): Promise<void> {
  const user = await requireUser('projects:edit')
  const id = str(formData, 'id')
  const update = await db.projectUpdate.findUniqueOrThrow({ where: { id } })
  await db.projectUpdate.update({
    where: { id },
    data: { isPublished: !update.isPublished, publishedAt: update.isPublished ? update.publishedAt : (update.publishedAt ?? new Date()) },
  })
  await audit({ actorId: user.id, action: update.isPublished ? 'project_update.unpublish' : 'project_update.publish', entityType: 'ProjectUpdate', entityId: id })
  revalidatePath(`/admin/projects/${update.projectId}`)
}

export async function deleteProjectUpdateAction(formData: FormData): Promise<void> {
  const user = await requireUser('projects:edit')
  const id = str(formData, 'id')
  const update = await db.projectUpdate.delete({ where: { id } })
  await audit({ actorId: user.id, action: 'project_update.delete', entityType: 'ProjectUpdate', entityId: id })
  revalidatePath(`/admin/projects/${update.projectId}`)
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

const inquiryTypeSchema = z.enum(['contact', 'sponsor', 'events'])

export async function updateInquiryAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('inquiries:update')
  const type = inquiryTypeSchema.safeParse(str(formData, 'type'))
  const id = str(formData, 'id')
  const parsed = inquiryUpdateSchema.safeParse(formDataToObject(formData))
  if (!type.success || !id) return fail('Unknown enquiry.')
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const data = { status: parsed.data.status as InquiryStatus, internalNotes: parsed.data.internalNotes }

  if (type.data === 'contact') await db.contactInquiry.update({ where: { id }, data })
  if (type.data === 'sponsor') await db.sponsorInquiry.update({ where: { id }, data })
  if (type.data === 'events') await db.eventInterest.update({ where: { id }, data })

  await audit({ actorId: user.id, action: 'inquiry.update', entityType: type.data, entityId: id, metadata: { status: data.status } })
  revalidatePath('/admin/inquiries')
  return ok('Enquiry updated.')
}

export async function deleteInquiryAction(formData: FormData): Promise<void> {
  // Erasure requests (GDPR Art. 17) are handled by administrators only.
  const user = await requireUser('users:manage')
  const type = inquiryTypeSchema.parse(str(formData, 'type'))
  const id = str(formData, 'id')
  if (type === 'contact') await db.contactInquiry.delete({ where: { id } })
  if (type === 'sponsor') await db.sponsorInquiry.delete({ where: { id } })
  if (type === 'events') await db.eventInterest.delete({ where: { id } })
  await audit({ actorId: user.id, action: 'inquiry.erase', entityType: type, entityId: id })
  revalidatePath('/admin/inquiries')
  redirect(`/admin/inquiries?type=${type}&erased=1`)
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function updateEventAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('events:edit')
  const id = str(formData, 'id')
  const parsed = eventUpdateSchema.safeParse(formDataToObject(formData, ['interestOpen', 'isPublished']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  await db.event.update({ where: { id }, data: { ...parsed.data, status: parsed.data.status as EventStatus } })
  await audit({ actorId: user.id, action: 'event.update', entityType: 'Event', entityId: id, metadata: { status: parsed.data.status } })
  revalidatePath('/admin/events')
  return ok('Event saved.')
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** Checks the file's leading bytes so a renamed executable cannot pose as an image or PDF. */
function sniffMime(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif'
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  return null
}

function safeguardingError(meta: { isPublic: boolean; depictsMinors: boolean; guardianConsentConfirmed: boolean }): string | null {
  if (meta.isPublic && meta.depictsMinors && !meta.guardianConsentConfirmed) {
    return 'Safeguarding: media depicting minors cannot be made public until documented guardian consent is confirmed.'
  }
  return null
}

export async function uploadMediaAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('media:edit')
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a file to upload.')
  if (file.size > MEDIA_LIMITS.maxBytes) return fail('Files must be 4 MB or smaller.')

  const parsed = mediaMetaSchema.safeParse(formDataToObject(formData, ['isPublic', 'depictsMinors', 'guardianConsentConfirmed']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const meta = parsed.data
  const guard = safeguardingError(meta)
  if (guard) return fail(guard)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mimeType = sniffMime(bytes)
  const allowed: readonly string[] = [...MEDIA_LIMITS.imageTypes, ...MEDIA_LIMITS.documentTypes]
  if (!mimeType || !allowed.includes(mimeType)) return fail('Only JPEG, PNG, WebP, AVIF images and PDF documents are accepted.')
  const kind = mimeType === 'application/pdf' ? 'DOCUMENT' : 'IMAGE'
  if (kind === 'IMAGE' && meta.isPublic && !meta.altEn) return fail('Public images need English alternative text.')

  if (meta.projectId && !(await db.project.findUnique({ where: { id: meta.projectId }, select: { id: true } }))) {
    return fail('Linked project not found.')
  }

  const asset = await db.mediaAsset.create({
    data: {
      kind,
      fileName: file.name.slice(0, 200) || 'upload',
      mimeType,
      sizeBytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      data: bytes,
      ...meta,
      uploadedById: user.id,
    },
    select: { id: true },
  })
  await audit({ actorId: user.id, action: 'media.upload', entityType: 'MediaAsset', entityId: asset.id, metadata: { kind, isPublic: meta.isPublic, depictsMinors: meta.depictsMinors } })
  revalidatePath('/admin/media')
  return ok('File uploaded.')
}

export async function updateMediaAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('media:edit')
  const id = str(formData, 'id')
  const parsed = mediaMetaSchema.safeParse(formDataToObject(formData, ['isPublic', 'depictsMinors', 'guardianConsentConfirmed']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const guard = safeguardingError(parsed.data)
  if (guard) return fail(guard)
  await db.mediaAsset.update({ where: { id }, data: parsed.data })
  await audit({ actorId: user.id, action: 'media.update', entityType: 'MediaAsset', entityId: id, metadata: { isPublic: parsed.data.isPublic } })
  revalidatePath('/admin/media')
  return ok('Media details saved.')
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser('media:delete')
  const id = str(formData, 'id')
  await db.mediaAsset.delete({ where: { id } })
  await audit({ actorId: user.id, action: 'media.delete', entityType: 'MediaAsset', entityId: id })
  revalidatePath('/admin/media')
}

// ---------------------------------------------------------------------------
// Beneficiary organisations
// ---------------------------------------------------------------------------

export async function saveBeneficiaryAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('beneficiaries:edit')
  const id = str(formData, 'id') || null
  const parsed = beneficiarySchema.safeParse(formDataToObject(formData, ['publicNameConsent']))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  try {
    const record = id
      ? await db.beneficiaryOrganization.update({ where: { id }, data: parsed.data })
      : await db.beneficiaryOrganization.create({ data: parsed.data })
    await audit({ actorId: user.id, action: id ? 'beneficiary.update' : 'beneficiary.create', entityType: 'BeneficiaryOrganization', entityId: record.id, metadata: { dueDiligenceStatus: parsed.data.dueDiligenceStatus } })
  } catch (error) {
    if (uniqueViolation(error)) return fail('An organisation with this name and region already exists.')
    throw error
  }
  revalidatePath('/admin/beneficiaries')
  return ok('Organisation saved.')
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export async function reconcileDonationAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('donations:reconcile')
  const id = str(formData, 'id')
  const parsed = reconcileSchema.safeParse(formDataToObject(formData))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const reconciled = parsed.data.reconciliationStatus === 'RECONCILED'
  await db.donation.update({
    where: { id },
    data: {
      reconciliationStatus: parsed.data.reconciliationStatus,
      reconciliationNote: parsed.data.reconciliationNote,
      reconciledAt: reconciled ? new Date() : null,
      reconciledById: reconciled ? user.id : null,
    },
  })
  await audit({ actorId: user.id, action: 'donation.reconcile', entityType: 'Donation', entityId: id, metadata: { status: parsed.data.reconciliationStatus } })
  revalidatePath('/admin/donations')
  return ok('Reconciliation updated.')
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUserAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('users:manage')
  const parsed = userCreateSchema.safeParse(formDataToObject(formData))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const policy = passwordPolicyError(parsed.data.password)
  if (policy) return fail(policy)
  const role = await db.role.findUniqueOrThrow({ where: { name: parsed.data.role as RoleName } })
  try {
    const created = await db.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, roleId: role.id, passwordHash: await hashPassword(parsed.data.password) },
    })
    await audit({ actorId: user.id, action: 'user.create', entityType: 'User', entityId: created.id, metadata: { role: parsed.data.role } })
  } catch (error) {
    if (uniqueViolation(error)) return fail('A user with this email address already exists.')
    throw error
  }
  revalidatePath('/admin/users')
  return ok('User created. Share the temporary password through a secure channel and ask them to change it.')
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const actor = await requireUser('users:manage')
  const id = str(formData, 'id')
  const role = z.enum(['ADMIN', 'EDITOR', 'VIEWER']).parse(str(formData, 'role'))
  const isActive = str(formData, 'isActive') === 'true'
  if (id === actor.id && (role !== 'ADMIN' || !isActive)) redirect('/admin/users?error=self')

  const roleRow = await db.role.findUniqueOrThrow({ where: { name: role } })
  await db.user.update({ where: { id }, data: { roleId: roleRow.id, isActive } })
  if (!isActive) await revokeAllSessionsForUser(id)
  await audit({ actorId: actor.id, action: 'user.update', entityType: 'User', entityId: id, metadata: { role, isActive } })
  revalidatePath('/admin/users')
}

export async function resetPasswordAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const actor = await requireUser('users:manage')
  const id = str(formData, 'id')
  const password = str(formData, 'password')
  const policy = passwordPolicyError(password)
  if (policy) return fail(policy)
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null } })
  await revokeAllSessionsForUser(id)
  await audit({ actorId: actor.id, action: 'user.password_reset', entityType: 'User', entityId: id })
  return ok('Password reset. Existing sessions for this user were signed out.')
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveSettingsAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('settings:edit')
  const parsed = settingsSchema.safeParse(formDataToObject(formData))
  if (!parsed.success) return fail(...adminErrors(parsed.error))
  const value = { en: parsed.data.launchStatusNoteEn, it: parsed.data.launchStatusNoteIt }
  await db.siteSetting.upsert({
    where: { key: 'launchStatusNote' },
    create: { key: 'launchStatusNote', value, description: 'Optional note shown in the launch-status section of the homepage.' },
    update: { value },
  })
  await audit({ actorId: user.id, action: 'settings.update', entityType: 'SiteSetting', entityId: 'launchStatusNote' })
  revalidatePath('/admin/settings')
  return ok('Settings saved.')
}
