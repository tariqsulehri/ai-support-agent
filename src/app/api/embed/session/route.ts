import { NextRequest, NextResponse } from 'next/server'
import { isEmbedAuthEnabled } from '@/lib/security/embed-auth'
import { createEmbedSessionToken, originFromUrl } from '@/lib/security/embed-session'
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
  let body: { tenant?: string; parentUrl?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 })
  }

  const tenantId = body.tenant?.trim()
  const parentUrl = req.headers.get('origin') ??
    req.headers.get('referer') ??
    body.parentUrl
  const origin = originFromUrl(parentUrl)

  if (!tenantId) {
    return json({ error: 'Tenant is required' }, { status: 400 })
  }
  if (!origin) {
    return json({ error: 'Parent origin is required' }, { status: 400 })
  }

  const tenant = isEmbedAuthEnabled()
    ? await getTenantByDomain(origin)
    : await getTenantById(tenantId)

  if (!tenant || tenant.id !== tenantId) {
    await recordUsageEvent({
      tenantId,
      type: 'embed_session.denied',
      metadata: { origin },
    })
    return json({ error: 'Domain is not verified for this tenant' }, { status: 403 })
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
