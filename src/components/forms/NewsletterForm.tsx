'use client'

import { useId } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { newsletterSubscribeAction } from '@/app/actions/public'
import { Link } from '@/i18n/navigation'
import { buttonStyles, inputStyles } from '@/components/ui/styles'
import { newsletterSubscribeSchema, type NewsletterSource } from '@/lib/validation'
import { CheckboxField, Honeypot, TextField } from './fields'
import { FormStatus, SubmitButton, SuccessPanel } from './FormShell'
import { useValidatedForm } from './useValidatedForm'

function NewsletterConsent() {
  const t = useTranslations('forms.newsletter')
  return (
    <>
      {t.rich('consent', {
        privacy: (chunks) => (
          <Link href="/privacy" className="link-underline font-medium" target="_blank">
            {chunks}
          </Link>
        ),
      })}
    </>
  )
}

/** Full-width form for the /newsletter page (light background, shared field components). */
export function NewsletterForm({ source = 'newsletter-page' }: { source?: NewsletterSource }) {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(newsletterSubscribeAction, newsletterSubscribeSchema)
  const id = 'newsletter'

  if (f.state.status === 'success' && f.state.message) return <SuccessPanel message={f.state.message} />

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-6" data-testid="newsletter-form">
      <FormStatus state={f.state} showClientSummary={f.showClientSummary} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      <Honeypot formId={id} />
      <TextField formId={id} name="email" type="email" label={t('labels.email')} required autoComplete="email" error={f.errors.email} onEdit={f.clearError} />
      <CheckboxField formId={id} name="consent" label={<NewsletterConsent />} error={f.errors.consent} onEdit={f.clearError} />
      <SubmitButton pending={f.pending} label={t('newsletter.submit')} />
    </form>
  )
}

/** Compact form for the dark site footer. */
export function FooterNewsletterForm() {
  const t = useTranslations('forms')
  const locale = useLocale()
  const f = useValidatedForm(newsletterSubscribeAction, newsletterSubscribeSchema)
  const id = `footer-newsletter-${useId().replace(/:/g, '')}`
  const message = f.showClientSummary ? 'fixErrors' : f.state.status !== 'idle' ? f.state.message : undefined
  const isError = f.showClientSummary || f.state.status === 'error'

  if (f.state.status === 'success' && f.state.message) {
    return (
      <p role="status" className="rounded-md border border-gold/40 bg-ivory/5 px-4 py-3 text-sm leading-relaxed text-ivory" data-testid="footer-newsletter-success">
        {t(`messages.${f.state.message}`)}
      </p>
    )
  }

  return (
    <form action={f.formAction} onSubmit={f.onSubmit} noValidate className="space-y-4" data-testid="footer-newsletter-form">
      {message && (
        <p role={isError ? 'alert' : 'status'} className="rounded-md border border-[#f2b8b3]/50 bg-[#f2b8b3]/10 px-3 py-2 text-sm text-[#f7d4d0]">
          {t(`messages.${message}`)}
        </p>
      )}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value="footer" />
      <Honeypot formId={id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">
            {t('newsletter.emailLabel')}
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required
            placeholder={t('newsletter.emailLabel')}
            aria-invalid={f.errors.email ? true : undefined}
            aria-describedby={f.errors.email ? `${id}-email-error` : undefined}
            onInput={() => f.clearError('email')}
            className={`${inputStyles} border-ivory/30`}
          />
          {f.errors.email && (
            <p id={`${id}-email-error`} className="mt-1.5 text-sm font-medium text-[#f7d4d0]">
              {t(`errors.${f.errors.email}`)}
            </p>
          )}
        </div>
        <button type="submit" className={`${buttonStyles.gold} shrink-0`} disabled={f.pending} aria-disabled={f.pending}>
          {f.pending ? t('sending') : t('newsletter.submit')}
        </button>
      </div>
      <div>
        <div className="flex items-start gap-3">
          <input
            id={`${id}-consent`}
            name="consent"
            type="checkbox"
            required
            aria-required
            aria-invalid={f.errors.consent ? true : undefined}
            aria-describedby={f.errors.consent ? `${id}-consent-error` : undefined}
            onChange={() => f.clearError('consent')}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-ivory/40 accent-gold"
          />
          <label htmlFor={`${id}-consent`} className="text-xs leading-relaxed text-ivory/80 [&_a]:text-ivory">
            <NewsletterConsent />
          </label>
        </div>
        {f.errors.consent && (
          <p id={`${id}-consent-error`} className="mt-1.5 text-sm font-medium text-[#f7d4d0]">
            {t(`errors.${f.errors.consent}`)}
          </p>
        )}
      </div>
    </form>
  )
}
