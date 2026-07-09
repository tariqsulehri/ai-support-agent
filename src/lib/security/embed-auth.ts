import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHeaders, getDefaultTenant } from '@/lib/tenants/registry'
import { env } from '@/lib/config/env'
import type { TenantConfig } from '@/lib/tenants/types'
import { originFromUrl, verifyEmbedSessionToken } from './embed-session'

export function isEmbedAuthEnabled(): boolean {
  return env.EMBED_AUTH_ENABLED === 'true'
}

function searchParamFromUrl(value: string | null | undefined, key: string): string | undefined {
  if (!value) return undefined

  try {
    return new URL(value).searchParams.get(key)?.trim() || undefined
  } catch {
    return undefined
  }
}

function headersFromRequest(req: NextRequest) {
  const referer = req.headers.get('referer') ?? undefined
  const parentUrl = (req.headers.get('x-embed-parent') ?? referer) ?? undefined

  return {
    tenantId:     req.headers.get('x-embed-tenant')  ?? searchParamFromUrl(referer, 'tenant'),
    token:        req.headers.get('x-embed-token')   ?? searchParamFromUrl(referer, 'token'),
    sessionToken: req.headers.get('x-embed-session') ?? searchParamFromUrl(referer, 'session'),
    apiKey:       req.headers.get('x-api-key')        ?? undefined,
    parentUrl,
  }
}

async function tenantFromEmbedSession(
  sessionToken: string | undefined,
  parentUrl: string | undefined
): Promise<TenantConfig | null> {
  const session = verifyEmbedSessionToken(sessionToken)
  if (!session) return null

  const parentOrigin = originFromUrl(parentUrl)
  if (parentOrigin && parentOrigin !== session.origin) return null

  const tenant = await resolveTenantFromHeaders({
    tenantId: session.tenantId,
    parentUrl: session.origin,
  }, { enforceToken: false })

  return tenant?.id === session.tenantId ? tenant : null
}

/**
 * Guards a route when EMBED_AUTH_ENABLED=true.
 * Returns a 401 response on failure, null on success.
 */
export async function requireEmbedApiAuth(req: NextRequest): Promise<NextResponse | null> {
  const headers = headersFromRequest(req)

  if (!isEmbedAuthEnabled()) {
    if (headers.tenantId && !(await resolveTenantFromHeaders(headers, { enforceToken: false }))) {
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
    }
    return null
  }

  const sessionTenant = await tenantFromEmbedSession(headers.sessionToken, headers.parentUrl)
  if (sessionTenant) return null

  const tenant = await resolveTenantFromHeaders(headers)
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Validates URL query params (tenant + token) used by the /voice iframe page.
 * Returns { ok: true } when auth is disabled or credentials match.
 */
export async function validateEmbedQuery(
  tenantId: string | undefined,
  token: string | undefined,
  sessionToken?: string | undefined
): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmbedAuthEnabled()) return { ok: true }

  const sessionTenant = await tenantFromEmbedSession(sessionToken, undefined)
  if (sessionTenant && (!tenantId || sessionTenant.id === tenantId)) return { ok: true }

  const tenant = await resolveTenantFromHeaders({ tenantId, token })
  if (!tenant) return { ok: false, reason: 'Invalid tenant credentials' }
  return { ok: true }
}

/**
 * Resolves the tenant for a request.
 * When auth is disabled falls back to the first tenant in tenants.json.
 * Throws if no tenant can be resolved at all (misconfigured deployment).
 */
export async function getTenantFromRequest(req: NextRequest): Promise<TenantConfig> {
  const headers = headersFromRequest(req)
  const authEnabled = isEmbedAuthEnabled()
  const unauthenticatedHeaders = {
    tenantId: headers.tenantId,
    token: headers.token,
    apiKey: headers.apiKey,
    parentUrl: headers.parentUrl,
  }

  const sessionTenant = await tenantFromEmbedSession(headers.sessionToken, headers.parentUrl)
  if (sessionTenant) return sessionTenant

  const tenant =
    (await resolveTenantFromHeaders(authEnabled ? headers : unauthenticatedHeaders, { enforceToken: authEnabled })) ??
    (await getDefaultTenant())

  if (!tenant) {
    throw new Error('[embed-auth] No tenant resolved and tenants.json is empty.')
  }

  return tenant
}
