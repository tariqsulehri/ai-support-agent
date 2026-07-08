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

export const SESSION_COOKIE_NAME = 'va_session'
