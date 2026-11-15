'use client'

import { memo } from 'react'
import type { OpenAIVoice } from '@/types'
import { VOICE_OPTIONS } from '@/types'

interface Props {
  language: string
  voice:    OpenAIVoice
  /** Reserved for a future voice picker; the bar is currently read-only. */
  onVoice?: (v: OpenAIVoice) => void
}

/** Read-only footer showing the tenant-configured language and voice. */
export const SettingsBar = memo(function SettingsBar({ language, voice }: Props) {
  const voiceLabel = VOICE_OPTIONS.find((option) => option.value === voice)?.label ?? `${voice} voice`

  return (
    <div className="flex items-center gap-2 text-xs text-ms-muted min-w-0">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true"
           stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="truncate"><span className="sr-only">Language: </span>{language}</span>
      <span className="text-surface-border" aria-hidden="true">·</span>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true"
           stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 14m0-14a7 7 0 000 14" />
      </svg>
      <span className="truncate"><span className="sr-only">Voice: </span>{voiceLabel}</span>
    </div>
  )
})
