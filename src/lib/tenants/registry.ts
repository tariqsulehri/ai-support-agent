import type { TenantConfig } from './types'
import {
  getDbAllTenants,
  getDbDefaultTenant,
  getDbTenantByApiKey,
  getDbTenantByDomain,
  getDbTenantById,
  getDbTenantByPublicId,
  validateDbTenantToken,
} from './db-registry'
import {
  getJsonAllTenants,
  getJsonDefaultTenant,
  getJsonTenantByApiKey,
  getJsonTenantByDomain,
  getJsonTenantById,
  resolveJsonTenantFromHeaders,
} from './json-registry'

const DEFAULT_TENANT_ID = 'health'

function logJsonFallback(reason: string, context: Record<string, string | undefined> = {}): void {
  console.info('[tenants] using json fallback', { reason, ...context })
}

// ── Lookups ───────────────────────────────────────────────────────────────────
export async function getTenantById(id: string): Promise<TenantConfig | null> {
  const dbResult = await getDbTenantById(id)
  if (dbResult.tenant || dbResult.blocked) return dbResult.tenant

  const fallback = getJsonTenantById(id)
  if (fallback) logJsonFallback(dbResult.reason ?? 'tenant not found in database', { tenantId: id })
  return fallback
}

export async function getTenantByPublicId(publicId: string): Promise<TenantConfig | null> {
  const dbResult = await getDbTenantByPublicId(publicId)
  return dbResult.tenant
}

export async function getTenantByApiKey(key: string): Promise<TenantConfig | null> {
  const dbResult = await getDbTenantByApiKey(key)
  if (dbResult.tenant || dbResult.blocked) return dbResult.tenant

  const fallback = getJsonTenantByApiKey(key)
  if (fallback) logJsonFallback(dbResult.reason ?? 'api key not found in database')
  return fallback
}

export async function getTenantByDomain(url: string): Promise<TenantConfig | null> {
  const dbResult = await getDbTenantByDomain(url)
  if (dbResult.tenant || dbResult.blocked) return dbResult.tenant

  const fallback = getJsonTenantByDomain(url)
  if (fallback) logJsonFallback(dbResult.reason ?? 'domain not found in database', { parentUrl: url })
  return fallback
}

export async function getDefaultTenant(): Promise<TenantConfig | null> {
  const tenant = await getDbDefaultTenant(DEFAULT_TENANT_ID)
  if (tenant) return tenant

  const fallback = getJsonDefaultTenant(DEFAULT_TENANT_ID)
  if (fallback) logJsonFallback('default tenant not found in database')
  return fallback
}

export async function getAllTenants(): Promise<TenantConfig[]> {
  const dbTenants = await getDbAllTenants()
  if (dbTenants.length > 0) return dbTenants

  logJsonFallback('no active database tenants found')
  return getJsonAllTenants()
}

// ── Resolution (header-agnostic — caller extracts values) ─────────────────────
export interface ResolutionHeaders {
  tenantId?:  string
  token?:     string
  apiKey?:    string
  parentUrl?: string // Referer or x-embed-parent
}

export interface ResolutionOptions {
  enforceToken?: boolean
}

/**
 * Resolves a tenant from request-level credentials.
 * Priority: id+token  →  apiKey  →  domain
 * Returns null if no match — caller decides 401 vs. default fallback.
 */
export async function resolveTenantFromHeaders(
  h: ResolutionHeaders,
  options: ResolutionOptions = {}
): Promise<TenantConfig | null> {
  const enforceToken = options.enforceToken ?? true

  // 1. Explicit tenant id + optional token
  if (h.tenantId) {
    const dbResult = enforceToken
      ? await validateDbTenantToken(h.tenantId, h.token)
      : await getDbTenantById(h.tenantId)

    if (dbResult.tenant || dbResult.blocked || dbResult.source === 'database') {
      return dbResult.tenant
    }

    const fallback = resolveJsonTenantFromHeaders(h, options)
    if (fallback) logJsonFallback(dbResult.reason ?? 'tenant headers not found in database', { tenantId: h.tenantId })
    return fallback
  }

  // 2. API key
  if (h.apiKey) {
    return getTenantByApiKey(h.apiKey)
  }

  // 3. Domain / referrer
  if (h.parentUrl) {
    const found = await getTenantByDomain(h.parentUrl)
    if (found) return found
  }

  return null
}
