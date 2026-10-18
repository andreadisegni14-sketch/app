'use server'

import { redirect } from 'next/navigation'
import { createDonationCheckout } from '@/lib/server/donations'
import {
  submitContactInquiry,
  submitEventInterest,
  submitSponsorInquiry,
  submitSupportInterest,
} from '@/lib/server/inquiries'
import { confirmSubscription, subscribeToNewsletter, unsubscribeByToken } from '@/lib/server/newsletter'
import { getRequestContext } from '@/lib/server/request'
import { newsletterPath } from '@/lib/newsletter/privacy'
import { formDataToObject, type FormState } from '@/lib/validation'

type Handler = (raw: Record<string, unknown>, ctx: { ipHash: string }) => Promise<FormState>

async function run(handler: Handler, formData: FormData, booleans: string[]): Promise<FormState> {
  try {
    const ctx = await getRequestContext()
    return await handler(formDataToObject(formData, booleans), ctx)
  } catch (error) {
    console.error('[forms] submission failed', error)
    return { status: 'error', message: 'serverError' }
  }
}

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitContactInquiry, formData, ['consent'])
}

export async function supportInterestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitSupportInterest, formData, ['consent'])
}

export async function sponsorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitSponsorInquiry, formData, ['consent'])
}

export async function eventInterestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitEventInterest, formData, ['consent'])
}

export async function newsletterSubscribeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(subscribeToNewsletter, formData, ['consent'])
}

function formLocale(formData: FormData): 'en' | 'it' {
  return formData.get('locale') === 'it' ? 'it' : 'en'
}

/** POST only: confirmation links are never acted on by a GET, so link scanners cannot confirm anyone. */
export async function confirmNewsletterAction(formData: FormData): Promise<void> {
  const locale = formLocale(formData)
  const token = formData.get('token')
  let outcome: string
  try {
    outcome = await confirmSubscription(token)
  } catch (error) {
    console.error('[newsletter] confirmation failed', error)
    outcome = 'error'
  }
  const base = newsletterPath(locale, '/newsletter/confirm')
  redirect(outcome === 'confirmed' ? `${base}?confirmed=1` : `${base}?token=${encodeURIComponent(typeof token === 'string' ? token : '')}`)
}

/** POST only: the unsubscribe page itself (GET) never changes state. */
export async function unsubscribeNewsletterAction(formData: FormData): Promise<void> {
  const locale = formLocale(formData)
  const token = typeof formData.get('token') === 'string' ? (formData.get('token') as string) : ''
  try {
    await unsubscribeByToken(token)
  } catch (error) {
    console.error('[newsletter] unsubscribe failed', error)
  }
  redirect(`${newsletterPath(locale, '/newsletter/unsubscribe')}?token=${encodeURIComponent(token)}`)
}

export async function donationCheckoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let url: string | null = null
  try {
    const ctx = await getRequestContext()
    const result = await createDonationCheckout(formDataToObject(formData, ['terms']), ctx)
    if (result.status === 'redirect') {
      url = result.url
    } else {
      return result
    }
  } catch (error) {
    console.error('[donations] checkout action failed', error)
    return { status: 'error', message: 'paymentUnavailable' }
  }
  // redirect() throws, so it must run outside the try/catch.
  redirect(url)
}
