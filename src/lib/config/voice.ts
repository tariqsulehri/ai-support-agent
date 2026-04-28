import type { TenantConfig } from '@/lib/tenants/types'
import type { OpenAIVoice } from '@/types'

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
