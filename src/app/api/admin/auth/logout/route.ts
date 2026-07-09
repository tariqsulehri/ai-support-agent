import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

function safeNext(value: FormDataEntryValue | string | null): string {
  const next = typeof value === 'string' ? value : '/tenant/login'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/tenant/login'
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  const next = safeNext(formData?.get('next') ?? null)
  await clearSessionCookie()
  return NextResponse.redirect(new URL(next, req.url), { status: 303 })
}

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get('next'))
  await clearSessionCookie()
  return NextResponse.redirect(new URL(next, req.url), { status: 303 })
}
