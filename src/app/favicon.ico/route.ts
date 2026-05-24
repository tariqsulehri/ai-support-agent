const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#F9B01E"/>
  <path d="M20 32a12 12 0 0 1 24 0v6a6 6 0 0 1-6 6h-4v-8h7v-4a9 9 0 0 0-18 0v4h7v8h-4a6 6 0 0 1-6-6z" fill="#323130"/>
  <path d="M30 18h4v28h-4z" fill="#FEF9EC"/>
</svg>`

export function GET() {
  return new Response(favicon, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
