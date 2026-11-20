import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'
import { safeRelativePath, resolveRedirectUrl } from '@/lib/auth/redirect'

export const dynamic = 'force-dynamic'

const DEFAULT_NEXT = '/tenant/login'

function safeNext(value: FormDataEntryValue | string | null): string {
  return safeRelativePath(value, DEFAULT_NEXT)
}

function redirectTo(next: string, req: NextRequest): NextResponse {
  const res = NextResponse.redirect(resolveRedirectUrl(next, req), { status: 303 })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Rejects cross-site POSTs (login CSRF / forced logout) when the browser reports an Origin. */
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin || origin === 'null') return !origin
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-site request rejected.' }, { status: 403 })
  }
  const formData = await req.formData().catch(() => null)
  const next = safeNext(formData?.get('next') ?? null)
  await clearSessionCookie()
  return redirectTo(next, req)
}

/**
 * Logging out is a state change, so it is POST-only. A GET (e.g. an <img> or link on a
 * third-party page) must not end the user's session; send them to the login page instead.
 */
export async function GET(req: NextRequest) {
  return redirectTo(DEFAULT_NEXT, req)
}
