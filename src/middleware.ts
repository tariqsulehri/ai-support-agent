import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/types'

export function middleware(req: NextRequest) {
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value)
  if (hasSessionCookie) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = req.nextUrl.pathname === '/admin/tenants' || req.nextUrl.pathname === '/admin/tenants/'
    ? '/admin/login'
    : '/tenant/login'
  url.search = ''
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/tenants/:path*'],
}
