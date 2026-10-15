export const adminInput =
  'mt-1 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-2 focus:outline-gold-ink'
export const adminLabel = 'block text-sm font-medium text-ink'

export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  hint,
  rows,
  placeholder,
}: {
  label: string
  name: string
  defaultValue?: string | number | null
  type?: string
  required?: boolean
  hint?: string
  rows?: number
  placeholder?: string
}) {
  const id = `f-${name}`
  return (
    <div>
      <label htmlFor={id} className={adminLabel}>
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      {rows ? (
        <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} className={adminInput} />
      ) : (
        <input id={id} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} className={adminInput} />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string
  name: string
  options: readonly { value: string; label: string }[]
  defaultValue?: string | null
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className={adminLabel}>
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ''} required={required} className={adminInput}>
        {!required && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <div className="flex items-start gap-2">
      <input id={`f-${name}`} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-navy" />
      <label htmlFor={`f-${name}`} className="text-sm">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  )
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-5 ${className}`}>
      {title && <h2 className="mb-4 font-sans text-base font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-muted">{children}</p>
}

const STATUS_TONES: Record<string, string> = {
  NEW: 'bg-gold/15 text-gold-ink',
  IN_PROGRESS: 'bg-navy/10 text-navy',
  RESOLVED: 'bg-success/10 text-success',
  ARCHIVED: 'bg-ivory-deep text-muted',
  SPAM: 'bg-error/10 text-error',
  SENT: 'bg-success/10 text-success',
  FAILED: 'bg-error/10 text-error',
  NOT_CONFIGURED: 'bg-ivory-deep text-muted',
  PENDING: 'bg-gold/15 text-gold-ink',
  SUCCEEDED: 'bg-success/10 text-success',
  EXPIRED: 'bg-ivory-deep text-muted',
  REFUNDED: 'bg-error/10 text-error',
  UNRECONCILED: 'bg-gold/15 text-gold-ink',
  RECONCILED: 'bg-success/10 text-success',
  DISCREPANCY: 'bg-error/10 text-error',
}

export function Pill({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide ${STATUS_TONES[value] ?? 'bg-ivory-deep text-ink'}`}>
      {label ?? value.replaceAll('_', ' ')}
    </span>
  )
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      {page > 1 ? (
        <a href={hrefFor(page - 1)} className="font-semibold text-navy hover:underline">
          ← Previous
        </a>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <a href={hrefFor(page + 1)} className="font-semibold text-navy hover:underline">
          Next →
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(date)
}

export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1
}
