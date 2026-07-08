import { getDecryptedTenantSecret } from './secrets'
import type { TenantConfig } from './types'

export const DATABASE_STRING_NOT_CONFIGURED = 'Database string not configured.'
export const OPENAI_KEY_NOT_CONFIGURED = 'OpenAI key not configured.'

export type TenantRuntimeConfigurationCheck = {
  requireDatabase?: boolean
  requireOpenAI?: boolean
}

export class TenantRuntimeConfigurationError extends Error {
  readonly messages: string[]

  constructor(messages: string[]) {
    super(messages.join(' '))
    this.name = 'TenantRuntimeConfigurationError'
    this.messages = messages
  }
}

function hasTenantOpenAIKey(tenant: TenantConfig): boolean {
  if (tenant.runtimeSecrets?.openaiApiKey?.trim()) return true

  if (tenant.openaiApiKeyEnv?.trim()) {
    return Boolean(process.env[tenant.openaiApiKeyEnv]?.trim())
  }

  return false
}

async function hasTenantDatabaseString(tenant: TenantConfig): Promise<boolean> {
  try {
    const databaseUrl = await getDecryptedTenantSecret(tenant.id, 'database_url')
    return Boolean(databaseUrl?.trim())
  } catch (error) {
    console.warn('[tenant-runtime-config] database string check failed', {
      tenantId: tenant.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export async function getTenantRuntimeConfigurationMessages(
  tenant: TenantConfig,
  check: TenantRuntimeConfigurationCheck = {}
): Promise<string[]> {
  const requireDatabase = check.requireDatabase ?? true
  const requireOpenAI = check.requireOpenAI ?? true
  const messages: string[] = []

  if (requireDatabase && !(await hasTenantDatabaseString(tenant))) {
    messages.push(DATABASE_STRING_NOT_CONFIGURED)
  }

  if (requireOpenAI && !hasTenantOpenAIKey(tenant)) {
    messages.push(OPENAI_KEY_NOT_CONFIGURED)
  }

  return messages
}

export async function assertTenantRuntimeConfigured(
  tenant: TenantConfig,
  check?: TenantRuntimeConfigurationCheck
): Promise<void> {
  const messages = await getTenantRuntimeConfigurationMessages(tenant, check)
  if (messages.length > 0) throw new TenantRuntimeConfigurationError(messages)
}
