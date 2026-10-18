'use client'

import { useActionState } from 'react'
import type { AdminFormState } from '@/app/admin/actions'

type Action = (state: AdminFormState, formData: FormData) => Promise<AdminFormState>

const TONES = {
  default: 'rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy',
  primary: 'inline-flex min-h-10 items-center rounded-md bg-navy px-5 text-sm font-semibold text-ivory hover:bg-navy-soft',
  danger: 'rounded-md border border-error/40 bg-white px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/5',
  link: 'text-xs font-semibold text-navy hover:underline',
} as const

/** A one-button form bound to a server action, showing the action's outcome next to it. */
export function ActionButton({
  action,
  label,
  pendingLabel = 'Working…',
  fields = {},
  confirm,
  tone = 'default',
  testId,
}: {
  action: Action
  label: string
  pendingLabel?: string
  fields?: Record<string, string>
  confirm?: string
  tone?: keyof typeof TONES
  testId?: string
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, errors: [] })
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1" data-testid={testId}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={`${TONES[tone]} disabled:opacity-60`}
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault()
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {state.errors.length > 0 && (
        <p role="alert" className="max-w-xs text-xs text-error">
          {state.errors.join(' ')}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="max-w-xs text-xs text-success">
          {state.message}
        </p>
      )}
    </form>
  )
}
