'use client'

import { useState } from 'react'
import { VoiceAgent } from './index'

interface VoiceAgentWidgetProps {
  tenantId?: string
  token?:    string
}

export function VoiceAgentWidget({ tenantId, token }: VoiceAgentWidgetProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Floating Agent Panel ──────────────────────────────────────────── */}
      <div
        aria-hidden={!open}
        className={`
          fixed bottom-6 right-6 z-40
          w-[min(calc(100vw-3rem),440px)]
          max-h-[calc(100dvh-3rem)] overflow-y-auto
          transition-all duration-300 ease-in-out origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
        `}
      >
        <VoiceAgent tenantId={tenantId} token={token} onClose={() => setOpen(false)} />
      </div>

      {!open && (
        <button
          id="agent-fab"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          aria-expanded={open}
          className="
            fixed bottom-6 right-6 z-50
            h-14 max-w-[calc(100vw-3rem)] rounded-full shadow-lg
            bg-ms-blue hover:bg-ms-blue-dk text-white
            flex items-center gap-3 px-4
            transition-all duration-200
            ring-4 ring-ms-blue/20 hover:ring-ms-blue/30
            focus:outline-none focus-visible:ring-4
          "
        >
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
                 stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">Chat with us</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none"
               stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </button>
      )}
    </>
  )
}
