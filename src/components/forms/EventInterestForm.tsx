'use client'

import { useLocale, useTranslations } from 'next-intl'
import { eventInterestAction } from '@/app/actions/public'
import { eventInterestSchema } from '@/lib/validation'
import { ConsentLabel } from './ConsentLabel'
import { CheckboxField, Honeypot, TextAreaField, TextField } from './fields'
import { FormStatus, SubmitButton, SuccessPanel } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

export function EventInterestForm({ eventSlug, showPartySize = false }: { eventSlug: string; showPartySize?: boolean }) {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(eventInterestAction, eventInterestSchema)
  const id = `event-${eventSlug}`

  if (f.state.status === 'success' && f.state.message) return <SuccessPanel message={f.state.message} />

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="event-interest-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <Honeypot formId={id} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField formId={id} name="name" label={t('labels.name')} required autoComplete="name" error={f.errors.name} onEdit={f.clearError} />
        <TextField formId={id} name="email" type="email" label={t('labels.email')} required autoComplete="email" error={f.errors.email} onEdit={f.clearError} />
        <TextField formId={id} name="organization" label={t('labels.organization')} autoComplete="organization" error={f.errors.organization} onEdit={f.clearError} />
        {showPartySize && (
          <TextField formId={id} name="partySize" type="number" inputMode="numeric" min={1} max={20} label={t('labels.partySize')} hint={t('hints.partySize')} error={f.errors.partySize} onEdit={f.clearError} />
        )}
      </div>
      <TextAreaField formId={id} name="message" label={t('labels.message')} rows={3} maxLength={2000} error={f.errors.message} onEdit={f.clearError} />
      <CheckboxField formId={id} name="consent" label={<ConsentLabel />} error={f.errors.consent} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} />
    </form>
  )
}
