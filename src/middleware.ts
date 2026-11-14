import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/types'
import { verifySessionToken } from '@/lib/auth/token'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  if (session) {
    if (req.nextUrl.pathname.startsWith('/admin/tenants')) {
      // Platform admin has full access to all /admin/tenants routes
      if (session.role === 'platform_admin') {
        return NextResponse.next()
      }

      // Check if this is a tenant-specific route: /admin/tenants/:tenantId
      const segments = req.nextUrl.pathname.split('/').filter(Boolean)
      if (segments.length >= 3) {
        const targetTenantId = segments[2]
        // Allow tenant users to access their own tenant configuration
        if (session.tenantId && session.tenantId === targetTenantId) {
          return NextResponse.next()
        }
      }

      // Non-platform admin attempting to access tenant listing or other tenants
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  const isTenantDetail = req.nextUrl.pathname.startsWith('/admin/tenants/')
  url.pathname = isTenantDetail
    ? '/tenant/login'
    : (req.nextUrl.pathname.startsWith('/admin/tenants') ? '/admin/login' : '/tenant/login')
  url.search = ''
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/tenants/:path*'],
}
