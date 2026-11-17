'use client'

import { useCallback, useMemo } from 'react'
import { useVoiceAgent } from '@/hooks/use-voice-agent'
import { TranscriptPanel } from './transcript-panel'
import { MicButton }       from './mic-button'
import { SettingsBar }     from './settings-bar'
import { TextInput }       from './text-input'
import { StatusIndicator } from './status-indicator'

interface VoiceAgentProps {
  tenantId?:    string
  token?:       string
  sessionToken?: string
  onClose?:     () => void
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function VoiceAgent({ tenantId, token, sessionToken, onClose }: VoiceAgentProps) {
  const {
    phase, transcript, partialReply, error,
    isRecording, isAutoplayBlocked, currentlyPlayingText,
    language, voice, leadData, callSummary,
    agentName, companyName,
    setVoice, stopPlayback, pressMic, releaseMic, toggleMic, sendText, startNewChat,
    playMessage,
  } = useVoiceAgent({ tenantId, token, sessionToken })

  const displayName = agentName || 'Agent'
  const initials = useMemo(() => getInitials(displayName) || 'AG', [displayName])
  const isConnecting = phase === 'connecting'
  const isOnline = !isConnecting && phase !== 'error' && phase !== 'ended'
  const statusLabel = isConnecting ? 'Connecting' : phase === 'error' ? 'Issue' : isOnline ? 'Online' : 'Offline'

  const handleClose = useCallback(() => {
    stopPlayback()
    onClose?.()
  }, [onClose, stopPlayback])

  const mic = useMemo(() => (
    <MicButton
      phase={phase}
      isRecording={isRecording}
      onPressDown={pressMic}
      onPressUp={releaseMic}
      onToggle={toggleMic}
    />
  ), [phase, isRecording, pressMic, releaseMic, toggleMic])

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-4">

      {/* ── Chat window ──────────────────────────────────────────────────── */}
      <section
        aria-label={`Chat with ${displayName}`}
        className="bg-ms-surface rounded-va shadow-card overflow-hidden flex flex-col
                   min-h-[min(560px,82dvh)] max-h-[82dvh]"
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-ms-teal px-4 sm:px-5 py-3.5 flex items-center gap-3 shadow-header shrink-0">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-ms-on-primary/20 flex items-center justify-center
                       text-ms-on-primary font-semibold text-sm shrink-0 ring-2 ring-ms-on-primary/30"
          >
            {isConnecting ? '' : initials}
          </div>
          <div className="flex-1 min-w-0">
            {isConnecting ? (
              <>
                <span className="block h-3.5 w-24 rounded bg-ms-on-primary/30 animate-pulse" />
                <span className="mt-1.5 block h-3 w-16 rounded bg-ms-on-primary/20 animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-ms-on-primary font-semibold text-sm leading-tight truncate">{displayName}</p>
                {companyName && <p className="text-ms-on-primary/75 text-xs truncate">{companyName}</p>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : phase === 'error' ? 'bg-amber-300' : 'bg-ms-on-primary/40'}`}
            />
            <span className="text-ms-on-primary/85 text-xs font-medium" role="status">{statusLabel}</span>
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close chat"
                className="
                  ml-1 w-8 h-8 rounded-full flex items-center justify-center
                  text-ms-on-primary/80 hover:text-ms-on-primary hover:bg-ms-on-primary/15 active:bg-ms-on-primary/25
                  transition-colors focus:outline-none focus-visible:ring-2
                  focus-visible:ring-ms-on-primary/70
                "
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true"
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
          <div
            role="alert"
            className="mx-3 sm:mx-4 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100
                       flex items-start gap-2 shrink-0"
          >
            <svg className="w-4 h-4 text-ms-red mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* ── Transcript ──────────────────────────────────────────────────── */}
        <TranscriptPanel
          messages={transcript}
          partialReply={partialReply}
          agentName={displayName}
          agentInitials={initials}
          phase={phase}
          lead={leadData}
          callSummary={callSummary}
          onStartNewChat={startNewChat}
          onPlayMessage={playMessage}
          onStopPlayback={stopPlayback}
          currentlyPlayingText={currentlyPlayingText}
          isAutoplayBlocked={isAutoplayBlocked}
        />

        {/* ── Input bar: [TextInput] [Mic] [Send] ─────────────────────────── */}
        <div className="border-t border-ms-border bg-ms-surface px-3 sm:px-4 py-3 shrink-0">
          <TextInput phase={phase} onSend={sendText} accessory={mic} />
        </div>

        {/* ── Settings footer ─────────────────────────────────────────────── */}
        {!isConnecting && (
          <div className="border-t border-ms-border bg-ms-surface-2 px-3 sm:px-4 py-2 shrink-0">
            <SettingsBar language={language} voice={voice} onVoice={setVoice} />
          </div>
        )}
      </section>
    </div>
  )
}
