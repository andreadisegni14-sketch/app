'use client'

import { useActionState, useCallback, useState } from 'react'
import type { z } from 'zod'
import { formDataToObject, initialFormState, toFieldErrors, type FieldErrors, type FormState } from '@/lib/validation'

type Action = (state: FormState, formData: FormData) => Promise<FormState>

/**
 * Wires a server action to client-side validation with the same Zod schema.
 * Invalid submissions are stopped in the browser; the server re-validates everything regardless.
 */
export function useValidatedForm(action: Action, schema: z.ZodType, booleans: readonly string[] = ['consent']) {
  const [state, formAction, pending] = useActionState(action, initialFormState)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const parsed = schema.safeParse(formDataToObject(new FormData(event.currentTarget), booleans))
      if (!parsed.success) {
        event.preventDefault()
        const errors = toFieldErrors(parsed.error)
        setClientErrors(errors)
        const first = Object.keys(errors)[0]
        const field = first ? event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`) : null
        field?.focus()
        return
      }
      setClientErrors({})
    },
    [schema, booleans],
  )

  const clearError = useCallback((name: string) => {
    // An empty string marks the field as edited, hiding any stale server error until resubmission.
    setClientErrors((current) => (current[name] === '' ? current : { ...current, [name]: '' }))
  }, [])

  const serverErrors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  const errors: FieldErrors = Object.fromEntries(
    Object.entries({ ...serverErrors, ...clientErrors }).filter(([, key]) => key !== ''),
  )
  const showClientSummary = Object.values(clientErrors).some((key) => key !== '')

  return { state, formAction, pending, errors, onSubmit, clearError, showClientSummary }
}
