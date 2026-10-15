'use client'

import { useActionState } from 'react'
import { loginAction } from '../actions'
import { adminInput, adminLabel } from '@/components/admin/ui'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { ok: false, errors: [] })
  return (
    <form action={formAction} className="space-y-5" data-testid="login-form">
      {state.errors.length > 0 && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {state.errors[0]}
        </p>
      )}
      <div>
        <label htmlFor="email" className={adminLabel}>
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={adminInput} />
      </div>
      <div>
        <label htmlFor="password" className={adminLabel}>
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={adminInput} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-ivory hover:bg-navy-soft disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
