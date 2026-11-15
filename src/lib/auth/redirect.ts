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
