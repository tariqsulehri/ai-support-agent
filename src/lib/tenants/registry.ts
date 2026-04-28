import tenantsRaw from '@/data/tenants.json'
import type { TenantConfig } from './types'

// Cast the JSON — validated at startup by the index checks below
const tenants = tenantsRaw as TenantConfig[]

// ── Indexes built once at module load ─────────────────────────────────────────
const byId     = new Map<string, TenantConfig>()
const byApiKey = new Map<string, TenantConfig>()
const byDomain = new Map<string, TenantConfig>() // keyed by URL origin

for (const t of tenants) {
  byId.set(t.id, t)
  for (const k of t.apiKeys ?? [])        byApiKey.set(k, t)
  for (const d of t.allowedDomains ?? []) {
    try { byDomain.set(new URL(d).origin, t) } catch { /* skip malformed */ }
  }
}

// ── Lookups ───────────────────────────────────────────────────────────────────
export function getTenantById(id: string): TenantConfig | null {
  return byId.get(id) ?? null
}

export function getTenantByApiKey(key: string): TenantConfig | null {
  return byApiKey.get(key) ?? null
}

export function getTenantByDomain(url: string): TenantConfig | null {
  try {
    return byDomain.get(new URL(url).origin) ?? null
  } catch {
    return null
  }
}

export function getDefaultTenant(): TenantConfig | null {
  return tenants[0] ?? null
}

export function getAllTenants(): TenantConfig[] {
  return tenants
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
export function resolveTenantFromHeaders(
  h: ResolutionHeaders,
  options: ResolutionOptions = {}
): TenantConfig | null {
  const enforceToken = options.enforceToken ?? true

  // 1. Explicit tenant id + optional token
  if (h.tenantId) {
    const tenant = getTenantById(h.tenantId)
    if (!tenant) return null
    // Only enforce token if the tenant has one configured
    if (enforceToken && tenant.token && tenant.token !== h.token) return null
    return tenant
  }

  // 2. API key
  if (h.apiKey) {
    return getTenantByApiKey(h.apiKey)
  }

  // 3. Domain / referrer
  if (h.parentUrl) {
    const found = getTenantByDomain(h.parentUrl)
    if (found) return found
  }

  return null
}
