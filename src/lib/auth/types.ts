export type AuthRole = 'platform_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_viewer'
export type AuthUserStatus = 'active' | 'disabled'

export interface AuthUserRecord {
  userId: string
  tenantId: string | null
  email: string
  name: string
  role: AuthRole
  status: AuthUserStatus
  passwordHash: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

export interface AuthSession {
  userId: string
  tenantId: string | null
  email: string
  name: string
  role: AuthRole
  exp: number
}

export type DashboardAccessScope =
  | { kind: 'platform' }
  | { kind: 'tenant'; tenantId: string }

export const AUTH_COLLECTIONS = {
  users: 'tenant_users',
} as const

/** Legacy cookie name, still accepted so existing sessions survive the upgrade. */
export const LEGACY_SESSION_COOKIE_NAME = 'va_session'
/**
 * In production the session lives in a `__Host-` cookie: browsers then require Secure,
 * Path=/ and no Domain, so subdomains cannot set or overwrite it (cookie tossing).
 * `__Host-` cookies need HTTPS, so development keeps the plain name.
 */
export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-va_session' : LEGACY_SESSION_COOKIE_NAME

/** Reads the session token from a cookie store, preferring the hardened cookie. */
export function readSessionCookie(store: { get(name: string): { value: string } | undefined }): string | undefined {
  return store.get(SESSION_COOKIE_NAME)?.value ?? store.get(LEGACY_SESSION_COOKIE_NAME)?.value
}
