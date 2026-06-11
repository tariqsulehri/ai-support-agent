import { NextResponse, type NextRequest } from 'next/server'

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Voice Agent Dashboard"',
    },
  })
}

function isAuthorized(req: NextRequest): boolean {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) return true

  const username = process.env.DASHBOARD_USERNAME || 'admin'
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  try {
    const decoded = atob(header.slice('Basic '.length))
    const separatorIndex = decoded.indexOf(':')
    const suppliedUser = decoded.slice(0, separatorIndex)
    const suppliedPassword = decoded.slice(separatorIndex + 1)
    return suppliedUser === username && suppliedPassword === password
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized()
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
