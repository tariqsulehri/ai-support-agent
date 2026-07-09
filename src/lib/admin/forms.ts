export function formText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
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
