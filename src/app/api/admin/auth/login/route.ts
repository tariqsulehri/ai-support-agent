import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth/session'
import { authenticateUser } from '@/lib/auth/users'
import type { AuthUserRecord } from '@/lib/auth/types'

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
  const formData = await req.formData()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const scope = loginScope(formData.get('scope'))
  const next = safeNext(formData.get('next'), scope)

  const user = await authenticateUser(email, password)
  if (!user || !canUseLoginScope(user, scope)) {
    const url = new URL(loginPath(scope), req.url)
    url.searchParams.set('error', user ? 'role' : 'invalid')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url, { status: 303 })
  }

  await setSessionCookie({
    userId: user.userId,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  return NextResponse.redirect(new URL(next, req.url), { status: 303 })
}
