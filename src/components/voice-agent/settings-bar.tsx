'use client'

import { VOICE_OPTIONS } from '@/types'
import type { OpenAIVoice } from '@/types'

interface Props {
  language:  string
  voice:     OpenAIVoice
  onVoice:   (v: OpenAIVoice) => void
}

export function SettingsBar({ language, voice, onVoice }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {/* Language badge — read-only, set in .env.local */}
      <span className="text-[11px] bg-surface-card border border-surface-border px-3 py-1 rounded-full text-gray-500">
        {language}
      </span>

      {/* Voice selector */}
      <select
        value={voice}
        onChange={(e) => onVoice(e.target.value as OpenAIVoice)}
        className="
          text-[11px] bg-surface-card border border-surface-border
          px-3 py-1 rounded-full text-gray-400 cursor-pointer
          focus:outline-none focus:border-blue-500
          appearance-none
        "
        aria-label="Select voice"
      >
        {VOICE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
