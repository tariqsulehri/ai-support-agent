import type { TenantConfig } from './types'
import type { TenantBundle } from './db-types'

export function tenantBundleToConfig(bundle: TenantBundle): TenantConfig {
  const { tenant, settings, domains } = bundle

  return {
    id: tenant.tenantId,
    allowedDomains: domains.map((domain) => domain.origin),
    openaiApiKeyEnv: settings.openaiApiKeyEnv,
    runtimeSecrets: bundle.runtimeSecrets,
    subscription: tenant.subscription
      ? {
          status: tenant.subscription.status,
          type: tenant.subscription.type,
          billingCycle: tenant.subscription.billingCycle,
          seats: tenant.subscription.seats,
          expiresAt: tenant.subscription.expiresAt,
        }
      : undefined,
    agentName: settings.agentName,
    companyName: settings.companyName || tenant.companyName,
    languageMode: settings.languageMode,
    supportedLanguages: settings.supportedLanguages,
    languageVoices: settings.languageVoices,
    tone: settings.tone,
    ttsProvider: settings.ttsProvider,
    ttsVoice: settings.ttsVoice,
    voiceProfile: settings.voiceProfile,
    services: settings.services,
    customInstructions: settings.customInstructions,
    knowledgeBase: settings.knowledgeBase,
    greeting: settings.greeting,
    emailNotifications: settings.emailNotifications,
  }
}
