'use client'

interface Props {
  language: string
  voice:    string
  onVoice:  (v: string) => void  // kept for API compatibility, voice selection hidden
}

export function SettingsBar({ language }: Props) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-ms-muted">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span>{language}</span>
      <span className="mx-1 text-surface-border">·</span>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 14m0-14a7 7 0 000 14" />
      </svg>
      <span>Male voice</span>
    </div>
  )
}
