import type { LeadData, Message, VoiceAgentAction, VoiceAgentState } from '@/types'

/**
 * Pure state + helpers for useVoiceAgent. Kept separate so the hook file only
 * contains orchestration logic.
 */

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const EMPTY_LEAD: LeadData = {
  name: null,
  email: null,
  phone: null,
  company: null,
  country: null,
  purpose: null,
}

export const initialState: VoiceAgentState = {
  phase:        'connecting',
  transcript:   [],
  partialReply: '',
  error:        null,
  leadData:     EMPTY_LEAD,
  callSummary:  null,
}

/** Hook-local actions that are not part of the shared VoiceAgentAction union. */
export type LocalAction =
  | VoiceAgentAction
  /** Commit an interrupted/aborted streaming reply as a finished message. */
  | { type: 'COMMIT_PARTIAL' }

export function removeVisibleLeadMarkers(text: string): string {
  return text
    .replace(/\[LEAD:\s*\{[\s\S]*?\}\]/g, '')
    .replace(/\[LEAD:[\s\S]*$/g, '')
    .trimEnd()
}

function assistantMessage(content: string): Message {
  return { id: uid(), role: 'assistant', content }
}

export function reducer(state: VoiceAgentState, action: LocalAction): VoiceAgentState {
  switch (action.type) {
    case 'RESET':
      return { ...initialState }

    case 'CONNECTED':
      return { ...state, phase: 'idle' }

    case 'START_LISTENING':
      return { ...state, phase: 'listening', error: null }

    case 'STOP_LISTENING':
      return { ...state, phase: 'transcribing' }

    case 'TRANSCRIBED':
      return {
        ...state,
        phase:        'thinking',
        error:        null,
        transcript:   [...state.transcript, { id: uid(), role: 'user', content: action.text }],
        partialReply: '',
      }

    case 'STREAM_TOKEN':
      return { ...state, partialReply: removeVisibleLeadMarkers(state.partialReply + action.token) }

    case 'REPLY_COMPLETE': {
      // A reply that finishes while the user is already talking again (they
      // interrupted the agent) must not yank the UI out of listening/transcribing.
      const keepPhase =
        state.phase === 'speaking' || state.phase === 'listening' || state.phase === 'transcribing'
      return {
        ...state,
        phase:        action.endCall ? 'ended' : keepPhase ? state.phase : 'idle',
        transcript:   [...state.transcript, assistantMessage(removeVisibleLeadMarkers(action.fullText))],
        partialReply: '',
      }
    }

    case 'COMMIT_PARTIAL': {
      const text = state.partialReply.trim()
      if (!text) return state.partialReply ? { ...state, partialReply: '' } : state
      return {
        ...state,
        transcript:   [...state.transcript, assistantMessage(text)],
        partialReply: '',
      }
    }

    case 'LEAD_UPDATE':
      return { ...state, leadData: { ...state.leadData, ...action.lead } }

    case 'CALL_SUMMARY':
      return { ...state, callSummary: action.summary }

    case 'START_SPEAKING':
      // Never override an active mic session or a finished call.
      if (state.phase === 'ended' || state.phase === 'listening' || state.phase === 'transcribing') {
        return state
      }
      return { ...state, phase: 'speaking', error: null }

    case 'SPEAKING_DONE':
      return state.phase === 'speaking' ? { ...state, phase: 'idle' } : state

    case 'ERROR':
      return { ...state, phase: 'error', error: action.message }

    default:
      return state
  }
}
