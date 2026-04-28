import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHeaders, getDefaultTenant } from '@/lib/tenants/registry'
import { env } from '@/lib/config/env'
import type { TenantConfig } from '@/lib/tenants/types'

export function isEmbedAuthEnabled(): boolean {
  return env.EMBED_AUTH_ENABLED === 'true'
}

function headersFromRequest(req: NextRequest) {
  return {
    tenantId:  req.headers.get('x-embed-tenant')  ?? undefined,
    token:     req.headers.get('x-embed-token')   ?? undefined,
    apiKey:    req.headers.get('x-api-key')        ?? undefined,
    parentUrl: (req.headers.get('x-embed-parent') ?? req.headers.get('referer')) ?? undefined,
  }
}

/**
 * Guards a route when EMBED_AUTH_ENABLED=true.
 * Returns a 401 response on failure, null on success.
 */
export function requireEmbedApiAuth(req: NextRequest): NextResponse | null {
  const headers = headersFromRequest(req)

  if (!isEmbedAuthEnabled()) {
    if (headers.tenantId && !resolveTenantFromHeaders(headers, { enforceToken: false })) {
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
    }
    return null
  }

  const tenant = resolveTenantFromHeaders(headers)
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Validates URL query params (tenant + token) used by the /voice iframe page.
 * Returns { ok: true } when auth is disabled or credentials match.
 */
export function validateEmbedQuery(
  tenantId: string | undefined,
  token: string | undefined
): { ok: boolean; reason?: string } {
  if (!isEmbedAuthEnabled()) return { ok: true }

  const tenant = resolveTenantFromHeaders({ tenantId, token })
  if (!tenant) return { ok: false, reason: 'Invalid tenant credentials' }
  return { ok: true }
}

/**
 * Resolves the tenant for a request.
 * When auth is disabled falls back to the first tenant in tenants.json.
 * Throws if no tenant can be resolved at all (misconfigured deployment).
 */
export function getTenantFromRequest(req: NextRequest): TenantConfig {
  const headers = headersFromRequest(req)
  const tenant =
    resolveTenantFromHeaders(headers, { enforceToken: isEmbedAuthEnabled() }) ??
    getDefaultTenant()

  if (!tenant) {
    throw new Error('[embed-auth] No tenant resolved and tenants.json is empty.')
  }
  return tenant
}
