import type { NextConfig } from 'next'

function buildFrameAncestors(): string {
  const raw = process.env.ALLOWED_FRAME_ANCESTORS?.trim()
  if (!raw) return "'self'"
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .join(' ')
}

const frameAncestors = buildFrameAncestors()

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          // Prevent Cloudflare / nginx from buffering SSE streams
          { key: 'X-Accel-Buffering', value: 'no' },
          { key: 'Cache-Control', value: 'no-cache, no-transform' },

        ],
      },
      {
        // Allow embedding the voice page in approved parent sites.
        source: '/voice',
        headers: [
          // { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestors};` },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://ai-script-web-site.vercel.app https://www.aiscripto.com https://aiscripto.com http://localhost:3000 http://localhost:5173 http://127.0.0.1:5500" },
          { key: 'Permissions-Policy', value: 'microphone=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
