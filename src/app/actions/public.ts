'use server'

import { redirect } from 'next/navigation'
import { createDonationCheckout } from '@/lib/server/donations'
import {
  submitContactInquiry,
  submitEventInterest,
  submitSponsorInquiry,
  submitSupportInterest,
} from '@/lib/server/inquiries'
import { getRequestContext } from '@/lib/server/request'
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
