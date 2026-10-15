'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { AdminFormState } from '@/app/admin/actions'

type Action = (state: AdminFormState, formData: FormData) => Promise<AdminFormState>

export function AdminForm({
  action,
  children,
  submitLabel = 'Save',
  className = 'space-y-5',
  resetOnSuccess = false,
  encType,
  testId,
}: {
  action: Action
  children: React.ReactNode
  submitLabel?: string
  className?: string
  resetOnSuccess?: boolean
  encType?: 'multipart/form-data'
  testId?: string
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, errors: [] })
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset()
    if (state.ok || state.errors.length) statusRef.current?.focus()
  }, [state, resetOnSuccess])

  return (
    <form ref={formRef} action={formAction} className={className} encType={encType} data-testid={testId}>
      <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
        {state.errors.length > 0 && (
          <div role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
            <ul className="list-disc space-y-1 pl-4">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {state.ok && state.message && (
          <p role="status" className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {state.message}
          </p>
        )}
      </div>
      {children}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center rounded-md bg-navy px-5 text-sm font-semibold text-ivory hover:bg-navy-soft disabled:opacity-60"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

export function ConfirmButton({ label, message, className }: { label: string; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className ?? 'text-sm font-semibold text-error hover:underline'}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {label}
    </button>
  )
}
