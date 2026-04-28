'use client'

import { useRef } from 'react'
import { useVoiceAgent } from '@/hooks/use-voice-agent'
import { TranscriptPanel }              from './transcript-panel'
import { MicButton }                    from './mic-button'
import { SettingsBar }                  from './settings-bar'
import { TextInput, type TextInputHandle } from './text-input'
import { LeadPanel }                    from './lead-panel'
import { StatusIndicator }              from './status-indicator'

interface VoiceAgentProps {
  tenantId?: string
  token?:    string
  onClose?:  () => void
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function VoiceAgent({ tenantId, token, onClose }: VoiceAgentProps) {
  const textRef = useRef<TextInputHandle>(null)

  const {
    phase, transcript, partialReply, error,
    isRecording,
    language, voice, leadData, callSummary,
    agentName, companyName,
    setVoice, stopPlayback, pressMic, releaseMic, sendText,
  } = useVoiceAgent({ tenantId, token })

  const initials = getInitials(agentName || 'CS')
  const isOnline = phase !== 'connecting' && phase !== 'error' && phase !== 'ended'
  const handleClose = () => {
    stopPlayback()
    onClose?.()
  }

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-4">

      {/* ── Chat window ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden flex flex-col"
           style={{ minHeight: 560, maxHeight: '82vh' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-ms-blue px-5 py-4 flex items-center gap-3 shadow-header shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
                          text-white font-semibold text-sm shrink-0 ring-2 ring-white/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {agentName || 'Support Agent'}
            </p>
            <p className="text-white/70 text-xs truncate">
              {companyName || 'AI Support'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-white/40'}`} />
            <span className="text-white/80 text-xs font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close chat"
                className="
                  ml-1 w-8 h-8 rounded-full flex items-center justify-center
                  text-white/80 hover:text-white hover:bg-white/15
                  transition-colors focus:outline-none focus-visible:ring-2
                  focus-visible:ring-white/70
                "
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
                     stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* ── Contextual status banner ────────────────────────────────────── */}
        <StatusIndicator phase={phase} />

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {error && phase === 'error' && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100
                          flex items-start gap-2 shrink-0">
            <svg className="w-4 h-4 text-ms-red mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* ── Transcript ──────────────────────────────────────────────────── */}
        <TranscriptPanel
          messages={transcript}
          partialReply={partialReply}
          agentName={agentName || 'Agent'}
          agentInitials={initials}
          phase={phase}
        />

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        <div className="border-t border-surface-border bg-white px-4 py-3 shrink-0">

          {/* Push-to-talk hint — shown while recording */}
          {isRecording && (
            <p className="text-[11px] text-ms-red font-medium text-center mb-2 animate-pulse_dot">
              🔴 Recording… release to send
            </p>
          )}

          {/* Row: [TextInput] [Mic] [Send] */}
          <div className="flex items-end gap-2">

            {/* Text input — no send button inside */}
            <TextInput ref={textRef} phase={phase} onSend={sendText} />

            {/* Mic — push-to-talk: hold → record, release → send */}
            <MicButton
              phase={phase}
              isRecording={isRecording}
              onPressDown={pressMic}
              onPressUp={releaseMic}
            />

            {/* Send text message — upward arrow */}
            <button
              type="button"
              onClick={() => textRef.current?.submit()}
              disabled={phase !== 'idle' && phase !== 'error'}
              aria-label="Send message"
              className="
                shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                bg-ms-blue hover:bg-ms-blue-dk
                disabled:bg-surface disabled:cursor-not-allowed
                transition-colors
              "
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
                   stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Settings footer ─────────────────────────────────────────────── */}
        <div className="border-t border-surface-border bg-surface-raised px-4 py-2 shrink-0">
          <SettingsBar language={language} voice={voice} onVoice={setVoice} />
        </div>
      </div>

      {/* ── Lead / Summary panel ────────────────────────────────────────── */}
      <LeadPanel lead={leadData} callSummary={callSummary} />
    </div>
  )
}
