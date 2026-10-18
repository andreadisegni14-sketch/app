'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { isEmailConfigured } from '@/lib/env'
import {
  adminUnsubscribe,
  deleteDraftIssue,
  EMAIL_NOT_CONFIGURED_MESSAGE,
  eraseSubscriber,
  resendConfirmation,
  resendUnsentConfirmations,
  saveIssue,
  sendIssue,
  sendTestIssue,
  type ServiceResult,
} from '@/lib/server/newsletter'
import { formDataToObject } from '@/lib/validation'
import type { AdminFormState } from './actions'

/**
 * Newsletter admin actions. Each checks the session and role here (requireUser) and again inside
 * the service, which also writes the audit log.
 */

function str(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function toState(result: ServiceResult): AdminFormState {
  return result.ok ? { ok: true, errors: [], message: result.message } : { ok: false, errors: [result.error] }
}

export async function resendConfirmationAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  if (!isEmailConfigured()) return { ok: false, errors: [EMAIL_NOT_CONFIGURED_MESSAGE] }
  const result = await resendConfirmation(user, str(formData, 'id'))
  revalidatePath('/admin/newsletter')
  return toState(result)
}

export async function resendUnsentConfirmationsAction(): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  if (!isEmailConfigured()) return { ok: false, errors: [EMAIL_NOT_CONFIGURED_MESSAGE] }
  const result = await resendUnsentConfirmations(user)
  revalidatePath('/admin/newsletter')
  return toState(result)
}

export async function unsubscribeSubscriberAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  const result = await adminUnsubscribe(user, str(formData, 'id'))
  revalidatePath('/admin/newsletter')
  return toState(result)
}

export async function eraseSubscriberAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:erase')
  const result = await eraseSubscriber(user, str(formData, 'id'))
  revalidatePath('/admin/newsletter')
  return toState(result)
}

export async function saveIssueAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  const id = str(formData, 'id') || null
  const result = await saveIssue(user, formDataToObject(formData), id)
  revalidatePath('/admin/newsletter/issues')
  if (result.ok && !id && result.id) redirect(`/admin/newsletter/issues/${result.id}?created=1`)
  if (result.ok && id) revalidatePath(`/admin/newsletter/issues/${id}`)
  return toState(result)
}

export async function deleteIssueAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  const result = await deleteDraftIssue(user, str(formData, 'id'))
  if (result.ok) {
    revalidatePath('/admin/newsletter/issues')
    redirect('/admin/newsletter/issues?deleted=1')
  }
  return toState(result)
}

export async function sendTestIssueAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:manage')
  if (!isEmailConfigured()) return { ok: false, errors: [EMAIL_NOT_CONFIGURED_MESSAGE] }
  return toState(await sendTestIssue(user, str(formData, 'id')))
}

export async function sendIssueAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const user = await requireUser('newsletter:send')
  const id = str(formData, 'id')
  const result = await sendIssue(user, id)
  revalidatePath('/admin/newsletter/issues')
  revalidatePath(`/admin/newsletter/issues/${id}`)
  return toState(result)
}
