import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth/session'
import { authenticateUser } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '/dashboard'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  const user = await authenticateUser(email, password)
  if (!user) {
    const url = new URL('/admin/login', req.url)
    url.searchParams.set('error', 'invalid')
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
