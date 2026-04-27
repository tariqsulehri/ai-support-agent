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
          fixed bottom-24 right-6 z-40
          transition-all duration-300 ease-in-out origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
        `}
      >
        {/* Close (×) button in top-right of panel */}
        <div className="relative">
          <button
            id="agent-close-btn"
            onClick={() => setOpen(false)}
            aria-label="Close agent"
            className="
              absolute -top-3 -right-3 z-50
              w-7 h-7 rounded-full bg-white shadow-card
              flex items-center justify-center
              text-ms-sub hover:text-ms-text hover:bg-surface-hover
              transition-colors border border-surface-border
            "
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"
                 stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <VoiceAgent tenantId={tenantId} token={token} />
        </div>
      </div>

      {/* ── Floating Action Button (FAB) ──────────────────────────────────── */}
      <button
        id="agent-fab"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Close agent' : 'Open agent'}
        className="
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full shadow-lg
          bg-ms-blue hover:bg-ms-blue-dk
          flex items-center justify-center
          transition-all duration-200
          ring-4 ring-ms-blue/20 hover:ring-ms-blue/30
          focus:outline-none focus-visible:ring-4
        "
      >
        {/* Toggle between chat icon (closed) and × icon (open) */}
        <span
          className={`absolute transition-all duration-200 ${
            open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"
               stroke="white" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>

        <span
          className={`absolute transition-all duration-200 ${
            open ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"
               stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
      </button>
    </>
  )
}
