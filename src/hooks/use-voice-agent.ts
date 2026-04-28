'use client'

import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useAudioRecorder } from './use-audio-recorder'
import { useAudioPlayer }   from './use-audio-player'
import type {
  Phase,
  VoiceAgentState,
  VoiceAgentAction,
  Message,
  ChatHistory,
  OpenAIVoice,
  LeadData,
  CallSummary,
} from '@/types'

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// ── Reducer ────────────────────────────────────────────────────────────────────
function reducer(state: VoiceAgentState, action: VoiceAgentAction): VoiceAgentState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, phase: 'idle' }

    case 'START_LISTENING':
      return { ...state, phase: 'listening', error: null }

    case 'STOP_LISTENING':
      return { ...state, phase: 'transcribing' }

    case 'TRANSCRIBED': {
      const msg: Message = { id: uid(), role: 'user', content: action.text }
      return {
        ...state,
        phase:        'thinking',
        transcript:   [...state.transcript, msg],
        partialReply: '',
      }
    }

    case 'STREAM_TOKEN':
      return { ...state, partialReply: state.partialReply + action.token }

    case 'REPLY_COMPLETE': {
      const msg: Message = { id: uid(), role: 'assistant', content: action.fullText }
      return {
        ...state,
        phase:        action.endCall ? 'ended' : 'speaking',
        transcript:   [...state.transcript, msg],
        partialReply: '',
      }
    }

    case 'LEAD_UPDATE':
      return { ...state, leadData: { ...state.leadData, ...action.lead } }

    case 'CALL_SUMMARY':
      return { ...state, callSummary: action.summary }

    case 'SPEAKING_DONE':
      return { ...state, phase: 'idle' }

    case 'ERROR':
      return { ...state, phase: 'error', error: action.message }

    default:
      return state
  }
}

const EMPTY_LEAD: LeadData = { name: null, email: null, phone: null, company: null, purpose: null }

const initialState: VoiceAgentState = {
  phase:        'connecting',
  transcript:   [],
  partialReply: '',
  error:        null,
  leadData:     EMPTY_LEAD,
  callSummary:  null,
}

// ── Public interface ───────────────────────────────────────────────────────────
export interface UseVoiceAgentOptions {
  tenantId?: string
  token?:    string
}

export interface UseVoiceAgentReturn {
  phase:        Phase
  transcript:   Message[]
  partialReply: string
  error:        string | null
  isRecording:  boolean
  hasSpeech:    boolean
  isPlaying:    boolean
  language:     string
  voice:        OpenAIVoice
  leadData:     LeadData
  callSummary:  CallSummary | null
  agentName:    string
  companyName:  string
  setVoice:     (v: OpenAIVoice) => void
  stopPlayback: () => void
  toggleMic:    () => void
  pressMic:     () => void   // push-to-talk: call on pointer down
  releaseMic:   () => void   // push-to-talk: call on pointer up/leave
  sendText:     (text: string) => void
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useVoiceAgent({ tenantId, token }: UseVoiceAgentOptions = {}): UseVoiceAgentReturn {
  const [state, dispatch]       = useReducer(reducer, initialState)
  const [voice, setVoice]       = useState<OpenAIVoice>('nova')
  const [language, setLang]     = useState('English')
  const [agentName, setAgent]   = useState('Agent')
  const [companyName, setCompany] = useState('')
  const [embedHeaders, setEmbedHeaders] = useState<Record<string, string>>({})
  const embedHeadersRef = useRef<Record<string, string>>({})

  // Keep voice in a ref so async callbacks always read the latest value
  const voiceRef = useRef<OpenAIVoice>('nova')
  const handleSetVoice = useCallback((v: OpenAIVoice) => {
    voiceRef.current = v
    setVoice(v)
  }, [])

  // Conversation history sent to /api/chat
  const historyRef = useRef<ChatHistory>([])

  // ── Audio player ─────────────────────────────────────────────────────────────
  const stateRef = useRef(state)
  stateRef.current = state

  const { isPlaying, enqueue, stopAll } = useAudioPlayer({
    requestHeaders: embedHeaders,
    onPlaybackEnd: () => {
      if (stateRef.current.phase === 'speaking') {
        dispatch({ type: 'SPEAKING_DONE' })
      }
    },
  })

  // ── Audio recorder ───────────────────────────────────────────────────────────
  const { isRecording, hasSpeech, start: startRec, stop: stopRec } = useAudioRecorder({
    onAudioReady: async (blob) => {
      dispatch({ type: 'STOP_LISTENING' })
      await processAudio(blob)
    },
  })

  // ── Boot: load config + generate opening greeting ─────────────────────────────
  useEffect(() => {
    const parent = document.referrer || ''

    const headers: Record<string, string> = {}
    // Prefer props (SSR-forwarded) then fall back to URL params
    const resolvedTenant = tenantId ?? new URLSearchParams(window.location.search).get('tenant') ?? ''
    const resolvedToken  = token    ?? new URLSearchParams(window.location.search).get('token')  ?? ''
    if (resolvedTenant) headers['x-embed-tenant'] = resolvedTenant
    if (resolvedToken)  headers['x-embed-token']  = resolvedToken
    if (parent)         headers['x-embed-parent']  = parent
    embedHeadersRef.current = headers
    setEmbedHeaders(headers)

    let cancelled = false

    async function boot() {
      try {
        const cfg = await fetch('/api/config', {
          headers,
        }).then((r) => r.json())
        if (!cancelled && cfg.voice)       handleSetVoice(cfg.voice as OpenAIVoice)
        if (!cancelled && cfg.language)    setLang(cfg.language)
        if (!cancelled && cfg.agentName)   setAgent(cfg.agentName)
        if (!cancelled && cfg.companyName) setCompany(cfg.companyName)

        if (cfg.greeting && !cancelled) {
          // Use the exact hardcoded greeting — guaranteed verbatim, no LLM
          const greetingText = cfg.greeting as string
          dispatch({ type: 'REPLY_COMPLETE', fullText: greetingText, endCall: false })
          enqueue(greetingText)
          historyRef.current.push({ role: 'assistant', content: greetingText })
        } else {
          await streamChat([{ role: 'user', content: '__GREET__' }], cancelled ? null : dispatch)
        }

        if (!cancelled) dispatch({ type: 'CONNECTED' })
      } catch (err) {
        if (!cancelled) dispatch({ type: 'ERROR', message: String(err) })
      }
    }

    boot()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Process recorded audio ────────────────────────────────────────────────────
  async function processAudio(blob: Blob) {
    const form = new FormData()
    form.append('audio', blob, 'audio.webm')

    let userText: string
    try {
      const res  = await fetch('/api/transcribe', {
        method: 'POST',
        headers: embedHeadersRef.current,
        body: form,
      })
      const data = await res.json()
      userText   = data.text ?? ''
    } catch {
      dispatch({ type: 'ERROR', message: 'Transcription failed. Please try again.' })
      return
    }

    if (!userText.trim()) {
      dispatch({ type: 'CONNECTED' })
      return
    }

    dispatch({ type: 'TRANSCRIBED', text: userText })
    historyRef.current.push({ role: 'user', content: userText })

    await streamChat(historyRef.current, dispatch)
  }

  // ── SSE chat stream consumer ──────────────────────────────────────────────────
  async function streamChat(
    messages: ChatHistory,
    dispatchFn: typeof dispatch | null
  ) {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...embedHeadersRef.current,
      },
      body:    JSON.stringify({ messages }),
    })

    if (!res.body) throw new Error('No response body from /api/chat')

    const reader     = res.body.getReader()
    const decoder    = new TextDecoder()
    let   lineBuffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      lineBuffer += decoder.decode(value, { stream: true })
      const parts = lineBuffer.split('\n\n')
      lineBuffer  = parts.pop() ?? ''

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue
        let event: Record<string, unknown>
        try { event = JSON.parse(part.slice(6)) } catch { continue }

        if (event.error) {
          dispatchFn?.({ type: 'ERROR', message: String(event.error) })
          return
        }
        if (event.token) {
          dispatchFn?.({ type: 'STREAM_TOKEN', token: String(event.token) })
        }
        if (event.sentence) {
          enqueue(String(event.sentence))
        }
        if (event.lead) {
          dispatchFn?.({ type: 'LEAD_UPDATE', lead: event.lead as LeadData })
        }
        if (event.done) {
          const fullText = String(event.fullText ?? '')
          const endCall  = Boolean(event.endCall)
          dispatchFn?.({ type: 'REPLY_COMPLETE', fullText, endCall })
          historyRef.current.push({ role: 'assistant', content: fullText })
          if (endCall) {
            const lead = stateRef.current.leadData
            // Generate summary in background — don't block the farewell
            fetch('/api/summarize', {
              method:  'POST',
              headers: {
                'Content-Type': 'application/json',
                ...embedHeadersRef.current,
              },
              body:    JSON.stringify({ messages: historyRef.current }),
            })
              .then((r) => r.json())
              .then((data: CallSummary) => {
                dispatchFn?.({ type: 'CALL_SUMMARY', summary: data })
                console.log(
                  '[Call Report]',
                  JSON.stringify({ lead, ...data }, null, 2)
                )
              })
              .catch((err) => console.error('[summarize]', err))
          }
        }
      }
    }
  }

  // ── Text send ─────────────────────────────────────────────────────────────────
  const sendText = useCallback((text: string) => {
    const phase = stateRef.current.phase
    if (!text.trim()) return
    if (phase !== 'idle' && phase !== 'error') return

    dispatch({ type: 'TRANSCRIBED', text })
    historyRef.current.push({ role: 'user', content: text })
    streamChat(historyRef.current, dispatch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Mic toggle (click mode) ───────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase === 'speaking' || phase === 'thinking') {
      stopAll()
      dispatch({ type: 'CONNECTED' })
      return
    }
    if (isRecording) {
      stopRec()
      return
    }
    if (phase === 'idle') {
      dispatch({ type: 'START_LISTENING' })
      startRec().catch((err) => dispatch({ type: 'ERROR', message: String(err) }))
    }
  }, [isRecording, startRec, stopRec, stopAll])

  // ── Push-to-talk ──────────────────────────────────────────────────────────────
  const pressMic = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase !== 'idle' && phase !== 'error') return
    dispatch({ type: 'START_LISTENING' })
    startRec().catch((err) => dispatch({ type: 'ERROR', message: String(err) }))
  }, [startRec])

  const releaseMic = useCallback(() => {
    if (!isRecording) return
    stopRec()   // fires onAudioReady → transcribe → send
  }, [isRecording, stopRec])

  return {
    phase:        state.phase,
    transcript:   state.transcript,
    partialReply: state.partialReply,
    error:        state.error,
    isRecording,
    hasSpeech,
    isPlaying,
    language,
    voice,
    leadData:     state.leadData,
    callSummary:  state.callSummary,
    agentName,
    companyName,
    setVoice:   handleSetVoice,
    stopPlayback: stopAll,
    toggleMic,
    pressMic,
    releaseMic,
    sendText,
  }
}
