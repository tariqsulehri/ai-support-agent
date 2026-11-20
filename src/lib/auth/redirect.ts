import type { NextRequest } from 'next/server'

const REDIRECT_BASE = 'http://redirect.invalid'

/**
 * Returns `value` only when it is a same-origin relative path (a single leading
 * '/', no scheme, no protocol-relative '//' or '/\' prefix, no control
 * characters); otherwise returns `fallback`. Prevents open redirects through
 * `next` parameters, including browser quirks where '\' is treated as '/'.
 */
export function safeRelativePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const candidate = value.trim()
  if (!candidate || candidate.length > 2048) return fallback
  if (!candidate.startsWith('/')) return fallback
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback
  if (candidate.includes('\\')) return fallback
  // Reject control characters (tabs/newlines are stripped by URL parsers and can smuggle '//').
  if (/[\u0000-\u001F\u007F]/.test(candidate)) return fallback

  try {
    const resolved = new URL(candidate, REDIRECT_BASE)
    if (resolved.origin !== REDIRECT_BASE) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}

/**
 * Resolves a redirect target path into an absolute URL using the incoming request's
 * public Host header (or X-Forwarded-Host / X-Forwarded-Proto) rather than internal
 * Docker hostname/port (which defaults to 0.0.0.0:3000 in standalone mode).
 * If the resulting host starts with 0.0.0.0, it is sanitized to localhost to prevent
 * Chromium/macOS ERR_CONNECTION_REFUSED.
 */
export function resolveRedirectUrl(targetPath: string, req: NextRequest): URL {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? (req.url.startsWith('https') ? 'https' : 'http')

  if (host) {
    const cleanHost = host.startsWith('0.0.0.0') ? host.replace('0.0.0.0', 'localhost') : host
    return new URL(targetPath, `${proto}://${cleanHost}`)
  }

  try {
    const fallbackUrl = new URL(targetPath, req.url)
    if (fallbackUrl.hostname === '0.0.0.0') {
      fallbackUrl.hostname = 'localhost'
    }
    return fallbackUrl
  } catch {
    return new URL(targetPath, 'http://localhost:3000')
  }
}

