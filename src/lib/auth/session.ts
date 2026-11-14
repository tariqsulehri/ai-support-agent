import { cookies } from 'next/headers'
import { getAuthUserById } from './users'
import { SESSION_COOKIE_NAME, type AuthSession, type DashboardAccessScope } from './types'
import { createSessionToken, verifySessionToken } from './token'

export { createSessionToken, verifySessionToken }
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  return await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export async function getVerifiedSession(): Promise<AuthSession | null> {
  const session = await getCurrentSession()
  if (!session) return null

  const user = await getAuthUserById(session.userId)
  if (!user) return null

  return {
    ...session,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

export async function setSessionCookie(session: Omit<AuthSession, 'exp'>): Promise<void> {
  const cookieStore = await cookies()
  const token = await createSessionToken(session)
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function dashboardScopeForSession(session: AuthSession): DashboardAccessScope {
  if (session.role === 'platform_admin') return { kind: 'platform' }
  if (!session.tenantId) throw new Error('Tenant user session is missing tenantId.')
  return { kind: 'tenant', tenantId: session.tenantId }
}

export function canMutateDashboard(session: AuthSession): boolean {
  return session.role === 'platform_admin' ||
    session.role === 'tenant_owner' ||
    session.role === 'tenant_admin'
}
