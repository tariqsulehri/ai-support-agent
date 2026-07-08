export function normalizeTenantId(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function isActiveTenantStatus(status: string | undefined): boolean {
  return status === 'active'
}
