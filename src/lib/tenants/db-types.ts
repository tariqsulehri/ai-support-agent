import type { EmailNotificationConfig, KBEntry, TenantConfig } from './types'

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'disabled' | 'archived'
export type TenantSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
export type TenantSubscriptionType = 'free' | 'starter' | 'growth' | 'enterprise' | 'custom'
export type TenantBillingCycle = 'monthly' | 'yearly' | 'one_time' | 'custom'
export type TenantDomainVerificationStatus = 'pending' | 'verified' | 'failed'

export interface TenantSubscriptionRecord {
  status: TenantSubscriptionStatus
  type: TenantSubscriptionType
  billingCycle: TenantBillingCycle
  seats?: number
  startedAt?: Date
  expiresAt?: Date
  updatedAt: Date
}

export interface TenantRecord {
  tenantId: string
  publicId: string
  slug: string
  companyName: string
  status: TenantStatus
  subscription?: TenantSubscriptionRecord
  archivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TenantAgentSettingsRecord {
  tenantId: string
  openaiApiKeyEnv?: string
  agentName: string
  companyName: string
  languageMode: TenantConfig['languageMode']
  supportedLanguages?: string[]
  languageVoices?: Record<string, string>
  tone: string
  ttsProvider: TenantConfig['ttsProvider']
  ttsVoice: string
  voiceProfile?: TenantConfig['voiceProfile']
  services: string[]
  customInstructions?: string
  knowledgeBase?: KBEntry[]
  greeting?: string
  emailNotifications?: EmailNotificationConfig
  createdAt: Date
  updatedAt: Date
}

export interface TenantDomainRecord {
  tenantId: string
  origin: string
  status: TenantStatus
  verificationStatus?: TenantDomainVerificationStatus
  verificationToken?: string
  verifiedAt?: Date
  lastVerificationError?: string
  createdAt: Date
  updatedAt: Date
}

export interface TenantEmbedKeyRecord {
  tenantId: string
  tokenHash?: string
  apiKeyHashes: string[]
  status: TenantStatus
  createdAt: Date
  updatedAt: Date
}

export type TenantSecretKind = 'openai_api_key' | 'database_url' | 'smtp_password'

export interface TenantSecretRecord {
  tenantId: string
  kind: TenantSecretKind
  status: TenantStatus
  ciphertext: string
  iv: string
  authTag: string
  algorithm: 'aes-256-gcm'
  keyVersion: number
  valueFingerprint: string
  maskedValue: string
  createdAt: Date
  updatedAt: Date
}

export interface TenantBundle {
  tenant: TenantRecord
  settings: TenantAgentSettingsRecord
  domains: TenantDomainRecord[]
  embedKeys: TenantEmbedKeyRecord[]
  runtimeSecrets?: TenantConfig['runtimeSecrets']
}

export interface TenantLookupResult {
  tenant: TenantConfig | null
  blocked: boolean
  source: 'database' | 'json' | 'none'
  reason?: string
}

export const TENANT_COLLECTIONS = {
  tenants: 'tenants',
  settings: 'tenant_agent_settings',
  domains: 'tenant_domains',
  embedKeys: 'tenant_embed_keys',
  secrets: 'tenant_secrets',
} as const
