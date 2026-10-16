'use client'

import { useLocale, useTranslations } from 'next-intl'
import { contactAction } from '@/app/actions/public'
import { CONTACT_TOPICS } from '@/lib/constants'
import { contactSchema } from '@/lib/validation'
import { ConsentLabel } from './ConsentLabel'
import { CheckboxField, Honeypot, SelectField, TextAreaField, TextField } from './fields'
import { FormStatus, SubmitButton, SuccessPanel } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

export function ContactForm() {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(contactAction, contactSchema)
  const id = 'contact'

  if (f.state.status === 'success' && f.state.message) return <SuccessPanel message={f.state.message} />

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="contact-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <Honeypot formId={id} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField formId={id} name="name" label={t('labels.name')} required autoComplete="name" maxLength={120} error={f.errors.name} onEdit={f.clearError} />
        <TextField formId={id} name="email" type="email" label={t('labels.email')} required autoComplete="email" error={f.errors.email} onEdit={f.clearError} />
      </div>
      <SelectField
        formId={id}
        name="topic"
        label={t('labels.topic')}
        required
        options={CONTACT_TOPICS.map((value) => ({ value, label: t(`topics.${value}`) }))}
        error={f.errors.topic}
        onEdit={f.clearError}
      />
      <TextAreaField formId={id} name="message" label={t('labels.message')} required hint={t('hints.message')} maxLength={5000} error={f.errors.message} onEdit={f.clearError} />
      <CheckboxField formId={id} name="consent" label={<ConsentLabel />} error={f.errors.consent} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} />
    </form>
  )
}
