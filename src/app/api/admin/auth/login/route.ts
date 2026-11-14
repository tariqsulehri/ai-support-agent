import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth/session'
import { authenticateUser } from '@/lib/auth/users'
import type { AuthUserRecord } from '@/lib/auth/types'
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from '@/lib/auth/rate-limiter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LoginScope = 'platform' | 'tenant'

function loginScope(value: FormDataEntryValue | null): LoginScope {
  return value === 'tenant' ? 'tenant' : 'platform'
}

function loginPath(scope: LoginScope): string {
  return scope === 'tenant' ? '/tenant/login' : '/admin/login'
}

function defaultNext(scope: LoginScope): string {
  return scope === 'tenant' ? '/dashboard' : '/admin/tenants'
}

function safeNext(value: FormDataEntryValue | null, scope: LoginScope): string {
  const fallback = defaultNext(scope)
  const next = typeof value === 'string' ? value : fallback
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

function canUseLoginScope(user: AuthUserRecord, scope: LoginScope): boolean {
  return scope === 'platform'
    ? user.role === 'platform_admin'
    : user.role !== 'platform_admin'
}

export async function POST(req: NextRequest) {
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'

  const formData = await req.formData()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const scope = loginScope(formData.get('scope'))
  const next = safeNext(formData.get('next'), scope)

  // Rate limit check before costly scrypt password verification
  const rateLimit = checkLoginRateLimit(clientIp, email)
  if (!rateLimit.allowed) {
    const url = new URL(loginPath(scope), req.url)
    url.searchParams.set('error', 'rate_limit')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url, { status: 303 })
  }

  const user = await authenticateUser(email, password)
  if (!user || !canUseLoginScope(user, scope)) {
    recordFailedLogin(clientIp, email)
    const url = new URL(loginPath(scope), req.url)
    url.searchParams.set('error', user ? 'role' : 'invalid')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url, { status: 303 })
  }

  resetLoginRateLimit(clientIp, email)

  await setSessionCookie({
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  return NextResponse.redirect(new URL(next, req.url), { status: 303 })
}
