'use client'

import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useAudioRecorder } from './use-audio-recorder'
import { useAudioPlayer }   from './use-audio-player'
import { primeAudio } from '@/lib/utils/audio-unlock'
import {
  EMPTY_LEAD,
  initialState,
  reducer,
  removeVisibleLeadMarkers,
  uid,
  type LocalAction,
} from './voice-agent-state'
import {
  audioFileName,
  isAbortError,
  keepaliveForBody,
  readErrorText,
  readJsonResponse,
  readSseEvents,
} from './voice-agent-http'
import type {
  Phase,
  Message,
  ChatHistory,
  OpenAIVoice,
  LeadData,
  CallSummary,
  ConfigResponse,
  TranscribeResponse,
  VoiceAgentState,
} from '@/types'

const CHAT_READ_TIMEOUT_MS = 25_000
const BOOT_TIMEOUT_MS = 15_000
const MIN_TRANSCRIBABLE_AUDIO_BYTES = 4_000
/** Presses shorter than this are "taps" (hands-free, VAD auto-stops); longer ones are push-to-talk. */
const TAP_THRESHOLD_MS = 350
const AUTO_RESTART_DELAY_MS = 1_500

/**
 * One request/response exchange with the backend (transcribe → chat stream).
 * Only the current turn may touch state; superseded turns are aborted and any
 * of their late responses are ignored.
 */
interface Turn {
  controller: AbortController
  /** Raw streamed text so far (used to commit an interrupted reply). */
  text:       string
  completed:  boolean
  /** User interrupted the spoken reply: keep streaming text, stop speaking it. */
  muted:      boolean
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
  isAutoplayBlocked: boolean
  currentlyPlayingText: string | null
  language:     string
  voice:        OpenAIVoice
  leadData:     LeadData
  callSummary:  CallSummary | null
  agentName:    string
  companyName:  string
  setVoice:     (v: OpenAIVoice) => void
  stopPlayback: () => void
  playMessage:  (text: string) => void
  playPendingAudio: () => void
  toggleMic:    () => void
  pressMic:     () => void   // pointer down: tap = hands-free, hold = push-to-talk
  releaseMic:   () => void   // pointer up/cancel
  sendText:     (text: string) => void
  startNewChat: () => void
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useVoiceAgent({ tenantId, token, sessionToken }: UseVoiceAgentOptions = {}): UseVoiceAgentReturn {
  const [state, rawDispatch]    = useReducer(reducer, initialState)
  const [voice, setVoice]       = useState<OpenAIVoice>('nova')
  const [language, setLang]     = useState('English')
  const [agentName, setAgent]   = useState('Agent')
  const [companyName, setCompany] = useState('')
  const [embedHeaders, setEmbedHeaders] = useState<Record<string, string>>({})

  const embedHeadersRef   = useRef<Record<string, string>>({})
  const greetingRef       = useRef<string | null>(null)
  const sessionIdRef      = useRef(0)
  const conversationIdRef = useRef(uid())
  const historyRef        = useRef<ChatHistory>([])   // conversation sent to /api/chat
  const leadRef           = useRef<LeadData>(EMPTY_LEAD)
  const turnRef           = useRef<Turn | null>(null)
  const pressStartedAtRef = useRef<number | null>(null)
  const unmountedRef      = useRef(false)

  /**
   * Synchronous mirror of reducer state. Updated in the same tick as dispatch
   * so rapid clicks (double-send, press/release) see the phase they just set,
   * not the one from the last render.
   */
  const stateRef = useRef<VoiceAgentState>(initialState)
  const dispatch = useCallback((action: LocalAction) => {
    stateRef.current = reducer(stateRef.current, action)
    rawDispatch(action)
  }, [])

  const handleSetVoice = useCallback((v: OpenAIVoice) => setVoice(v), [])

  // ── Audio player ─────────────────────────────────────────────────────────────
  const {
    isPlaying,
    isAutoplayBlocked,
    currentlyPlayingText,
    enqueue,
    playMessage,
    playPendingAudio,
    stopAll,
  } = useAudioPlayer({
    requestHeaders: embedHeaders,
    onPlaybackStart: () => dispatch({ type: 'START_SPEAKING' }),
    onPlaybackEnd:   () => dispatch({ type: 'SPEAKING_DONE' }),
    onPlaybackError: (message) => {
      // Normal interruptions, cancellations, or aborts are expected and should not trigger app errors
      if (/abort|aborted|canceled|cancelled/i.test(message)) return

      // Autoplay blocked by browser policy prior to user interaction is standard browser behavior.
      if (/notallowed|allowed|interact|gesture|play\(\)/i.test(message)) {
        dispatch({ type: 'SPEAKING_DONE' })
        return
      }

      console.error('[voice playback]', message)
      dispatch({ type: 'ERROR', message: `Voice playback failed: ${message}` })
    },
  })

  // ── Request helpers ──────────────────────────────────────────────────────────
  const tenantScopedApiPath = useCallback((path: string): string => {
    const tenant = embedHeadersRef.current['x-embed-tenant']
    if (!tenant) return path

    const url = new URL(path, window.location.origin)
    url.searchParams.set('tenant', tenant)
    return `${url.pathname}${url.search}`
  }, [])

  const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...embedHeadersRef.current })

  const finalMessagesWithUiSnapshot = (lastAssistantText: string): ChatHistory => {
    const uiMessages: ChatHistory = stateRef.current.transcript.map(({ role, content }) => ({ role, content }))
    const cleanedLastAssistant = lastAssistantText.trim()

    if (cleanedLastAssistant && uiMessages.at(-1)?.content !== cleanedLastAssistant) {
      uiMessages.push({ role: 'assistant', content: cleanedLastAssistant })
    }

    return uiMessages.length > historyRef.current.length ? uiMessages : [...historyRef.current]
  }

  const saveConversationSnapshot = (messages: ChatHistory): void => {
    if (messages.every((message) => message.content === '__GREET__')) return

    const body = JSON.stringify({
      conversationId: conversationIdRef.current,
      messages,
      lead: leadRef.current,
    })

    fetch(tenantScopedApiPath('/api/conversation'), {
      method: 'POST',
      headers: jsonHeaders(),
      body,
      ...keepaliveForBody(body),
    }).catch((err) => {
      console.error('[conversation snapshot]', err)
    })
  }

  const requestSummary = (fullText: string) => {
    const summarySessionId = sessionIdRef.current
    const body = JSON.stringify({
      conversationId: conversationIdRef.current,
      messages: finalMessagesWithUiSnapshot(fullText),
      lead: leadRef.current,
    })
    const isStale = () => summarySessionId !== sessionIdRef.current || unmountedRef.current

    // Generate summary in background — don't block the farewell
    fetch(tenantScopedApiPath('/api/summarize'), {
      method:  'POST',
      headers: jsonHeaders(),
      body,
      ...keepaliveForBody(body),
    })
      .then((r) => readJsonResponse<CallSummary>(r, '/api/summarize'))
      .then((data) => {
        if (!isStale()) dispatch({ type: 'CALL_SUMMARY', summary: data })
      })
      .catch((err) => {
        console.error('[summarize]', err)
        if (isStale()) return
        dispatch({
          type: 'CALL_SUMMARY',
          summary: {
            summary: 'The call ended, but the final report could not be completed.',
            keyPoints: [],
            email: { sent: false, error: errorText(err, String(err)) },
            database: {
              saved: false,
              error: 'Call finalization failed before the record could be saved.',
            },
          },
        })
      })
  }

  // ── Turn management (race-safety) ────────────────────────────────────────────
  /**
   * Abort the active turn. If `commit` and the reply was cut off mid-stream,
   * keep what was already shown so the transcript and history stay coherent.
   */
  const cancelActiveTurn = (commit: boolean) => {
    const turn = turnRef.current
    if (!turn) return
    turnRef.current = null
    turn.controller.abort()

    if (commit && !turn.completed) {
      const partial = removeVisibleLeadMarkers(turn.text).trim()
      if (partial) historyRef.current.push({ role: 'assistant', content: partial })
      dispatch({ type: 'COMMIT_PARTIAL' })
    }
  }

  const beginTurn = (): Turn => {
    cancelActiveTurn(true)
    const turn: Turn = { controller: new AbortController(), text: '', completed: false, muted: false }
    turnRef.current = turn
    return turn
  }

  const isCurrent = (turn: Turn) => turnRef.current === turn && !unmountedRef.current

  // ── SSE chat stream consumer ──────────────────────────────────────────────────
  const streamChat = async (
    messages: ChatHistory,
    turn: Turn,
  ): Promise<{ fullText: string; endCall: boolean } | null> => {
    const res = await fetch(tenantScopedApiPath('/api/chat'), {
      method:  'POST',
      headers: jsonHeaders(),
      body:    JSON.stringify({ messages, lead: leadRef.current }),
      signal:  turn.controller.signal,
    })

    if (!res.ok) throw new Error(await readErrorText(res, '/api/chat'))
    if (!res.body) throw new Error('No response body from /api/chat')

    for await (const event of readSseEvents(res.body, CHAT_READ_TIMEOUT_MS, turn.controller.signal)) {
      if (!isCurrent(turn)) return null

      if (event.error) {
        dispatch({ type: 'ERROR', message: String(event.error) })
        return null
      }
      if (event.token) {
        const tokenText = String(event.token)
        turn.text += tokenText
        dispatch({ type: 'STREAM_TOKEN', token: tokenText })
      }
      if (event.sentence && !turn.muted) {
        const sentence = String(event.sentence)
        if (sentence.trim()) enqueue(sentence)
      }
      if (event.lead) {
        leadRef.current = { ...leadRef.current, ...(event.lead as LeadData) }
        dispatch({ type: 'LEAD_UPDATE', lead: event.lead as LeadData })
      }
      if (event.done) {
        const fullText = String(event.fullText ?? '')
        const endCall  = Boolean(event.endCall)
        turn.completed = true
        dispatch({ type: 'REPLY_COMPLETE', fullText, endCall })
        historyRef.current.push({ role: 'assistant', content: fullText })
        saveConversationSnapshot(finalMessagesWithUiSnapshot(fullText))
        if (endCall) requestSummary(fullText)
        return { fullText, endCall }
      }
    }

    if (isCurrent(turn)) {
      dispatch({ type: 'ERROR', message: 'Chat stream ended before a complete reply.' })
    }
    return null
  }

  const releaseTurn = (turn: Turn) => {
    if (turnRef.current === turn) turnRef.current = null
  }

  const runChatTurn = (messages: ChatHistory, turn: Turn) =>
    streamChat(messages, turn)
      .catch((err) => {
        if (!isCurrent(turn) || isAbortError(err)) return null
        dispatch({ type: 'ERROR', message: errorText(err, 'Chat failed. Please try again.') })
        return null
      })
      .finally(() => releaseTurn(turn))

  const requestGreeting = () => {
    const turn = beginTurn()
    void runChatTurn([{ role: 'user', content: '__GREET__' }], turn).then((greeting) => {
      if (!isCurrent(turn) && !turn.completed) return
      if (greeting?.fullText) greetingRef.current = greeting.fullText
      if (stateRef.current.phase === 'connecting') dispatch({ type: 'CONNECTED' })
    })
  }

  const showGreeting = (greetingText: string) => {
    dispatch({ type: 'REPLY_COMPLETE', fullText: greetingText, endCall: false })
    historyRef.current.push({ role: 'assistant', content: greetingText })
    dispatch({ type: 'CONNECTED' })
    enqueue(greetingText)
  }

  // ── Process recorded audio ────────────────────────────────────────────────────
  const processAudio = async (blob: Blob) => {
    const turn = beginTurn()
    const form = new FormData()
    form.append('audio', blob, audioFileName(blob))

    let userText: string
    try {
      const res  = await fetch(tenantScopedApiPath('/api/transcribe'), {
        method: 'POST',
        headers: embedHeadersRef.current,
        body: form,
        signal: turn.controller.signal,
      })
      const data = await readJsonResponse<TranscribeResponse>(res, '/api/transcribe')
      if (data.error) throw new Error(data.error)
      userText = data.text ?? ''
    } catch (err) {
      if (isCurrent(turn) && !isAbortError(err)) {
        console.error('[transcribe]', err)
        dispatch({ type: 'ERROR', message: 'Transcription failed. Please try again.' })
      }
      releaseTurn(turn)
      return
    }

    if (!isCurrent(turn)) return

    if (!userText.trim()) {
      releaseTurn(turn)
      dispatch({ type: 'CONNECTED' })
      return
    }

    dispatch({ type: 'TRANSCRIBED', text: userText })
    historyRef.current.push({ role: 'user', content: userText })
    saveConversationSnapshot([...historyRef.current])
    await runChatTurn(historyRef.current, turn)
  }

  // ── Audio recorder ───────────────────────────────────────────────────────────
  const { isRecording, hasSpeech, start: startRec, stop: stopRec } = useAudioRecorder({
    onAudioReady: (blob, hadSpeech) => {
      if (stateRef.current.phase !== 'listening') return // cancelled meanwhile
      if (!hadSpeech && blob.size < MIN_TRANSCRIBABLE_AUDIO_BYTES) {
        dispatch({ type: 'CONNECTED' })
        return
      }
      dispatch({ type: 'STOP_LISTENING' })
      void processAudio(blob)
    },
    onCancel: () => {
      if (stateRef.current.phase === 'listening') dispatch({ type: 'CONNECTED' })
    },
  })

  // Latest-closure refs: lets the public callbacks below stay referentially
  // stable (so memoized children don't re-render) while still calling the
  // current implementation.
  const implRef = useRef({ beginTurn, cancelActiveTurn, runChatTurn, saveConversationSnapshot, requestGreeting, showGreeting })
  useEffect(() => {
    implRef.current = { beginTurn, cancelActiveTurn, runChatTurn, saveConversationSnapshot, requestGreeting, showGreeting }
  })

  // ── Boot: load config + generate opening greeting ─────────────────────────────
  useEffect(() => {
    unmountedRef.current = false
    const parent = document.referrer || ''

    const headers: Record<string, string> = {}
    const params = new URLSearchParams(window.location.search)
    // Prefer props (SSR-forwarded) then fall back to URL params
    const resolvedTenant  = tenantId ?? params.get('tenant') ?? ''
    const resolvedToken   = token ?? params.get('token') ?? ''
    const resolvedSession = sessionToken ?? params.get('session') ?? ''
    if (resolvedTenant)  headers['x-embed-tenant']  = resolvedTenant
    if (resolvedToken)   headers['x-embed-token']   = resolvedToken
    if (resolvedSession) headers['x-embed-session'] = resolvedSession
    if (parent)          headers['x-embed-parent']  = parent
    embedHeadersRef.current = headers
    setEmbedHeaders(headers)

    const controller = new AbortController()
    let cancelled = false

    async function boot() {
      try {
        const cfg = await fetch('/api/config', { headers, signal: controller.signal })
          .then((r) => readJsonResponse<ConfigResponse>(r, '/api/config'))
        if (cancelled) return

        if (cfg.tenantId) {
          const pinnedHeaders = { ...headers, 'x-embed-tenant': cfg.tenantId }
          embedHeadersRef.current = pinnedHeaders
          setEmbedHeaders(pinnedHeaders)
        }
        if (cfg.voice)       setVoice(cfg.voice as OpenAIVoice)
        if (cfg.language)    setLang(cfg.language)
        if (cfg.agentName)   setAgent(cfg.agentName)
        if (cfg.companyName) setCompany(cfg.companyName)

        if (cfg.greeting) {
          // Use the exact configured greeting — guaranteed verbatim, no LLM
          greetingRef.current = cfg.greeting
          implRef.current.showGreeting(cfg.greeting)
        } else {
          implRef.current.requestGreeting()
        }
      } catch (err) {
        if (cancelled || isAbortError(err)) return
        console.error('[voice-agent boot]', err)
        dispatch({ type: 'ERROR', message: errorText(err, 'Agent connection failed. Please refresh and try again.') })
      }
    }

    const bootTimeout = window.setTimeout(() => {
      if (cancelled || stateRef.current.phase !== 'connecting') return
      console.warn('[voice-agent boot] timeout')
      implRef.current.cancelActiveTurn(false)
      dispatch({ type: 'ERROR', message: 'Agent connection timed out. Please refresh and try again.' })
    }, BOOT_TIMEOUT_MS)

    void boot()
    return () => {
      cancelled = true
      unmountedRef.current = true
      controller.abort()
      window.clearTimeout(bootTimeout)
      implRef.current.cancelActiveTurn(false)
    }
  // Boot exactly once per mount; credentials are read at boot time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Text send ─────────────────────────────────────────────────────────────────
  const sendText = useCallback((text: string) => {
    const trimmed = text.trim()
    const phase = stateRef.current.phase
    if (!trimmed) return
    if (phase !== 'idle' && phase !== 'error' && phase !== 'speaking') return

    primeAudio()
    if (phase === 'speaking') stopAll()

    const impl = implRef.current
    const turn = impl.beginTurn()
    dispatch({ type: 'TRANSCRIBED', text: trimmed })
    historyRef.current.push({ role: 'user', content: trimmed })
    impl.saveConversationSnapshot([...historyRef.current])
    void impl.runChatTurn(historyRef.current, turn)
  }, [dispatch, stopAll])

  const startListening = useCallback(() => {
    primeAudio()
    dispatch({ type: 'START_LISTENING' })   // instant visual feedback
    startRec().catch((err) => {
      pressStartedAtRef.current = null
      if (stateRef.current.phase === 'listening') {
        dispatch({ type: 'ERROR', message: errorText(err, 'Could not start the microphone.') })
      }
    })
  }, [dispatch, startRec])

  /** Stop speaking; the reply keeps streaming as text but is no longer voiced. */
  const interruptSpeech = useCallback(() => {
    if (turnRef.current) turnRef.current.muted = true
    stopAll()
  }, [stopAll])

  /** User-initiated stop (Stop button / close): also leave the speaking phase. */
  const stopPlayback = useCallback(() => {
    interruptSpeech()
    dispatch({ type: 'SPEAKING_DONE' })
  }, [dispatch, interruptSpeech])

  // ── Mic toggle (click / keyboard) ─────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const phase = stateRef.current.phase
    pressStartedAtRef.current = null
    if (phase === 'listening') {
      stopRec()
      return
    }
    if (phase === 'thinking') {
      implRef.current.cancelActiveTurn(true)
      stopAll()
      dispatch({ type: 'CONNECTED' })
      return
    }
    if (phase === 'speaking') {
      interruptSpeech()
      startListening()
      return
    }
    if (phase === 'idle' || phase === 'error') startListening()
  }, [dispatch, interruptSpeech, startListening, stopAll, stopRec])

  // ── Pointer: tap = hands-free (VAD auto-stop), hold = push-to-talk ───────────
  const pressMic = useCallback(() => {
    const phase = stateRef.current.phase
    if (phase === 'listening') {
      // Second tap while listening → send now
      pressStartedAtRef.current = null
      stopRec()
      return
    }
    if (phase === 'speaking') interruptSpeech()
    else if (phase !== 'idle' && phase !== 'error') return

    pressStartedAtRef.current = performance.now()
    startListening()
  }, [interruptSpeech, startListening, stopRec])

  const releaseMic = useCallback(() => {
    const startedAt = pressStartedAtRef.current
    pressStartedAtRef.current = null
    if (startedAt === null) return
    if (performance.now() - startedAt < TAP_THRESHOLD_MS) return // tap: keep listening
    stopRec()   // hold released → onAudioReady → transcribe → send
  }, [stopRec])

  const startNewChat = useCallback(() => {
    sessionIdRef.current += 1
    conversationIdRef.current = uid()
    pressStartedAtRef.current = null
    implRef.current.cancelActiveTurn(false)
    historyRef.current = []
    leadRef.current = EMPTY_LEAD
    stopRec()
    stopAll()
    dispatch({ type: 'RESET' })

    const greeting = greetingRef.current
    if (greeting) {
      implRef.current.showGreeting(greeting)
      return
    }
    implRef.current.requestGreeting()
  }, [dispatch, stopAll, stopRec])

  // Auto-restart once the summary is in AND the farewell has finished playing
  // (restarting earlier would cut the agent off mid-sentence).
  useEffect(() => {
    if (state.phase !== 'ended' || !state.callSummary || isPlaying) return

    const timer = window.setTimeout(startNewChat, AUTO_RESTART_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.callSummary, isPlaying, startNewChat])

  return {
    phase:        state.phase,
    transcript:   state.transcript,
    partialReply: state.partialReply,
    error:        state.error,
    isRecording,
    hasSpeech,
    isPlaying,
    isAutoplayBlocked,
    currentlyPlayingText,
    language,
    voice,
    leadData:     state.leadData,
    callSummary:  state.callSummary,
    agentName,
    companyName,
    setVoice:     handleSetVoice,
    stopPlayback,
    playMessage,
    playPendingAudio,
    toggleMic,
    pressMic,
    releaseMic,
    sendText,
    startNewChat,
  }
}
