import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/types'
import { verifySessionToken } from '@/lib/auth/token'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  if (session) {
    if (req.nextUrl.pathname.startsWith('/admin/tenants') && session.role !== 'platform_admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  url.pathname = req.nextUrl.pathname.startsWith('/admin/tenants')
    ? '/admin/login'
    : '/tenant/login'
  url.search = ''
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/tenants/:path*'],
}
