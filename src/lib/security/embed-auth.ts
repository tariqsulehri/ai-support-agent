import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHeaders, getDefaultTenant, getTenantById } from '@/lib/tenants/registry'
import { env } from '@/lib/config/env'
import type { TenantConfig } from '@/lib/tenants/types'
import { originFromUrl, verifyEmbedSessionToken } from './embed-session'
import { verifySignedEmbedToken } from './embed-tokens'
import { decryptClientApiKey } from './client-keys'

export function isEmbedAuthEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return env.EMBED_AUTH_ENABLED !== 'false'
  }
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
  const query = req.nextUrl.searchParams

  return {
    tenantId:     req.headers.get('x-embed-tenant')  ?? query.get('tenant')?.trim()  ?? searchParamFromUrl(referer, 'tenant'),
    token:        req.headers.get('x-embed-token')   ?? query.get('token')?.trim()   ?? searchParamFromUrl(referer, 'token'),
    sessionToken: req.headers.get('x-embed-session') ?? query.get('session')?.trim() ?? searchParamFromUrl(referer, 'session'),
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

  // Verify signed embed token for cross-tenant tampering
  const signedToken = verifySignedEmbedToken(headers.token)
  if (signedToken && headers.tenantId && signedToken.tenantId !== headers.tenantId) {
    return NextResponse.json({ error: 'Token tenant mismatch: Token was minted for another tenant' }, { status: 403 })
  }

  // Verify encrypted client API key for cross-tenant tampering
  const clientKey = decryptClientApiKey(headers.apiKey)
  if (headers.apiKey && !clientKey) {
    return NextResponse.json({ error: 'Invalid or forged client API key' }, { status: 401 })
  }
  if (clientKey && headers.tenantId && clientKey.tid !== headers.tenantId) {
    return NextResponse.json({ error: 'Client API key tenant mismatch: Key was minted for another tenant' }, { status: 403 })
  }

  // Verify embed session token for cross-tenant tampering
  if (headers.sessionToken) {
    const session = verifyEmbedSessionToken(headers.sessionToken)
    if (session && headers.tenantId && session.tenantId !== headers.tenantId) {
      return NextResponse.json({ error: 'Session token tenant mismatch: Session belongs to another tenant' }, { status: 403 })
    }
  }

  if (!isEmbedAuthEnabled()) {
    if (headers.tenantId && !(await resolveTenantFromHeaders(headers, { enforceToken: false }))) {
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
    }
    return null
  }

  if (signedToken) {
    const tenant = await getTenantById(signedToken.tenantId)
    if (tenant) return null
  }

  if (clientKey) {
    const tenant = await getTenantById(clientKey.tid)
    if (tenant) return null
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
  // Validate signed embed token
  const signedToken = verifySignedEmbedToken(token)
  if (signedToken) {
    if (tenantId && signedToken.tenantId !== tenantId) {
      return { ok: false, reason: 'Token was issued for another tenant' }
    }
    return { ok: true }
  }

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

  // 1. Resolve via signed embed token (encodes tenantId)
  const signedToken = verifySignedEmbedToken(headers.token)
  if (signedToken) {
    if (headers.tenantId && headers.tenantId !== signedToken.tenantId) {
      throw new Error(`[embed-auth] Cross-tenant violation: Token tenant (${signedToken.tenantId}) does not match requested tenant (${headers.tenantId}).`)
    }
    const tenant = await getTenantById(signedToken.tenantId)
    if (tenant) return tenant
  }

  // 2. Resolve via encrypted client API key (server decrypts authentic tenantId)
  const clientKey = decryptClientApiKey(headers.apiKey)
  if (clientKey) {
    if (headers.tenantId && headers.tenantId !== clientKey.tid) {
      throw new Error(`[embed-auth] Cross-tenant violation: Client key tenant (${clientKey.tid}) does not match requested tenant (${headers.tenantId}).`)
    }
    const tenant = await getTenantById(clientKey.tid)
    if (tenant) return tenant
  }

  // 3. Resolve via embed session token (encodes tenantId + origin)
  const sessionTenant = await tenantFromEmbedSession(headers.sessionToken, headers.parentUrl)
  if (sessionTenant) {
    if (headers.tenantId && headers.tenantId !== sessionTenant.id) {
      throw new Error(`[embed-auth] Cross-tenant violation: Session tenant (${sessionTenant.id}) does not match requested tenant (${headers.tenantId}).`)
    }
    return sessionTenant
  }

  const unauthenticatedHeaders = {
    tenantId: headers.tenantId,
    token: headers.token,
    apiKey: headers.apiKey,
    parentUrl: headers.parentUrl,
  }

  const tenant =
    (await resolveTenantFromHeaders(authEnabled ? headers : unauthenticatedHeaders, { enforceToken: authEnabled })) ??
    (await getDefaultTenant())

  if (!tenant) {
    throw new Error('[embed-auth] No tenant resolved and tenants.json is empty.')
  }

  return tenant
}
