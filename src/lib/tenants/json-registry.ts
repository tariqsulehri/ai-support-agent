import tenantsRaw from '@/data/tenants.json'
import type { TenantConfig } from './types'
import type { ResolutionHeaders, ResolutionOptions } from './registry'
import { normalizeOrigin } from './normalize'

const tenants = tenantsRaw as TenantConfig[]

const byId = new Map<string, TenantConfig>()
const byApiKey = new Map<string, TenantConfig>()
const byDomain = new Map<string, TenantConfig>()

for (const tenant of tenants) {
  byId.set(tenant.id, tenant)

  for (const key of tenant.apiKeys ?? []) {
    byApiKey.set(key, tenant)
  }

  for (const domain of tenant.allowedDomains ?? []) {
    const origin = normalizeOrigin(domain)
    if (origin) byDomain.set(origin, tenant)
  }
}

export function getJsonTenantById(id: string): TenantConfig | null {
  return byId.get(id) ?? null
}

export function getJsonTenantByApiKey(key: string): TenantConfig | null {
  return byApiKey.get(key) ?? null
}

export function getJsonTenantByDomain(url: string): TenantConfig | null {
  const origin = normalizeOrigin(url)
  return origin ? byDomain.get(origin) ?? null : null
}

export function getJsonDefaultTenant(defaultTenantId: string): TenantConfig | null {
  return getJsonTenantById(defaultTenantId) ?? tenants[0] ?? null
}

export function getJsonAllTenants(): TenantConfig[] {
  return tenants
}

export function resolveJsonTenantFromHeaders(
  h: ResolutionHeaders,
  options: ResolutionOptions = {}
): TenantConfig | null {
  const enforceToken = options.enforceToken ?? true

  if (h.tenantId) {
    const tenant = getJsonTenantById(h.tenantId)
    if (!tenant) return null
    if (enforceToken && tenant.token && tenant.token !== h.token) return null
    return tenant
  }

  if (h.apiKey) {
    return getJsonTenantByApiKey(h.apiKey)
  }

  if (h.parentUrl) {
    return getJsonTenantByDomain(h.parentUrl)
  }

  return null
}
