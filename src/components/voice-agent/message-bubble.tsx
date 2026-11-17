'use client'

import { memo } from 'react'

// ── Avatar ─────────────────────────────────────────────────────────────────────
export function Avatar({ initials }: { initials: string }) {
  return (
    <div
      aria-hidden="true"
      className="w-7 h-7 rounded-full bg-ms-teal flex items-center justify-center
                 text-ms-on-primary text-xs font-semibold shrink-0 mb-0.5"
    >
      {initials}
    </div>
  )
}

// ── Typing dots ────────────────────────────────────────────────────────────────
export function TypingDots({ label = 'Agent is typing' }: { label?: string }) {
  return (
    <span className="flex items-center gap-1" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-ms-teal animate-typing" />
      ))}
    </span>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
interface BubbleProps {
  role:               'user' | 'assistant'
  content:            string
  agentName:          string
  agentInitials:      string
  showMeta:           boolean
  streaming?:         boolean
  onPlay?:            (text: string) => void
  onStop?:            () => void
  isPlayingThis?:     boolean
  isAutoplayPending?: boolean
}

const SPEAKER_PATH =
  'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.083-1.64.242-2.426.234-.847 1.058-1.354 1.938-1.354h2.24z'

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ms-blue focus-visible:ring-offset-1'

/**
 * Memoized: during streaming only the live bubble's props change, so the rest
 * of the transcript skips re-rendering on every token.
 */
export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  agentName,
  agentInitials,
  showMeta,
  streaming,
  onPlay,
  onStop,
  isPlayingThis,
  isAutoplayPending,
}: BubbleProps) {
  const spacing = showMeta ? 'mt-3' : 'mt-0.5'

  if (role === 'user') {
    return (
      <div className={`flex justify-end msg-enter ${spacing}`}>
        <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-0.5">
          {showMeta && (
            <span className="text-xs text-ms-muted font-medium mr-0.5">You</span>
          )}
          <div className="whitespace-pre-wrap break-words bg-ms-blue rounded-va rounded-br-sm px-4 py-2.5
                          text-sm text-ms-on-primary leading-relaxed shadow-bubble [overflow-wrap:anywhere]">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-2 msg-enter ${spacing}`}>
      {/* Avatar — only on first in a group */}
      {showMeta ? <Avatar initials={agentInitials} /> : <div className="w-7 shrink-0" aria-hidden="true" />}

      <div className="flex min-w-0 max-w-[85%] flex-col gap-0.5">
        {showMeta && (
          <span className="text-xs text-ms-muted font-medium ml-0.5 truncate">{agentName}</span>
        )}
        <div className="whitespace-pre-wrap break-words bg-ms-surface border border-ms-border rounded-va rounded-bl-sm
                        px-4 py-2.5 shadow-bubble text-sm text-ms-text leading-relaxed [overflow-wrap:anywhere]">
          {content}
          {streaming && (
            <span aria-hidden="true" className="inline-block w-0.5 h-3.5 bg-ms-blue ml-0.5 animate-pulse_dot align-middle rounded-sm" />
          )}
        </div>

        {onPlay && !streaming && (
          isPlayingThis ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop audio playback"
              aria-pressed="true"
              className={`self-start inline-flex items-center gap-1.5 text-xs font-medium text-ms-teal bg-ms-teal-lt border border-ms-teal-md px-2 py-0.5 rounded-full transition-colors mt-1 hover:bg-ms-teal-md ${focusRing}`}
            >
              <span className="inline-flex gap-0.5 items-end h-3" aria-hidden="true">
                <span className="w-0.5 h-3 bg-ms-teal animate-pulse" />
                <span className="w-0.5 h-2 bg-ms-teal animate-pulse [animation-delay:150ms]" />
                <span className="w-0.5 h-3 bg-ms-teal animate-pulse [animation-delay:300ms]" />
              </span>
              <span>Playing · Stop</span>
            </button>
          ) : isAutoplayPending ? (
            <button
              type="button"
              onClick={() => onPlay(content)}
              aria-label="Play greeting audio"
              className={`self-start inline-flex items-center gap-1.5 text-xs font-semibold text-ms-on-primary bg-ms-blue hover:bg-ms-blue-dk px-2.5 py-1 rounded-full shadow-sm transition-colors mt-1 ${focusRing}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={SPEAKER_PATH} />
              </svg>
              <span>Tap to play greeting</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPlay(content)}
              aria-label="Listen to message"
              className={`self-start inline-flex items-center gap-1.5 text-xs text-ms-muted hover:text-ms-teal transition-colors px-1.5 py-0.5 rounded hover:bg-ms-surface/60 mt-0.5 ${focusRing}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={SPEAKER_PATH} />
              </svg>
              <span>Listen</span>
            </button>
          )
        )}
      </div>
    </div>
  )
})
