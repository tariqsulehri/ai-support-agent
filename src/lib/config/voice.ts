import type { TenantConfig } from '@/lib/tenants/types'
import type { OpenAIVoice } from '@/types'

// Default OpenAI voices per language — applied when languageMode is "auto"
// and the user's language is detected. Tenant can override via languageVoices.
const LANGUAGE_DEFAULT_VOICE: Record<string, OpenAIVoice> = {
  urdu:  'echo',
  hindi: 'echo',
}

const OPENAI_VOICE_GENDER: Record<OpenAIVoice, 'female' | 'male' | 'neutral'> = {
  nova:    'female',
  shimmer: 'female',
  onyx:    'male',
  echo:    'male',
  fable:   'male',
  alloy:   'neutral',
}

const DEFAULT_VOICE_BY_GENDER: Record<'female' | 'male' | 'neutral', OpenAIVoice> = {
  female:  'nova',
  male:    'onyx',
  neutral: 'alloy',
}

export function isOpenAIVoice(voice: string): voice is OpenAIVoice {
  return voice in OPENAI_VOICE_GENDER
}

export function getOpenAIVoiceGender(voice: OpenAIVoice): 'female' | 'male' | 'neutral' {
  return OPENAI_VOICE_GENDER[voice]
}

/**
 * Return the TTS voice to use for a specific detected language.
 * Priority: tenant.languageVoices → LANGUAGE_DEFAULT_VOICE → resolveTenantTtsVoice
 */
export function getVoiceForLanguage(language: string | null, tenant: TenantConfig): string {
  if (language) {
    const tenantOverride = tenant.languageVoices?.[language]
    if (tenantOverride) return tenantOverride

    const defaultVoice = LANGUAGE_DEFAULT_VOICE[language]
    if (defaultVoice) return defaultVoice
  }
  return resolveTenantTtsVoice(tenant)
}

export function resolveTenantTtsVoice(tenant: TenantConfig): string {
  if (tenant.ttsProvider !== 'openai') return tenant.ttsVoice

  const configuredVoice = isOpenAIVoice(tenant.ttsVoice) ? tenant.ttsVoice : null
  const preferredGender = tenant.voiceProfile?.gender

  if (!preferredGender) return configuredVoice ?? DEFAULT_VOICE_BY_GENDER.neutral

  if (configuredVoice && getOpenAIVoiceGender(configuredVoice) === preferredGender) {
    return configuredVoice
  }

  return DEFAULT_VOICE_BY_GENDER[preferredGender]
}
