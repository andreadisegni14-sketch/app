'use client'

import { useTranslations } from 'next-intl'
import { inputStyles, labelStyles } from '@/components/ui/styles'
import { HONEYPOT_FIELD } from '@/lib/validation'

type BaseProps = {
  formId: string
  name: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  onEdit?: (name: string) => void
}

function describedBy(formId: string, name: string, hint?: string, error?: string) {
  const ids = [hint ? `${formId}-${name}-hint` : null, error ? `${formId}-${name}-error` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

function FieldShell({ formId, name, label, required, hint, error, children }: BaseProps & { children: React.ReactNode }) {
  const t = useTranslations('forms')
  return (
    <div className="space-y-1.5">
      <label htmlFor={`${formId}-${name}`} className={labelStyles}>
        {label}
        {required ? (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-muted">({t('optional')})</span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${formId}-${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${formId}-${name}-error`} className="text-sm font-medium text-error" data-field-error={name}>
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  )
}

export function TextField(
  props: BaseProps & {
    type?: 'text' | 'email' | 'tel' | 'url' | 'number'
    autoComplete?: string
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
    defaultValue?: string
    min?: number
    max?: number
    maxLength?: number
  },
) {
  const { formId, name, required, hint, error, onEdit, type = 'text', ...rest } = props
  return (
    <FieldShell {...props}>
      <input
        id={`${formId}-${name}`}
        name={name}
        type={type}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(formId, name, hint, error)}
        autoComplete={rest.autoComplete}
        inputMode={rest.inputMode}
        defaultValue={rest.defaultValue}
        min={rest.min}
        max={rest.max}
        maxLength={rest.maxLength}
        onInput={() => onEdit?.(name)}
        className={inputStyles}
      />
    </FieldShell>
  )
}

export function TextAreaField(props: BaseProps & { rows?: number; maxLength?: number }) {
  const { formId, name, required, hint, error, onEdit, rows = 5, maxLength } = props
  return (
    <FieldShell {...props}>
      <textarea
        id={`${formId}-${name}`}
        name={name}
        rows={rows}
        maxLength={maxLength}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(formId, name, hint, error)}
        onInput={() => onEdit?.(name)}
        className={`${inputStyles} min-h-32`}
      />
    </FieldShell>
  )
}

export function SelectField(
  props: BaseProps & { options: { value: string; label: string }[]; defaultValue?: string; placeholder?: string },
) {
  const t = useTranslations('forms')
  const { formId, name, required, hint, error, onEdit, options, defaultValue = '', placeholder } = props
  return (
    <FieldShell {...props}>
      <select
        id={`${formId}-${name}`}
        name={name}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(formId, name, hint, error)}
        defaultValue={defaultValue}
        onChange={() => onEdit?.(name)}
        className={inputStyles}
      >
        <option value="" disabled={required}>
          {placeholder ?? t('choose')}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function CheckboxField({
  formId,
  name,
  label,
  error,
  onEdit,
}: {
  formId: string
  name: string
  label: React.ReactNode
  error?: string
  onEdit?: (name: string) => void
}) {
  const t = useTranslations('forms')
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <input
          id={`${formId}-${name}`}
          name={name}
          type="checkbox"
          required
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${formId}-${name}-error` : undefined}
          onChange={() => onEdit?.(name)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-navy"
        />
        <label htmlFor={`${formId}-${name}`} className="text-sm leading-relaxed text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${formId}-${name}-error`} className="text-sm font-medium text-error" data-field-error={name}>
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  )
}

/** Hidden from people and assistive technology; bots that fill every field reveal themselves. */
export function Honeypot({ formId }: { formId: string }) {
  const t = useTranslations('forms')
  return (
    <div className="visually-hidden-honeypot" aria-hidden="true">
      <label htmlFor={`${formId}-${HONEYPOT_FIELD}`}>{t('honeypot')}</label>
      <input id={`${formId}-${HONEYPOT_FIELD}`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
    </div>
  )
}
