import type { NextConfig } from 'next'
import path from 'path'

// Parent sites allowed to frame the /voice embed when ALLOWED_FRAME_ANCESTORS is not set.
const DEFAULT_FRAME_ANCESTORS = [
  "'self'",
  'https://ai-script-web-site.vercel.app',
  'https://www.aiscripto.com',
  'https://aiscripto.com',
  'https://pos-web-2026.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
]

/**
 * ALLOWED_FRAME_ANCESTORS: comma-separated list of origins (or CSP source
 * expressions such as 'self') allowed to embed /voice. Falls back to the
 * built-in list above when unset/empty.
 */
function buildFrameAncestors(): string {
  const raw = process.env.ALLOWED_FRAME_ANCESTORS?.trim()
  const sources = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        // Drop anything that could break out of the CSP directive.
        .filter((origin) => origin && !/[;,\s]/.test(origin))
    : []
  return (sources.length > 0 ? sources : DEFAULT_FRAME_ANCESTORS).join(' ')
}

const frameAncestors = buildFrameAncestors()

// Public, tenant-embed API endpoints are called cross-origin (the agent.js loader
// on customer sites calls /api/embed/session). These keep wildcard CORS; they
// authenticate with embed tokens / client keys / signed sessions, never cookies.
// Admin and dashboard APIs (cookie-authenticated) deliberately get no CORS headers.
const EMBED_CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization, x-embed-tenant, x-embed-token, x-embed-session, x-embed-parent, x-api-key',
  },
]

const BASELINE_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Baseline hardening for every response.
        source: '/:path*',
        headers: BASELINE_SECURITY_HEADERS,
      },
      {
        // Everything except the /voice embed may only be framed by this app
        // itself (clickjacking protection for /dashboard, /admin, login pages).
        source: '/((?!voice(?:/|$)).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Streaming-friendly defaults for all API routes (no CORS here).
        source: '/api/:path*',
        headers: [
          // Prevent Cloudflare / nginx from buffering SSE streams
          { key: 'X-Accel-Buffering', value: 'no' },
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
        ],
      },
      {
        source: '/api/:route(chat|speak|transcribe|summarize|conversation|config)',
        headers: EMBED_CORS_HEADERS,
      },
      {
        source: '/api/embed/:path*',
        headers: EMBED_CORS_HEADERS,
      },
      {
        // Allow embedding the voice page in approved parent sites.
        source: '/voice',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestors}` },
          { key: 'Permissions-Policy', value: 'microphone=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
