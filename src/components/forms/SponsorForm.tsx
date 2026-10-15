'use client'

import { useLocale, useTranslations } from 'next-intl'
import { sponsorAction } from '@/app/actions/public'
import { SPONSOR_PACKAGES } from '@/lib/constants'
import { sponsorSchema } from '@/lib/validation'
import { ConsentLabel } from './ConsentLabel'
import { CheckboxField, Honeypot, SelectField, TextAreaField, TextField } from './fields'
import { FormStatus, SubmitButton, SuccessPanel } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

export function SponsorForm() {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(sponsorAction, sponsorSchema)
  const id = 'sponsor'

  if (f.state.status === 'success' && f.state.message) return <SuccessPanel message={f.state.message} />

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="sponsor-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot formId={id} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField formId={id} name="organizationName" label={t('labels.organizationName')} required autoComplete="organization" error={f.errors.organizationName} onEdit={f.clearError} />
        <TextField formId={id} name="contactName" label={t('labels.contactName')} required autoComplete="name" error={f.errors.contactName} onEdit={f.clearError} />
        <TextField formId={id} name="email" type="email" label={t('labels.email')} required autoComplete="email" error={f.errors.email} onEdit={f.clearError} />
        <TextField formId={id} name="phone" type="tel" label={t('labels.phone')} autoComplete="tel" error={f.errors.phone} onEdit={f.clearError} />
      </div>
      <TextField formId={id} name="website" type="url" label={t('labels.website')} hint={t('hints.website')} autoComplete="url" error={f.errors.website} onEdit={f.clearError} />
      <SelectField
        formId={id}
        name="packageInterest"
        label={t('labels.packageInterest')}
        required
        options={SPONSOR_PACKAGES.map((value) => ({ value, label: t(`sponsorPackages.${value}`) }))}
        error={f.errors.packageInterest}
        onEdit={f.clearError}
      />
      <TextAreaField formId={id} name="message" label={t('labels.message')} required hint={t('hints.message')} maxLength={5000} error={f.errors.message} onEdit={f.clearError} />
      <CheckboxField formId={id} name="consent" label={<ConsentLabel />} error={f.errors.consent} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} />
    </form>
  )
}
