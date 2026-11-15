import OpenAI from 'openai'
import { env } from '@/lib/config/env'
import { OPENAI_KEY_NOT_CONFIGURED } from '@/lib/tenants/runtime-configuration'
import type { TenantConfig } from '@/lib/tenants/types'

// One client per distinct API key (clients hold connection pools). Bounded so
// rotated keys do not accumulate forever.
const clients = new Map<string, OpenAI>()
const MAX_CACHED_CLIENTS = 100

function getApiKey(tenant?: TenantConfig): string {
  // If a tenant is provided, the API key must be derived from tenant information stored in the database
  if (tenant) {
    if (tenant.runtimeSecrets?.openaiApiKey?.trim()) {
      return tenant.runtimeSecrets.openaiApiKey.trim()
    }

    if (tenant.openaiApiKeyEnv?.trim()) {
      const tenantKey = process.env[tenant.openaiApiKeyEnv.trim()]?.trim()
      if (tenantKey) return tenantKey
    }

    const defaultTenantId = process.env.DEFAULT_TENANT_ID?.trim() || 'ai-scripto'
    if (
      tenant.id === defaultTenantId &&
      process.env.OPENAI_API_KEY?.trim()
    ) {
      return process.env.OPENAI_API_KEY.trim()
    }

    throw new Error(
      `OpenAI API key not configured for tenant "${tenant.companyName || tenant.id}". The key must be stored in the tenant database.`
    )
  }

  // System fallback when no tenant context is provided (e.g., platform scripts)
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim()
  }

  if (env.OPENAI_API_KEY?.trim()) {
    return env.OPENAI_API_KEY.trim()
  }

  throw new Error(OPENAI_KEY_NOT_CONFIGURED)
}

/**
 * Returns an OpenAI client using a server-side key.
 * Priority: encrypted tenant secret → tenant env var → platform env var.
 * Raw keys must never live in JSON, URLs, headers, or client responses.
 */
export function getOpenAIClient(tenant?: TenantConfig): OpenAI {
  const apiKey = getApiKey(tenant)
  const cached = clients.get(apiKey)
  if (cached) return cached

  const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 2 })
  if (clients.size >= MAX_CACHED_CLIENTS) {
    const oldest = clients.keys().next().value
    if (oldest !== undefined) clients.delete(oldest)
  }
  clients.set(apiKey, client)
  return client
}

export function assertOpenAIKeyConfigured(tenant?: TenantConfig): void {
  getApiKey(tenant)
}

/**
 * Ensures the default tenant OpenAI key is bootstrapped from the database into the
 * environment if not already present, then returns an OpenAI client.
 */
export async function ensureOpenAIClient(tenant?: TenantConfig): Promise<OpenAI> {
  if (!process.env.OPENAI_API_KEY?.trim() && !tenant?.runtimeSecrets?.openaiApiKey?.trim()) {
    const { bootstrapDefaultTenantOpenAIKey } = await import('@/lib/tenants/bootstrap')
    await bootstrapDefaultTenantOpenAIKey()
  }
  return getOpenAIClient(tenant)
}
