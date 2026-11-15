import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isEmbedAuthEnabled } from '@/lib/security/embed-auth'
import { createEmbedSessionToken, originFromUrl } from '@/lib/security/embed-session'
import { decryptClientApiKey } from '@/lib/security/client-keys'
import { getTenantByDomain, getTenantById } from '@/lib/tenants/registry'
import { normalizeOrigin } from '@/lib/tenants/normalize'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import { enforceIpRateLimit } from '@/lib/api/tenant-runtime'
import { background, contentLengthExceeds } from '@/lib/api/request-guards'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 16 * 1024
const MAX_FIELD_CHARS = 2048
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function json(data: object, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init)
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-embed-tenant, x-embed-token, x-embed-session, x-embed-parent, x-api-key')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function boundedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_FIELD_CHARS) return undefined
  return trimmed
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Exact hostname match for local development origins. A substring check such as
 * `origin.includes('://localhost')` would also accept `https://localhost.attacker.com`.
 */
function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const limited = enforceIpRateLimit(req, 'embed_session')
  if (limited) {
    limited.headers.set('Access-Control-Allow-Origin', '*')
    return limited
  }

  if (contentLengthExceeds(req, MAX_BODY_BYTES)) {
    return json({ error: 'Request body too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await req.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    body = {}
  }

  const requestedTenant = boundedString(body.tenant)
  const rawKey = boundedString(body.clientKey) ||
    boundedString(body.clientApiKey) ||
    boundedString(body['client-api-key']) ||
    boundedString(req.headers.get('x-api-key'))

  let authenticatedTenantId: string | undefined

  if (rawKey) {
    const decrypted = decryptClientApiKey(rawKey)
    if (!decrypted) {
      return json({ error: 'Invalid client API key' }, { status: 401 })
    }

    if (requestedTenant && requestedTenant !== decrypted.tid) {
      return json({ error: 'Tenant mismatch: Client API key belongs to a different tenant' }, { status: 403 })
    }

    authenticatedTenantId = decrypted.tid
  }

  const tenantId = authenticatedTenantId ?? requestedTenant
  const parentUrl = req.headers.get('origin') ??
    req.headers.get('referer') ??
    boundedString(body.parentUrl)
  const origin = originFromUrl(parentUrl ?? undefined)

  if (!tenantId) {
    return json({ error: 'Tenant or valid client API key is required' }, { status: 400 })
  }
  if (!origin) {
    return json({ error: 'Parent origin is required' }, { status: 400 })
  }

  const tenant = await getTenantById(tenantId)
  if (!tenant) {
    return json({ error: 'Tenant not found' }, { status: 404 })
  }

  if (rawKey && tenant.clientApiKey && !safeEqual(rawKey, tenant.clientApiKey)) {
    return json({ error: 'Revoked client API key: A newer API key has been issued for this tenant' }, { status: 401 })
  }

  if (isEmbedAuthEnabled()) {
    const allowedOrigins = new Set(
      (tenant.allowedDomains ?? [])
        .map((domain) => normalizeOrigin(domain))
        .filter((value): value is string => Boolean(value))
    )
    let isDomainAllowed = allowedOrigins.has(origin) || isLocalDevelopmentOrigin(origin)
    if (!isDomainAllowed) {
      const domainTenant = await getTenantByDomain(origin)
      isDomainAllowed = domainTenant?.id === tenant.id
    }

    if (!isDomainAllowed) {
      background(recordUsageEvent({
        tenantId: tenant.id,
        type: 'embed_session.denied',
        metadata: { origin },
      }), 'embed-session usage')
      return json({ error: 'Domain is not verified for this tenant' }, { status: 403 })
    }
  }

  const accessError = requireTenantRuntimeAccess(tenant, 'embed_session')
  if (accessError) {
    accessError.headers.set('Access-Control-Allow-Origin', '*')
    return accessError
  }

  background(recordUsageEvent({
    tenantId: tenant.id,
    type: 'embed_session.created',
    metadata: { origin },
  }), 'embed-session usage')

  return json({
    tenantId: tenant.id,
    session: createEmbedSessionToken({ tenantId: tenant.id, origin }),
    expiresIn: 60 * 30,
  })
}
