'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { FormState } from '@/lib/validation'
import { buttonStyles } from '@/components/ui/styles'

export function FormStatus({ state, showClientSummary }: { state: FormState; showClientSummary: boolean }) {
  const t = useTranslations('forms.messages')
  const statusRef = useRef<HTMLDivElement>(null)
  // Move focus to the message after each server response so screen readers announce it.
  useEffect(() => {
    if (state.status !== 'idle') statusRef.current?.focus()
  }, [state])
  const message = showClientSummary ? 'fixErrors' : state.status !== 'idle' ? state.message : undefined
  const isError = showClientSummary || state.status === 'error'

  return (
    <div ref={statusRef} tabIndex={-1} className="focus:outline-none" data-testid="form-status">
      {message && (
        <p
          role={isError ? 'alert' : 'status'}
          className={`rounded-md border px-4 py-3 text-sm font-medium ${
            isError ? 'border-error/40 bg-error/5 text-error' : 'border-success/40 bg-success/10 text-success'
          }`}
        >
          {t(message)}
        </p>
      )}
    </div>
  )
}

export function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label?: string; pendingLabel?: string }) {
  const t = useTranslations('forms')
  return (
    <button type="submit" className={buttonStyles.primary} disabled={pending} aria-disabled={pending}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
      {pending ? (pendingLabel ?? t('sending')) : (label ?? t('submit'))}
    </button>
  )
}

export function SuccessPanel({ message }: { message: string }) {
  const t = useTranslations('forms.messages')
  return (
    <div role="status" className="rounded-lg border border-success/30 bg-success/10 p-6 text-success" data-testid="form-success">
      <svg viewBox="0 0 24 24" className="mb-3 h-7 w-7" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
      <p className="text-base font-medium leading-relaxed">{t(message)}</p>
    </div>
  )
}
