import { NextRequest, NextResponse } from 'next/server'
import { isEmbedAuthEnabled } from '@/lib/security/embed-auth'
import { createEmbedSessionToken, originFromUrl } from '@/lib/security/embed-session'
import { decryptClientApiKey } from '@/lib/security/client-keys'
import { getTenantByDomain, getTenantById } from '@/lib/tenants/registry'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function json(data: object, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init)
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-embed-tenant, x-embed-token, x-embed-session, x-embed-parent, x-api-key')
  return res
}

export async function POST(req: NextRequest) {
  let body: { tenant?: string; clientKey?: string; clientApiKey?: string; parentUrl?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const rawKey = body.clientKey?.trim() ||
    body.clientApiKey?.trim() ||
    (body as Record<string, string | undefined>)['client-api-key']?.trim() ||
    req.headers.get('x-api-key')?.trim()

  let authenticatedTenantId: string | undefined

  if (rawKey) {
    const decrypted = decryptClientApiKey(rawKey)
    if (!decrypted) {
      return json({ error: 'Invalid or forged client API key: Decryption or authentication failed' }, { status: 401 })
    }

    if (body.tenant && body.tenant.trim() !== decrypted.tid) {
      return json({ error: 'Tenant mismatch: Client API key belongs to a different tenant' }, { status: 403 })
    }

    authenticatedTenantId = decrypted.tid
  }

  const tenantId = authenticatedTenantId ?? body.tenant?.trim()
  const parentUrl = req.headers.get('origin') ??
    req.headers.get('referer') ??
    body.parentUrl
  const origin = originFromUrl(parentUrl)

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

  if (rawKey && tenant.clientApiKey && rawKey !== tenant.clientApiKey) {
    return json({ error: 'Revoked client API key: A newer API key has been issued for this tenant' }, { status: 401 })
  }

  if (isEmbedAuthEnabled()) {
    const domainTenant = await getTenantByDomain(origin)
    const isDomainAllowed =
      domainTenant?.id === tenant.id ||
      (tenant.allowedDomains ?? []).includes(origin) ||
      origin.includes('://localhost') ||
      origin.includes('://127.0.0.1')

    if (!isDomainAllowed) {
      await recordUsageEvent({
        tenantId,
        type: 'embed_session.denied',
        metadata: { origin },
      })
      return json({ error: 'Domain is not verified for this tenant' }, { status: 403 })
    }
  }

  const accessError = requireTenantRuntimeAccess(tenant, 'embed_session')
  if (accessError) return accessError

  await recordUsageEvent({
    tenantId: tenant.id,
    type: 'embed_session.created',
    metadata: { origin },
  })

  return json({
    tenantId: tenant.id,
    session: createEmbedSessionToken({ tenantId: tenant.id, origin }),
    expiresIn: 60 * 30,
  })
}
