'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { LeadPanel } from './lead-panel'
import { CallCompletedPanel } from './call-completed-panel'
import { Avatar, MessageBubble, TypingDots } from './message-bubble'
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

/** Within this many px of the bottom we keep auto-scrolling; further up, the user is reading history. */
const STICKY_THRESHOLD_PX = 80

export const TranscriptPanel = memo(function TranscriptPanel({
  messages,
  partialReply,
  agentName,
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
  const scrollRef     = useRef<HTMLDivElement>(null)
  const stickyRef     = useRef(true)
  const lastCountRef  = useRef(messages.length)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    stickyRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD_PX
  }, [])

  // Auto-scroll once per frame, only if the user hasn't scrolled up. Streaming
  // tokens jump instantly (smooth-scrolling on every token queues dozens of
  // animations and makes the whole widget feel sluggish); new messages glide.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickyRef.current) return
    const isNewMessage = messages.length !== lastCountRef.current
    lastCountRef.current = messages.length
    const frame = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: isNewMessage ? 'smooth' : 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [messages, partialReply, lead, callSummary, phase])

  // Index of the greeting (first assistant message), computed once per change
  // instead of once per bubble.
  const firstAssistantIndex = useMemo(
    () => messages.findIndex((m) => m.role === 'assistant'),
    [messages],
  )

  const isEmpty = messages.length === 0 && !partialReply

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      aria-label="Conversation"
      className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin px-3 sm:px-4 py-4
                 flex flex-col gap-1 min-h-0 bg-ms-surface-3"
    >
      {/* Empty / connecting state */}
      {isEmpty && phase === 'connecting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
          <div className="w-12 h-12 rounded-full bg-ms-teal-lt flex items-center justify-center">
            <TypingDots label="Connecting" />
          </div>
          <p className="text-sm text-ms-muted">Connecting to your agent…</p>
        </div>
      )}

      {isEmpty && (phase === 'idle' || phase === 'error') && (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 py-8 text-center px-6">
          <p className="text-sm font-medium text-ms-text">How can we help?</p>
          <p className="text-xs text-ms-muted">Type a message or tap the mic to talk.</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          agentName={agentName}
          agentInitials={agentInitials}
          showMeta={i === 0 || messages[i - 1].role !== msg.role}
          onPlay={onPlayMessage}
          onStop={onStopPlayback}
          isPlayingThis={msg.role === 'assistant' && currentlyPlayingText === msg.content}
          isAutoplayPending={Boolean(isAutoplayBlocked) && i === firstAssistantIndex}
        />
      ))}

      {/* Live streaming reply */}
      {partialReply && (
        <MessageBubble
          role="assistant"
          content={partialReply}
          agentName={agentName}
          agentInitials={agentInitials}
          showMeta={messages.length === 0 || messages[messages.length - 1].role !== 'assistant'}
          streaming
        />
      )}

      {/* Thinking indicator — show when thinking but no partial reply yet */}
      {phase === 'thinking' && !partialReply && (
        <div className="flex items-end gap-2 mt-3">
          <Avatar initials={agentInitials} />
          <div className="bg-ms-surface border border-ms-border rounded-va rounded-bl-sm
                          px-4 py-3 shadow-bubble flex items-center gap-1">
            <TypingDots />
          </div>
        </div>
      )}

      <LeadPanel lead={lead} callSummary={callSummary} />

      {phase === 'ended' && (
        <CallCompletedPanel callSummary={callSummary} onStartNewChat={onStartNewChat} />
      )}
    </div>
  )
})
