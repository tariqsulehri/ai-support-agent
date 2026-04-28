// ── Lead capture ───────────────────────────────────────────────────────────────
export interface LeadData {
  name:    string | null
  email:   string | null
  phone:   string | null
  company: string | null
  purpose: string | null  // reason for calling / what they need
}

export interface CallSummary {
  summary:   string     // 2-3 sentence narrative of the discussion
  keyPoints: string[]   // 3-5 bullet points
}

// ── Conversation ───────────────────────────────────────────────────────────────
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ChatHistory = Array<{ role: 'user' | 'assistant'; content: string }>

// ── Voice Agent State Machine ──────────────────────────────────────────────────
export type Phase =
  | 'connecting'   // generating opening greeting
  | 'idle'         // ready, not recording
  | 'listening'    // microphone is active
  | 'transcribing' // sending audio to Whisper
  | 'thinking'     // streaming GPT-4o response
  | 'speaking'     // TTS audio is playing
  | 'ended'        // [END_CALL] received
  | 'error'        // unrecoverable error

export interface VoiceAgentState {
  phase:        Phase
  transcript:   Message[]
  partialReply: string   // live-streamed tokens, shown before sentence is committed
  error:        string | null
  leadData:     LeadData
  callSummary:  CallSummary | null
}

export type VoiceAgentAction =
  | { type: 'CONNECTED' }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'TRANSCRIBED'; text: string }
  | { type: 'STREAM_TOKEN'; token: string }
  | { type: 'REPLY_COMPLETE'; fullText: string; endCall: boolean }
  | { type: 'LEAD_UPDATE'; lead: LeadData }
  | { type: 'CALL_SUMMARY'; summary: CallSummary }
  | { type: 'SPEAKING_DONE' }
  | { type: 'ERROR'; message: string }

// ── API Payloads ───────────────────────────────────────────────────────────────
export interface ConfigResponse {
  language: string
  ttsProvider: string
  voice: string
}

export interface TranscribeResponse {
  text: string
  error?: string
}

export interface ChatStreamEvent {
  token?: string
  done?: boolean
  endCall?: boolean
  fullText?: string
}

export interface SpeakRequest {
  text: string
}

// ── TTS Voices ─────────────────────────────────────────────────────────────────
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export const VOICE_OPTIONS: Array<{ value: OpenAIVoice; label: string }> = [
  { value: 'nova',    label: 'Nova (Female · Warm)' },
  { value: 'shimmer', label: 'Shimmer (Female · Soft)' },
  { value: 'alloy',   label: 'Alloy (Neutral)' },
  { value: 'onyx',    label: 'Onyx (Male · Deep)' },
  { value: 'echo',    label: 'Echo (Male · Clear)' },
  { value: 'fable',   label: 'Fable (Male · Expressive)' },
]
