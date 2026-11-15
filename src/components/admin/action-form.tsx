'use client'

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useFormStatus } from 'react-dom'
import { IDLE_ACTION_RESULT, type ActionResult } from '@/lib/admin/forms'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles'

export { buttonClasses, type ButtonSize, type ButtonVariant }

export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

type ActionFormContextValue = {
  state: ActionResult
  pending: boolean
  dispatch: (formData: FormData) => void
}

const ActionFormContext = createContext<ActionFormContextValue | null>(null)

/**
 * Owns the `useActionState` for one server action so that submit buttons rendered
 * outside the <form> element (e.g. in a panel header via the `form` attribute)
 * and inline status messages can share the same pending/result state.
 */
export function ActionFormProvider({ action, children }: { action: FormAction; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_RESULT)
  const dispatch = (formData: FormData) => startTransition(() => formAction(formData))
  return (
    <ActionFormContext.Provider value={{ state, pending, dispatch }}>
      {children}
    </ActionFormContext.Provider>
  )
}

function InnerActionForm({
  id,
  className,
  children,
  resetOnSuccess,
}: {
  id?: string
  className?: string
  children: ReactNode
  resetOnSuccess?: boolean
}) {
  const ctx = useContext(ActionFormContext)
  if (!ctx) throw new Error('ActionForm must be rendered inside an ActionFormProvider.')
  const { state, pending, dispatch } = ctx
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (resetOnSuccess && state.status === 'success') formRef.current?.reset()
  }, [resetOnSuccess, state.status, state.at])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submitting through onSubmit (instead of `action=`) keeps typed values in
    // place when the server returns a validation error, and lets us drop
    // duplicate submissions while one is in flight.
    event.preventDefault()
    if (pending) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    dispatch(new FormData(event.currentTarget, submitter))
  }

  return (
    <form ref={formRef} id={id} onSubmit={handleSubmit} className={className} aria-busy={pending}>
      {children}
    </form>
  )
}

/**
 * Form bound to a server action returning an ActionResult. Pass `action` for a
 * self-contained form, or omit it to use the nearest ActionFormProvider.
 */
export function ActionForm({
  action,
  ...props
}: {
  action?: FormAction
  id?: string
  className?: string
  children: ReactNode
  resetOnSuccess?: boolean
}) {
  if (action) {
    return (
      <ActionFormProvider action={action}>
        <InnerActionForm {...props} />
      </ActionFormProvider>
    )
  }
  return <InnerActionForm {...props} />
}

export function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Submit button with an immediate pending state (disabled + spinner + aria-busy).
 * Pending comes from, in order: the explicit `pending` prop, the surrounding
 * ActionFormProvider, or React's `useFormStatus` for plain `<form action>`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  form,
  pending: pendingProp,
  disabled,
  className = '',
  name,
  value,
  confirmMessage,
}: {
  children: ReactNode
  pendingLabel?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  form?: string
  pending?: boolean
  disabled?: boolean
  className?: string
  name?: string
  value?: string
  confirmMessage?: string
}) {
  const ctx = useContext(ActionFormContext)
  const status = useFormStatus()
  const pending = pendingProp ?? (ctx ? ctx.pending : status.pending)

  return (
    <button
      type="submit"
      form={form}
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={pending}
      aria-disabled={disabled || pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault()
      }}
      className={buttonClasses(variant, size, className)}
    >
      {pending && <Spinner />}
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  )
}

/** Inline success / error message for the nearest ActionFormProvider. */
export function ActionMessage({ className = '' }: { className?: string }) {
  const ctx = useContext(ActionFormContext)
  const state = ctx?.state
  if (!state || state.status === 'idle' || !state.message) {
    return <p role="status" aria-live="polite" className="sr-only" />
  }
  const isError = state.status === 'error'
  return (
    <p
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
        isError
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      } ${className}`}
    >
      {state.message}
    </p>
  )
}
