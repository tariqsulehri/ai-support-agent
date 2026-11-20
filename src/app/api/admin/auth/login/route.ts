import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth/session'
import { authenticateUser } from '@/lib/auth/users'
import type { AuthUserRecord } from '@/lib/auth/types'
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from '@/lib/auth/rate-limiter'
import { safeRelativePath, resolveRedirectUrl } from '@/lib/auth/redirect'
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/password'
import { getClientIp } from '@/lib/api/request-guards'

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
  return safeRelativePath(value, defaultNext(scope))
}

const MAX_EMAIL_LENGTH = 320

function redirectWithError(req: NextRequest, scope: LoginScope, error: string, next: string): NextResponse {
  const url = resolveRedirectUrl(loginPath(scope), req)
  url.searchParams.set('error', error)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url, { status: 303 })
}

function canUseLoginScope(user: AuthUserRecord, scope: LoginScope): boolean {
  return scope === 'platform'
    ? user.role === 'platform_admin'
    : user.role !== 'platform_admin'
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return redirectWithError(req, 'platform', 'invalid', defaultNext('platform'))
  }
  const email = String(formData.get('email') ?? '').trim().slice(0, MAX_EMAIL_LENGTH)
  const password = String(formData.get('password') ?? '')
  const scope = loginScope(formData.get('scope'))
  const next = safeNext(formData.get('next'), scope)

  // Rate limit check before costly scrypt password verification
  const rateLimit = checkLoginRateLimit(clientIp, email)
  if (!rateLimit.allowed) {
    return redirectWithError(req, scope, 'rate_limit', next)
  }

  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    recordFailedLogin(clientIp, email)
    return redirectWithError(req, scope, 'invalid', next)
  }

  let user: AuthUserRecord | null
  try {
    user = await authenticateUser(email, password)
  } catch (err) {
    console.error('[auth] login failed', err instanceof Error ? err.message : err)
    return redirectWithError(req, scope, 'unavailable', next)
  }

  if (!user || !canUseLoginScope(user, scope)) {
    recordFailedLogin(clientIp, email)
    return redirectWithError(req, scope, user ? 'role' : 'invalid', next)
  }

  resetLoginRateLimit(clientIp, email)

  const proto = req.headers.get('x-forwarded-proto') ?? (req.url.startsWith('https') ? 'https' : 'http')
  const isSecure = proto === 'https'

  await setSessionCookie(
    {
      userId: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    { isSecure }
  )

  return NextResponse.redirect(resolveRedirectUrl(next, req), { status: 303 })
}
