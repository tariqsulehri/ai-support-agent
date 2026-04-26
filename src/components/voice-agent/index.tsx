'use client'

import { useVoiceAgent } from '@/hooks/use-voice-agent'
import { StatusIndicator } from './status-indicator'
import { TranscriptPanel }  from './transcript-panel'
import { MicButton }        from './mic-button'
import { SettingsBar }      from './settings-bar'
import { TextInput }        from './text-input'
import { LeadPanel }        from './lead-panel'

/**
 * Top-level voice agent UI.
 * Orchestrated entirely by useVoiceAgent — this component is pure presentation.
 */
export function VoiceAgent() {
  const {
    phase,
    transcript,
    partialReply,
    error,
    isRecording,
    hasSpeech,
    language,
    voice,
    leadData,
    callSummary,
    setVoice,
    toggleMic,
    sendText,
  } = useVoiceAgent()

  return (
    <div className="flex flex-col items-center w-full max-w-xl gap-5 px-4 py-6">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-100">
          Tariq &mdash; Support Agent Voice Assistant
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          AI-powered sales &amp; support agent
        </p>
      </header>

      {/* Status */}
      <StatusIndicator phase={phase} />

      {/* Error banner */}
      {error && phase === 'error' && (
        <div className="w-full bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Transcript */}
      <TranscriptPanel messages={transcript} partialReply={partialReply} />

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        <MicButton phase={phase} isRecording={isRecording} onClick={toggleMic} />
        <p className="text-xs text-gray-600">
          {isRecording
            ? hasSpeech
              ? 'Listening — pause to send'
              : 'Ready — go ahead and speak…'
            : phase === 'speaking'
            ? 'Click to interrupt'
            : 'Click mic to speak'}
        </p>
      </div>

      {/* Text input */}
      <TextInput phase={phase} onSend={sendText} />

      {/* Lead data */}
      <LeadPanel lead={leadData} callSummary={callSummary} />

      {/* Settings */}
      <SettingsBar language={language} voice={voice} onVoice={setVoice} />
    </div>
  )
}
