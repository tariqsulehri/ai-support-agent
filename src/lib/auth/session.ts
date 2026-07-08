import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { env } from '@/lib/config/env'
import { getAuthUserById } from './users'
import { SESSION_COOKIE_NAME, type AuthSession, type DashboardAccessScope } from './types'

const SESSION_TTL_SECONDS = 60 * 60 * 8

function authSecret(): string {
  const secret = env.AUTH_SECRET ?? env.PLATFORM_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET or PLATFORM_ENCRYPTION_KEY must be at least 32 characters for sessions.')
  }
  return secret
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function unbase64url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function createSessionToken(input: Omit<AuthSession, 'exp'>): string {
  const payload = base64url(JSON.stringify({
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }))
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): AuthSession | null {
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null

  try {
    const parsed = JSON.parse(unbase64url(payload)) as AuthSession
    if (!parsed.userId || !parsed.email || !parsed.role || !parsed.exp) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
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
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(session), {
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
