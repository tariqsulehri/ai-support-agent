import { cookies } from 'next/headers'
import { getAuthUserById } from './users'
import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, readSessionCookie, type AuthSession, type DashboardAccessScope } from './types'
import { createSessionToken, verifySessionToken } from './token'

export { createSessionToken, verifySessionToken }
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  return await verifySessionToken(readSessionCookie(cookieStore))
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

interface SetSessionOptions {
  isSecure?: boolean
}

export async function setSessionCookie(
  session: Omit<AuthSession, 'exp'>,
  options?: SetSessionOptions
): Promise<void> {
  const cookieStore = await cookies()
  const token = await createSessionToken(session)

  // Use HTTPS-only __Host- prefix only when running on HTTPS.
  // Over plain HTTP (e.g. direct IP access like http://161.97.110.121:3060), browsers reject
  // any cookie with Secure or __Host- prefix per RFC 6265bis.
  const isSecure = options?.isSecure ?? (process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'))

  const cookieName = isSecure ? SESSION_COOKIE_NAME : LEGACY_SESSION_COOKIE_NAME
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }

  cookieStore.set(cookieName, token, cookieOptions)

  // Clean up opposite cookie to prevent confusion
  const otherName = isSecure ? LEGACY_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME
  if (cookieStore.get(otherName)) {
    cookieStore.set(otherName, '', { ...cookieOptions, maxAge: 0 })
  }
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 })
  cookieStore.set(LEGACY_SESSION_COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 0 })
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
