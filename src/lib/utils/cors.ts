/**
 * CORS preflight response for cross-origin API requests.
 * Browsers send OPTIONS before POST/PUT when the request comes from
 * a different origin (e.g. Cloudflare tunnel domain).
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age':       '86400',
    },
  })
}
