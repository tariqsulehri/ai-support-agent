import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  await clearSessionCookie()
  return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 })
}

export async function GET(req: NextRequest) {
  await clearSessionCookie()
  return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 })
}
