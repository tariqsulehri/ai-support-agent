export interface KBEntry {
  topic: string
  content: string
}

export interface EmailNotificationConfig {
  enabled: boolean
  smtp: {
    service?: string
    host?: string
    port: number
    secure: boolean
    user?: string
    userEnv?: string
    passEnv?: string
  }
  fromName: string
  fromEmail: string
  recipients?: string[]
  sendToLeadEmail?: boolean
}

export type TenantSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
export type TenantSubscriptionType = 'free' | 'starter' | 'growth' | 'enterprise' | 'custom'
export type TenantBillingCycle = 'monthly' | 'yearly' | 'one_time' | 'custom'

export interface TenantRuntimeSubscription {
  status: TenantSubscriptionStatus
  type: TenantSubscriptionType
  billingCycle: TenantBillingCycle
  seats?: number
  expiresAt?: Date | string
}

export interface TenantConfig {
  // ── Identity & Auth ──────────────────────────────────────────────────────────
  id: string
  token?: string           // paired with x-embed-tenant header
  apiKeys?: string[]       // standalone x-api-key auth
  allowedDomains?: string[] // domain-based implicit auth (no token needed)
  openaiApiKeyEnv?: string // env var name containing this tenant's OpenAI key
  runtimeSecrets?: {
    /**
     * Server-only decrypted OpenAI key loaded from tenant_secrets.
     * Never serialize TenantConfig directly into client responses.
     */
    openaiApiKey?: string
    /**
     * Server-only decrypted SMTP password loaded from tenant_secrets.
     * The matching SMTP username and host live in tenant settings.
     */
    smtpPassword?: string
  }
  subscription?: TenantRuntimeSubscription

  // ── Persona ──────────────────────────────────────────────────────────────────
  agentName: string
  companyName: string
  languageMode: 'auto' | string        // "auto" or a specific language e.g. "english"
  supportedLanguages?: string[]        // e.g. ["english", "urdu", "hindi"]
  languageVoices?: Record<string, string> // e.g. { "urdu": "echo", "hindi": "echo" }
  tone: string                         // e.g. "friendly, expert"

  // ── TTS ──────────────────────────────────────────────────────────────────────
  ttsProvider: 'openai' | 'elevenlabs'
  ttsVoice: string
  voiceProfile?: {
    gender: 'female' | 'male' | 'neutral'
    style?: string
  }

  // ── Knowledge ────────────────────────────────────────────────────────────────
  services: string[]
  customInstructions?: string
  knowledgeBase?: KBEntry[]

  // ── Conversation ─────────────────────────────────────────────────────────────
  greeting?: string  // exact first message — bypasses LLM, guaranteed verbatim

  // ── Notifications ────────────────────────────────────────────────────────────
  emailNotifications?: EmailNotificationConfig
}
