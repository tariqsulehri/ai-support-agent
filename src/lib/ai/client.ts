import OpenAI from 'openai'
import { env } from '@/lib/config/env'
import { OPENAI_KEY_NOT_CONFIGURED } from '@/lib/tenants/runtime-configuration'
import type { TenantConfig } from '@/lib/tenants/types'

const clients = new Map<string, OpenAI>()

function getApiKey(tenant?: TenantConfig): string {
  if (tenant?.runtimeSecrets?.openaiApiKey) {
    return tenant.runtimeSecrets.openaiApiKey
  }

  if (tenant?.openaiApiKeyEnv) {
    const tenantKey = process.env[tenant.openaiApiKeyEnv]
    if (!tenantKey) {
      throw new Error(OPENAI_KEY_NOT_CONFIGURED)
    }
    return tenantKey
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error(OPENAI_KEY_NOT_CONFIGURED)
  }
  return env.OPENAI_API_KEY
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

  const client = new OpenAI({ apiKey })
  clients.set(apiKey, client)
  return client
}

export function assertOpenAIKeyConfigured(tenant?: TenantConfig): void {
  getApiKey(tenant)
}
