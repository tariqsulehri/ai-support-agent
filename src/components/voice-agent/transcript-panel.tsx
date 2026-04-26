'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/types'

interface Props {
  messages:     Message[]
  partialReply: string   // live-streaming text before sentence is committed
}

export function TranscriptPanel({ messages, partialReply }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partialReply])

  return (
    <div className="w-full max-w-xl flex-1 overflow-y-auto flex flex-col gap-3 pr-1 min-h-[260px] max-h-[50vh] scrollbar-thin scrollbar-thumb-surface-border">
      {messages.map((msg) => (
        <Bubble key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {/* Live streaming reply */}
      {partialReply && (
        <Bubble role="assistant" content={partialReply} streaming />
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ── Bubble ─────────────────────────────────────────────────────────────────────
interface BubbleProps {
  role:      'user' | 'assistant'
  content:   string
  streaming?: boolean
}

function Bubble({ role, content, streaming }: BubbleProps) {
  const isAgent = role === 'assistant'

  return (
    <div className={`flex flex-col max-w-[85%] ${isAgent ? 'self-start' : 'self-end'}`}>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
          isAgent ? 'text-blue-400' : 'text-sky-400'
        }`}
      >
        {isAgent ? 'Tariq' : 'You'}
      </span>
      <div
        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAgent
            ? 'bg-surface-raised rounded-bl-sm text-gray-200'
            : 'bg-[#1a3a5c] rounded-br-sm text-gray-100'
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  )
}
