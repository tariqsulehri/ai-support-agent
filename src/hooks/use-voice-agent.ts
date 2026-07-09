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
  ConfigResponse,
  TranscribeResponse,
} from '@/types'

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

type ApiErrorBody = {
  error?: string
  detail?: string
}

const CHAT_READ_TIMEOUT_MS = 25_000
const BOOT_TIMEOUT_MS = 8_000
const MIN_TRANSCRIBABLE_AUDIO_BYTES = 4_000

function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Chat response timed out. Please try again.'))
    }, timeoutMs)

    reader.read()
      .then((result) => resolve(result))
      .catch(reject)
      .finally(() => window.clearTimeout(timeout))
  })
}

async function readJsonResponse<T>(res: Response, endpoint: string): Promise<T> {
  const text = await res.text()
  let data: unknown = null

  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Invalid JSON from ${endpoint}`)
    }
  }

  if (!res.ok) {
    const apiError = data as ApiErrorBody | null
    throw new Error(apiError?.detail ?? apiError?.error ?? `${endpoint} failed (${res.status})`)
  }

  if (data === null) {
    throw new Error(`Empty response from ${endpoint}`)
  }

  return data as T
}

async function readErrorText(res: Response, endpoint: string): Promise<string> {
  const text = await res.text()
  return text.trim() || `${endpoint} failed (${res.status})`
}

// ── Reducer ────────────────────────────────────────────────────────────────────
function reducer(state: VoiceAgentState, action: VoiceAgentAction): VoiceAgentState {
  switch (action.type) {
    case 'RESET':
      console.log('[reducer] RESET')
      return { ...initialState }

    case 'CONNECTED':
      console.log('[reducer] CONNECTED, phase -> idle')
      return { ...state, phase: 'idle' }

    case 'START_LISTENING':
      console.log('[reducer] START_LISTENING')
      return { ...state, phase: 'listening', error: null }

    case 'STOP_LISTENING':
      console.log('[reducer] STOP_LISTENING')
      return { ...state, phase: 'transcribing' }

    case 'TRANSCRIBED': {
      console.log('[reducer] TRANSCRIBED')
      const msg: Message = { id: uid(), role: 'user', content: action.text }
      return {
        ...state,
        phase:        'thinking',
        transcript:   [...state.transcript, msg],
        partialReply: '',
      }
    }

    case 'STREAM_TOKEN':
      return { ...state, partialReply: removeVisibleLeadMarkers(state.partialReply + action.token) }

    case 'REPLY_COMPLETE': {
      console.log('[reducer] REPLY_COMPLETE, endCall:', action.endCall, 'phase ->', action.endCall ? 'ended' : 'idle')
      const msg: Message = {
        id: uid(),
        role: 'assistant',
        content: removeVisibleLeadMarkers(action.fullText),
      }
      return {
        ...state,
        phase:        action.endCall ? 'ended' : state.phase === 'speaking' ? 'speaking' : 'idle',
        transcript:   [...state.transcript, msg],
        partialReply: '',
      }
    }

    case 'LEAD_UPDATE':
      return { ...state, leadData: { ...state.leadData, ...action.lead } }

    case 'CALL_SUMMARY':
      console.log('[reducer] CALL_SUMMARY received:', action.summary)
      return { ...state, callSummary: action.summary }

    case 'START_SPEAKING':
      return state.phase === 'ended' ? state : { ...state, phase: 'speaking', error: null }

    case 'SPEAKING_DONE':
      return state.phase === 'speaking' ? { ...state, phase: 'idle' } : state

    case 'ERROR':
      return { ...state, phase: 'error', error: action.message }


    default:
      return state
  }
}

const EMPTY_LEAD: LeadData = {
  name: null,
  email: null,
  phone: null,
  company: null,
  country: null,
  purpose: null,
}

function removeVisibleLeadMarkers(text: string): string {
  return text
    .replace(/\[LEAD:\s*\{[\s\S]*?\}\]/g, '')
    .replace(/\[LEAD:[\s\S]*$/g, '')
    .trimEnd()
}

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
  tenantId?:    string
  token?:       string
  sessionToken?: string
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
  startNewChat: () => void
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useVoiceAgent({ tenantId, token, sessionToken }: UseVoiceAgentOptions = {}): UseVoiceAgentReturn {
  const [state, dispatch]       = useReducer(reducer, initialState)
  const [voice, setVoice]       = useState<OpenAIVoice>('nova')
  const [language, setLang]     = useState('English')
  const [agentName, setAgent]   = useState('Agent')
  const [companyName, setCompany] = useState('')
  const [embedHeaders, setEmbedHeaders] = useState<Record<string, string>>({})
  const embedHeadersRef = useRef<Record<string, string>>({})
  const greetingRef = useRef<string | null>(null)
  const sessionIdRef = useRef(0)

  // Keep voice in a ref so async callbacks always read the latest value
  const voiceRef = useRef<OpenAIVoice>('nova')
  const handleSetVoice = useCallback((v: OpenAIVoice) => {
    voiceRef.current = v
    setVoice(v)
  }, [])

  // Keep audio functions in refs for effect cleanup
  const stopAllRef = useRef<typeof stopAll | null>(null)
  const enqueueRef = useRef<typeof enqueue | null>(null)

  // Conversation history sent to /api/chat
  const historyRef = useRef<ChatHistory>([])

  // ── Audio player ─────────────────────────────────────────────────────────────
  const stateRef = useRef(state)
  stateRef.current = state
  const leadRef = useRef<LeadData>(EMPTY_LEAD)

  const { isPlaying, enqueue, stopAll } = useAudioPlayer({
    requestHeaders: embedHeaders,
    onPlaybackStart: () => dispatch({ type: 'START_SPEAKING' }),
    onPlaybackEnd:   () => dispatch({ type: 'SPEAKING_DONE' }),
    onPlaybackError: (message) => {
      console.error('[voice playback]', message)
      dispatch({
        type: 'ERROR',
        message: /notallowed|allowed|interact|gesture|play\(\)/i.test(message)
          ? 'Audio playback was blocked by the browser. Tap the mic or send a message, then try again.'
          : `Voice playback failed: ${message}`,
      })
    },
  })

  // Update refs so effects can access latest functions
  stopAllRef.current = stopAll
  enqueueRef.current = enqueue

  function tenantScopedApiPath(path: string): string {
    const tenant = embedHeadersRef.current['x-embed-tenant']
    if (!tenant) return path

    const url = new URL(path, window.location.origin)
    url.searchParams.set('tenant', tenant)
    return `${url.pathname}${url.search}`
  }

  function transcriptToChatHistory(messages: Message[]): ChatHistory {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }))
  }

  function finalMessagesWithUiSnapshot(lastAssistantText: string): ChatHistory {
    const uiMessages = transcriptToChatHistory(stateRef.current.transcript)
    const cleanedLastAssistant = lastAssistantText.trim()

    if (cleanedLastAssistant && uiMessages.at(-1)?.content !== cleanedLastAssistant) {
      uiMessages.push({ role: 'assistant', content: cleanedLastAssistant })
    }

    return uiMessages.length > historyRef.current.length
      ? uiMessages
      : [...historyRef.current]
  }

  // ── Audio recorder ───────────────────────────────────────────────────────────
  const { isRecording, hasSpeech, start: startRec, stop: stopRec } = useAudioRecorder({
    onAudioReady: async (blob, hadSpeech) => {
      if (!hadSpeech && blob.size < MIN_TRANSCRIBABLE_AUDIO_BYTES) {
        dispatch({ type: 'CONNECTED' })
        return
      }
      dispatch({ type: 'STOP_LISTENING' })
      await processAudio(blob)
    },
  })

  // ── Boot: load config + generate opening greeting ─────────────────────────────
  useEffect(() => {
    const parent = document.referrer || ''

    const headers: Record<string, string> = {}
    const params = new URLSearchParams(window.location.search)
    // Prefer props (SSR-forwarded) then fall back to URL params
    const resolvedTenant = tenantId ?? params.get('tenant') ?? ''
    const resolvedToken  = token    ?? params.get('token')  ?? ''
    const resolvedSession = sessionToken ?? params.get('session') ?? ''
    if (resolvedTenant)    headers['x-embed-tenant'] = resolvedTenant
    if (resolvedToken)     headers['x-embed-token']  = resolvedToken
    if (resolvedSession)   headers['x-embed-session'] = resolvedSession
    if (parent)            headers['x-embed-parent']  = parent
    embedHeadersRef.current = headers
    setEmbedHeaders(headers)

    let cancelled = false

    async function boot() {
      try {
        const cfg = await fetch('/api/config', {
          headers,
        }).then((r) => readJsonResponse<ConfigResponse>(r, '/api/config'))
        if (!cancelled && cfg.tenantId) {
          const pinnedHeaders = {
            ...headers,
            'x-embed-tenant': cfg.tenantId,
          }
          embedHeadersRef.current = pinnedHeaders
          setEmbedHeaders(pinnedHeaders)
        }
        if (!cancelled && cfg.voice)       handleSetVoice(cfg.voice as OpenAIVoice)
        if (!cancelled && cfg.language)    setLang(cfg.language)
        if (!cancelled && cfg.agentName)   setAgent(cfg.agentName)
        if (!cancelled && cfg.companyName) setCompany(cfg.companyName)

        if (cfg.greeting && !cancelled) {
          // Use the exact hardcoded greeting — guaranteed verbatim, no LLM
          const greetingText = cfg.greeting as string
          greetingRef.current = greetingText
          dispatch({ type: 'REPLY_COMPLETE', fullText: greetingText, endCall: false })
          historyRef.current.push({ role: 'assistant', content: greetingText })
          dispatch({ type: 'CONNECTED' })
          enqueue(greetingText)
        } else {
          const greeting = await streamChat([{ role: 'user', content: '__GREET__' }], cancelled ? null : dispatch)
          if (greeting?.fullText) greetingRef.current = greeting.fullText

          if (!cancelled) dispatch({ type: 'CONNECTED' })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[voice-agent boot]', err)
          dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Agent connection failed. Please refresh and try again.' })
        }
      }
    }

    const bootTimeout = window.setTimeout(() => {
      if (cancelled) return
      if (stateRef.current.phase === 'connecting') {
        console.warn('[voice-agent boot] timeout')
        dispatch({ type: 'ERROR', message: 'Agent connection timed out. Please refresh and try again.' })
      }
    }, BOOT_TIMEOUT_MS)

    boot()
    return () => {
      cancelled = true
      window.clearTimeout(bootTimeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Process recorded audio ────────────────────────────────────────────────────
  async function processAudio(blob: Blob) {
    const form = new FormData()
    form.append('audio', blob, 'audio.webm')

    let userText: string
    try {
      const res  = await fetch(tenantScopedApiPath('/api/transcribe'), {
        method: 'POST',
        headers: embedHeadersRef.current,
        body: form,
      })
      const data = await readJsonResponse<TranscribeResponse>(res, '/api/transcribe')
      if (data.error) throw new Error(data.error)
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

    try {
      await streamChat(historyRef.current, dispatch)
    } catch (err) {
      dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Chat failed. Please try again.' })
    }
  }

  // ── SSE chat stream consumer ──────────────────────────────────────────────────
  async function streamChat(
    messages: ChatHistory,
    dispatchFn: typeof dispatch | null
  ): Promise<{ fullText: string; endCall: boolean } | null> {
    const res = await fetch(tenantScopedApiPath('/api/chat'), {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...embedHeadersRef.current,
      },
      body:    JSON.stringify({ messages, lead: leadRef.current }),
    })

    if (!res.ok) throw new Error(await readErrorText(res, '/api/chat'))
    if (!res.body) throw new Error('No response body from /api/chat')

    const reader     = res.body.getReader()
    const decoder    = new TextDecoder()
    let   lineBuffer = ''
    let   sawDone = false
    let   result: { fullText: string; endCall: boolean } | null = null

    while (true) {
      const { done, value } = await readWithTimeout(reader, CHAT_READ_TIMEOUT_MS)
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
          return result
        }
        if (event.token) {
          dispatchFn?.({ type: 'STREAM_TOKEN', token: String(event.token) })
        }
        if (event.sentence) {
          const sentence = String(event.sentence)
          if (sentence.trim()) {
            enqueue(sentence)
          }
        }
        if (event.lead) {
          leadRef.current = { ...leadRef.current, ...(event.lead as LeadData) }
          dispatchFn?.({ type: 'LEAD_UPDATE', lead: event.lead as LeadData })
        }
        if (event.done) {
          sawDone = true
          const fullText = String(event.fullText ?? '')
          const endCall  = Boolean(event.endCall)
          result = { fullText, endCall }
          dispatchFn?.({ type: 'REPLY_COMPLETE', fullText, endCall })
          historyRef.current.push({ role: 'assistant', content: fullText })
          if (endCall) {
            const lead = leadRef.current
            const finalMessages = finalMessagesWithUiSnapshot(fullText)
            const summarySessionId = sessionIdRef.current
            // Generate summary in background — don't block the farewell
            console.log('[Call Report] finalizing call, dispatchFn available:', !!dispatchFn, 'sessionId:', summarySessionId)
            fetch(tenantScopedApiPath('/api/summarize'), {
              method:  'POST',
              headers: {
                'Content-Type': 'application/json',
                ...embedHeadersRef.current,
              },
              body:    JSON.stringify({ messages: finalMessages, lead }),
            })
              .then((r) => readJsonResponse<CallSummary>(r, '/api/summarize'))
              .then((data: CallSummary) => {
                console.log('[Call Report] summary received, sessionId:', summarySessionId, 'current:', sessionIdRef.current)
                if (summarySessionId !== sessionIdRef.current) {
                  console.log('[Call Report] session mismatch, ignoring')
                  return
                }
                console.log('[Call Report] dispatching CALL_SUMMARY', data)
                try {
                  dispatchFn?.({ type: 'CALL_SUMMARY', summary: data })
                  console.log('[Call Report] dispatch successful')
                } catch (e) {
                  console.error('[Call Report] dispatch failed:', e)
                }
                console.log(
                  '[Call Report]',
                  JSON.stringify({ lead, ...data }, null, 2)
                )
              })
              .catch((err) => {
                console.error('[Call Report] summary error:', err)
                if (summarySessionId !== sessionIdRef.current) {
                  console.log('[Call Report] session mismatch in error, ignoring')
                  return
                }
                console.error('[summarize]', err)
                dispatchFn?.({
                  type: 'CALL_SUMMARY',
                  summary: {
                    summary: 'The call ended, but the final report could not be completed.',
                    keyPoints: [],
                    email: {
                      sent: false,
                      error: err instanceof Error ? err.message : String(err),
                    },
                    database: {
                      saved: false,
                      error: 'Call finalization failed before the record could be saved.',
                    },
                  },
                })
              })
          }
        }
      }
    }

    if (!sawDone) {
      dispatchFn?.({ type: 'ERROR', message: 'Chat stream ended before a complete reply.' })
    }

    return result
  }

  // ── Text send ─────────────────────────────────────────────────────────────────
  const sendText = useCallback((text: string) => {
    const phase = stateRef.current.phase
    if (!text.trim()) return
    if (phase !== 'idle' && phase !== 'error') return

    dispatch({ type: 'TRANSCRIBED', text })
    historyRef.current.push({ role: 'user', content: text })
    streamChat(historyRef.current, dispatch).catch((err) => {
      dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Chat failed. Please try again.' })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = useCallback(() => {
    dispatch({ type: 'START_LISTENING' })
    startRec().catch((err) => dispatch({ type: 'ERROR', message: String(err) }))
  }, [startRec])

  const interruptAndListen = useCallback(() => {
    stopAll()
    startListening()
  }, [startListening, stopAll])

  // ── Mic toggle (click mode) ───────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase === 'speaking') {
      interruptAndListen()
      return
    }
    if (phase === 'thinking') {
      stopAll()
      dispatch({ type: 'CONNECTED' })
      return
    }
    if (isRecording) {
      stopRec()
      return
    }
    if (phase === 'idle') {
      startListening()
    }
  }, [interruptAndListen, isRecording, startListening, stopRec, stopAll])

  // ── Push-to-talk ──────────────────────────────────────────────────────────────
  const pressMic = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase === 'speaking') {
      interruptAndListen()
      return
    }
    if (phase !== 'idle' && phase !== 'error') return
    startListening()
  }, [interruptAndListen, startListening])

  const releaseMic = useCallback(() => {
    if (!isRecording) return
    stopRec()   // fires onAudioReady → transcribe → send
  }, [isRecording, stopRec])

  const startNewChat = useCallback(() => {
    sessionIdRef.current += 1
    historyRef.current = []
    leadRef.current = EMPTY_LEAD
    stopAll()
    dispatch({ type: 'RESET' })

    const greeting = greetingRef.current
    if (greeting) {
      dispatch({ type: 'REPLY_COMPLETE', fullText: greeting, endCall: false })
      historyRef.current.push({ role: 'assistant', content: greeting })
      dispatch({ type: 'CONNECTED' })
      enqueue(greeting)
      return
    }

    streamChat([{ role: 'user', content: '__GREET__' }], dispatch)
      .then((freshGreeting) => {
        if (freshGreeting?.fullText) greetingRef.current = freshGreeting.fullText
        dispatch({ type: 'CONNECTED' })
      })
      .catch((err) => {
        dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Chat failed. Please try again.' })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enqueue, stopAll])

  // Auto-restart when summary completes
  useEffect(() => {
    if (state.phase !== 'ended' || !state.callSummary) return

    console.log('[auto-restart] summary ready, waiting 1.5s')
    const timer = window.setTimeout(() => {
      console.log('[auto-restart] calling startNewChat')
      startNewChat()
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [state.phase, state.callSummary, startNewChat])

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
    startNewChat,
  }
}
