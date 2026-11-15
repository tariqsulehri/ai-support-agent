export function formText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

export function formChecked(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on'
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Result shape returned by admin server actions used with `useActionState`.
 * `at` changes on every completed submission so clients can react to repeats.
 */
export type ActionResult = {
  status: 'idle' | 'success' | 'error'
  message?: string
  at?: number
}

export const IDLE_ACTION_RESULT: ActionResult = { status: 'idle' }

export function actionSuccess(message: string): ActionResult {
  return { status: 'success', message, at: Date.now() }
}

export function actionError(message: string): ActionResult {
  return { status: 'error', message, at: Date.now() }
}

/** First zod-style issue message, falling back to a generic one. */
export function firstIssueMessage(issues: ReadonlyArray<{ message: string }>): string {
  return issues[0]?.message ?? 'Invalid input.'
}
