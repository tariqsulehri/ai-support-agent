'use client'

import { useEffect, useRef } from 'react'
import { LeadPanel } from './lead-panel'
import type { CallSummary, LeadData, Message, Phase } from '@/types'

interface Props {
  messages:        Message[]
  partialReply:    string
  agentName:       string
  agentInitials:   string
  phase:           Phase
  lead:            LeadData
  callSummary:     CallSummary | null
  onStartNewChat:  () => void
  onPlayMessage?:  (text: string) => void
  onStopPlayback?: () => void
  currentlyPlayingText?: string | null
  isAutoplayBlocked?: boolean
}

export function TranscriptPanel({
  messages,
  partialReply,
  agentInitials,
  phase,
  lead,
  callSummary,
  onStartNewChat,
  onPlayMessage,
  onStopPlayback,
  currentlyPlayingText,
  isAutoplayBlocked,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partialReply, lead, callSummary])

  const isEmpty = messages.length === 0 && !partialReply

  return (
    <div
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4
                    flex flex-col gap-1 min-h-0 bg-surface-hover"
    >

      {/* Empty state */}
      {isEmpty && phase === 'connecting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
          <div className="w-12 h-12 rounded-full bg-ms-teal-lt flex items-center justify-center">
            <TypingDots />
          </div>
          <p className="text-sm text-ms-muted">Connecting to your agent…</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1]
        const showMeta = !prev || prev.role !== msg.role
        const isFirstAssistant =
          msg.role === 'assistant' && i === messages.findIndex((m) => m.role === 'assistant')
        const isAutoplayPending = Boolean(isAutoplayBlocked && isFirstAssistant)
        const isPlayingThis = currentlyPlayingText === msg.content

        return (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            agentInitials={agentInitials}
            showMeta={showMeta}
            onPlay={onPlayMessage}
            onStop={onStopPlayback}
            isPlayingThis={isPlayingThis}
            isAutoplayPending={isAutoplayPending}
          />
        )
      })}

      {/* Live streaming reply */}
      {partialReply && (
        <MessageBubble
          role="assistant"
          content={partialReply}
          agentInitials={agentInitials}
          showMeta={messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant'}
          streaming
        />
      )}

      {/* Thinking indicator — show when thinking but no partial reply yet */}
      {phase === 'thinking' && !partialReply && (
        <div className="flex items-end gap-2 mt-1">
          <Avatar initials={agentInitials} />
          <div className="bg-white border border-surface-border rounded-2xl rounded-bl-sm
                          px-4 py-3 shadow-bubble flex items-center gap-1">
            <TypingDots />
          </div>
        </div>
      )}

      <LeadPanel lead={lead} callSummary={callSummary} />

      {phase === 'ended' && (
        <CallCompletedPanel
          callSummary={callSummary}
          onStartNewChat={onStartNewChat}
        />
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  )
}

function emailStatus(callSummary: CallSummary | null): {
  label: string
  tone: 'success' | 'muted' | 'warning'
} {
  if (!callSummary) return { label: 'Finalizing call', tone: 'muted' }

  const email = callSummary.email
  if (email?.sent) return { label: 'Email sent', tone: 'success' }
  if (email?.skippedLeadEmail) return { label: 'Email skipped: invalid address', tone: 'warning' }
  if (email?.error) return { label: 'Email not sent', tone: 'warning' }
  return { label: 'Email skipped', tone: 'muted' }
}

function CallCompletedPanel({
  callSummary,
  onStartNewChat,
}: {
  callSummary: CallSummary | null
  onStartNewChat: () => void
}) {
  const status = emailStatus(callSummary)
  const dotClass = {
    success: 'bg-ms-green',
    warning: 'bg-ms-red',
    muted:   'bg-ms-muted',
  }[status.tone]

  return (
    <div className="mt-3 bg-white border border-surface-border rounded-2xl shadow-bubble overflow-hidden msg-enter">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-surface-border">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ms-text">Call completed</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="text-xs text-ms-muted truncate">{status.label}</span>
          </div>
        </div>
        {callSummary && (
          <button
            type="button"
            onClick={onStartNewChat}
            className="shrink-0 rounded-lg bg-ms-teal px-3 py-2 text-xs font-semibold text-white hover:bg-ms-teal-dk transition-colors"
          >
            Start new chat
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-ms-sub leading-relaxed">
          {callSummary
            ? 'Your details and conversation summary are ready above.'
            : 'Please wait while we save the call and handle the email notification.'}
        </p>
      </div>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-ms-teal flex items-center justify-center
                    text-white text-[10px] font-semibold shrink-0 mb-0.5">
      {initials}
    </div>
  )
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="typing-dot w-1.5 h-1.5 rounded-full bg-ms-teal animate-typing"
        />
      ))}
    </span>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
interface BubbleProps {
  role:               'user' | 'assistant'
  content:            string
  agentInitials:      string
  showMeta:           boolean
  streaming?:         boolean
  onPlay?:            (text: string) => void
  onStop?:            () => void
  isPlayingThis?:     boolean
  isAutoplayPending?: boolean
}

function MessageBubble({
  role,
  content,
  agentInitials,
  showMeta,
  streaming,
  onPlay,
  onStop,
  isPlayingThis,
  isAutoplayPending,
}: BubbleProps) {
  const isAgent = role === 'assistant'

  if (isAgent) {
    return (
      <div className={`flex items-end gap-2 msg-enter ${showMeta ? 'mt-3' : 'mt-0.5'}`}>
        {/* Avatar — only on first in a group */}
        {showMeta ? <Avatar initials={agentInitials} /> : <div className="w-7 shrink-0" />}

        <div className="flex min-w-0 max-w-[80%] flex-col gap-0.5">
          {showMeta && (
            <span className="text-[11px] text-ms-muted font-medium ml-0.5">Client Support</span>
          )}
          <div className="whitespace-pre-wrap break-words bg-white border border-surface-border rounded-2xl rounded-bl-sm
                          px-4 py-2.5 shadow-bubble text-sm text-ms-text leading-relaxed [overflow-wrap:anywhere]">
            {content}
            {streaming && (
              <span className="inline-block w-0.5 h-3.5 bg-ms-blue ml-0.5
                               animate-pulse_dot align-middle rounded-sm" />
            )}
          </div>
          {onPlay && !streaming && (
            isPlayingThis ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop audio playback"
                aria-label="Stop audio playback"
                className="self-start inline-flex items-center gap-1.5 text-[11px] font-medium text-ms-teal bg-ms-teal-lt border border-ms-teal-md px-2 py-0.5 rounded-full transition-colors mt-1"
              >
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-3 bg-ms-teal animate-pulse" />
                  <span className="w-0.5 h-2 bg-ms-teal animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-3 bg-ms-teal animate-pulse" style={{ animationDelay: '300ms' }} />
                </span>
                <span>Playing…</span>
              </button>
            ) : isAutoplayPending ? (
              <button
                type="button"
                onClick={() => onPlay(content)}
                title="Click to play greeting voice"
                aria-label="Click to play greeting voice"
                className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-ms-blue hover:bg-ms-blue-dk px-2.5 py-1 rounded-full shadow-sm transition-all duration-200 mt-1 animate-pulse"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.083-1.64.242-2.426.234-.847 1.058-1.354 1.938-1.354h2.24z" />
                </svg>
                <span>Tap to play greeting</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPlay(content)}
                title="Listen to message"
                aria-label="Listen to message"
                className="self-start inline-flex items-center gap-1.5 text-[11px] text-ms-muted hover:text-ms-teal transition-colors px-1.5 py-0.5 rounded hover:bg-white/60 mt-0.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.083-1.64.242-2.426.234-.847 1.058-1.354 1.938-1.354h2.24z" />
                </svg>
                <span>Listen</span>
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  // User bubble
  return (
    <div className={`flex justify-end msg-enter ${showMeta ? 'mt-3' : 'mt-0.5'}`}>
      <div className="flex min-w-0 max-w-[80%] flex-col items-end gap-0.5">
        {showMeta && (
          <span className="text-[11px] text-ms-muted font-medium mr-0.5">You</span>
        )}
        <div className="whitespace-pre-wrap break-words bg-ms-blue rounded-2xl rounded-br-sm px-4 py-2.5
                        text-sm text-white leading-relaxed shadow-bubble [overflow-wrap:anywhere]">
          {content}
        </div>
      </div>
    </div>
  )
}
