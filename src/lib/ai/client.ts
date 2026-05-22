import OpenAI from 'openai'
import { env } from '@/lib/config/env'
import type { TenantConfig } from '@/lib/tenants/types'

const clients = new Map<string, OpenAI>()

function getApiKey(tenant?: TenantConfig): string {
  if (tenant?.openaiApiKeyEnv) {
    const tenantKey = process.env[tenant.openaiApiKeyEnv]
    if (!tenantKey) {
      throw new Error(`No OpenAI API key: set ${tenant.openaiApiKeyEnv} in env.`)
    }
    return tenantKey
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('No OpenAI API key: set OPENAI_API_KEY in env.')
  }
  return env.OPENAI_API_KEY
}

/**
 * Returns an OpenAI client using a server-side env key.
 * Tenant configs may name an env var; raw keys must never live in JSON, URLs, or headers.
 */
export function getOpenAIClient(tenant?: TenantConfig): OpenAI {
  const apiKey = getApiKey(tenant)
  const cached = clients.get(apiKey)
  if (cached) return cached

  const client = new OpenAI({ apiKey })
  clients.set(apiKey, client)
  return client
}

export function assertOpenAIKeyConfigured(tenant?: TenantConfig): void {
  getApiKey(tenant)
}
