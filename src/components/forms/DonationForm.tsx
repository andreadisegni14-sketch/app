'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { donationCheckoutAction } from '@/app/actions/public'
import { DONATION_LIMITS } from '@/lib/constants'
import { formatMoney } from '@/lib/finance'
import { donationCheckoutSchema } from '@/lib/validation'
import { Link } from '@/i18n/navigation'
import { CheckboxField, SelectField } from './fields'
import { FormStatus, SubmitButton } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

export function DonationForm({
  idempotencyKey,
  projects,
  labels,
}: {
  idempotencyKey: string
  projects: { id: string; title: string }[]
  labels: {
    amount: string
    presets: string
    designation: string
    general: string
    terms: string
    termsLink: string
    privacyLink: string
    submit: string
    redirecting: string
  }
}) {
  const locale = useLocale()
  const t = useTranslations('forms')
  const f = useValidatedForm(donationCheckoutAction, donationCheckoutSchema, ['terms'])
  const amountRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const id = 'donation'

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="donation-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">{labels.presets}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DONATION_LIMITS.presetsCents.map((cents) => (
            <button
              key={cents}
              type="button"
              aria-pressed={selected === cents}
              onClick={() => {
                setSelected(cents)
                if (amountRef.current) amountRef.current.value = String(cents / 100)
                f.clearError('amount')
              }}
              className={`min-h-12 rounded-md border text-base font-semibold transition-colors ${
                selected === cents ? 'border-navy bg-navy text-ivory' : 'border-line bg-white text-navy hover:border-navy'
              }`}
            >
              {formatMoney(cents, locale)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-amount`} className="block text-sm font-semibold text-ink">
          {labels.amount}
          <span className="ml-1 text-error" aria-hidden="true">*</span>
        </label>
        <input
          ref={amountRef}
          id={`${id}-amount`}
          name="amount"
          inputMode="decimal"
          autoComplete="transaction-amount"
          required
          aria-required
          aria-invalid={f.errors.amount ? true : undefined}
          aria-describedby={f.errors.amount ? `${id}-amount-error` : undefined}
          onInput={() => {
            setSelected(null)
            f.clearError('amount')
          }}
          className="block w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-base text-ink shadow-sm focus:border-navy aria-[invalid=true]:border-error"
        />
        {f.errors.amount && (
          <p id={`${id}-amount-error`} className="text-sm font-medium text-error">
            {t(`errors.${f.errors.amount}`)}
          </p>
        )}
      </div>

      {projects.length > 0 && (
        <SelectField
          formId={id}
          name="projectId"
          label={labels.designation}
          placeholder={labels.general}
          options={projects.map((p) => ({ value: p.id, label: p.title }))}
          error={f.errors.projectId}
          onEdit={f.clearError}
        />
      )}

      <CheckboxField formId={id} name="terms" label={
          <>
            {labels.terms}{' '}
            <Link href="/terms" target="_blank" className="link-underline text-navy">
              {labels.termsLink}
            </Link>{' '}
            ·{' '}
            <Link href="/privacy" target="_blank" className="link-underline text-navy">
              {labels.privacyLink}
            </Link>
          </>
        } error={f.errors.terms} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} label={labels.submit} pendingLabel={labels.redirecting} />
    </form>
  )
}
