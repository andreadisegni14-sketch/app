'use client'

import { useLocale, useTranslations } from 'next-intl'
import { supportInterestAction } from '@/app/actions/public'
import { SUPPORT_TYPES } from '@/lib/constants'
import { supportInterestSchema } from '@/lib/validation'
import { ConsentLabel } from './ConsentLabel'
import { CheckboxField, Honeypot, SelectField, TextAreaField, TextField } from './fields'
import { FormStatus, SubmitButton, SuccessPanel } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

export function SupportInterestForm() {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(supportInterestAction, supportInterestSchema)
  const id = 'support'

  if (f.state.status === 'success' && f.state.message) return <SuccessPanel message={f.state.message} />

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="support-interest-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot formId={id} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField formId={id} name="name" label={t('labels.name')} required autoComplete="name" error={f.errors.name} onEdit={f.clearError} />
        <TextField formId={id} name="email" type="email" label={t('labels.email')} required autoComplete="email" error={f.errors.email} onEdit={f.clearError} />
      </div>
      <SelectField
        formId={id}
        name="supportType"
        label={t('labels.supportType')}
        required
        options={SUPPORT_TYPES.map((value) => ({ value, label: t(`supportTypes.${value}`) }))}
        error={f.errors.supportType}
        onEdit={f.clearError}
      />
      <TextAreaField formId={id} name="message" label={t('labels.message')} rows={4} maxLength={2000} error={f.errors.message} onEdit={f.clearError} />
      <CheckboxField formId={id} name="consent" label={<ConsentLabel />} error={f.errors.consent} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} />
    </form>
  )
}
