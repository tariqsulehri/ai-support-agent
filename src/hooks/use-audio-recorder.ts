'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAudioRecorderOptions {
  /** RMS level below which silence is declared (0–128 scale). Default 3. */
  silenceThreshold?: number
  /**
   * Milliseconds of silence that triggers auto-stop AFTER speech has been
   * detected. Default 1000ms.
   */
  silenceAfterSpeech?: number
  /**
   * Milliseconds to wait for the user to START speaking before auto-stopping.
   * Prevents cutting off someone who clicked mic but needs a moment to think.
   * Default 3000ms.
   */
  preSpeechTimeout?: number
  onAudioReady: (blob: Blob, hadSpeech: boolean) => void
  /**
   * Called when stop() lands while the microphone was still being acquired
   * (e.g. a very quick tap or a release during the permission prompt). No audio
   * is produced in that case.
   */
  onCancel?: () => void
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  hasSpeech:   boolean   // true once voice activity detected — useful for UI hints
  start: () => Promise<void>
  stop:  () => void
}

const VAD_TICK_MS = 100

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found. Please connect one and try again.'
  }
  if (name === 'NotReadableError') {
    return 'Your microphone is in use by another app. Please close it and try again.'
  }
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return 'Voice input is not supported in this browser. Please type your message instead.'
  }
  return 'Microphone access denied. Please allow microphone in browser settings.'
}

/** Everything that belongs to a single recording session. */
interface RecordingSession {
  id:        number
  stream:    MediaStream | null
  recorder:  MediaRecorder | null
  audioCtx:  AudioContext | null
  vadTimer:  ReturnType<typeof setInterval> | null
  hadSpeech: boolean
}

/** Releases analysis resources (timer + AudioContext). */
function releaseAnalysis(session: RecordingSession) {
  if (session.vadTimer) {
    clearInterval(session.vadTimer)
    session.vadTimer = null
  }
  if (session.audioCtx) {
    session.audioCtx.close().catch(() => {})
    session.audioCtx = null
  }
}

function releaseStream(session: RecordingSession) {
  session.stream?.getTracks().forEach((track) => track.stop())
  session.stream = null
}

/**
 * Two-tier VAD:
 *  Phase 1 (pre-speech): waits up to `preSpeechTimeout` ms for voice to start.
 *  Phase 2 (post-speech): cuts after `silenceAfterSpeech` ms of continuous silence.
 *
 * Robustness guarantees:
 *  - start() is idempotent while a session is starting/active.
 *  - stop() during microphone acquisition cancels cleanly (onCancel) instead of
 *    leaving a recording running in the background.
 *  - Streams, AudioContexts and timers are always released, including on unmount.
 */
export function useAudioRecorder({
  silenceThreshold   = 3,
  silenceAfterSpeech = 1000,
  preSpeechTimeout   = 3000,
  onAudioReady,
  onCancel,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeech,   setHasSpeech]   = useState(false)

  const sessionRef  = useRef<RecordingSession | null>(null)
  const nextIdRef   = useRef(0)
  const disposedRef = useRef(false)

  // Callbacks live in refs so start/stop keep a stable identity across renders.
  const onAudioReadyRef = useRef(onAudioReady)
  const onCancelRef     = useRef(onCancel)
  useEffect(() => {
    onAudioReadyRef.current = onAudioReady
    onCancelRef.current     = onCancel
  })

  const vadRef = useRef({ silenceThreshold, silenceAfterSpeech, preSpeechTimeout })
  useEffect(() => {
    vadRef.current = { silenceThreshold, silenceAfterSpeech, preSpeechTimeout }
  }, [silenceThreshold, silenceAfterSpeech, preSpeechTimeout])

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null

    releaseAnalysis(session)
    setIsRecording(false)
    setHasSpeech(false)

    const recorder = session.recorder
    if (recorder && recorder.state !== 'inactive') {
      // onstop releases the stream and delivers the audio
      recorder.stop()
      return
    }

    // Still acquiring the mic (or recorder never started): nothing to deliver.
    releaseStream(session)
    if (!disposedRef.current) onCancelRef.current?.()
  }, [])

  const start = useCallback(async () => {
    if (sessionRef.current) return // already starting or recording

    const session: RecordingSession = {
      id: ++nextIdRef.current,
      stream: null,
      recorder: null,
      audioCtx: null,
      vadTimer: null,
      hadSpeech: false,
    }
    sessionRef.current = session

    let stream: MediaStream
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch (err) {
      if (sessionRef.current === session) sessionRef.current = null
      throw new Error(micErrorMessage(err))
    }

    // stop() was called (or we unmounted) while waiting for permission.
    if (sessionRef.current !== session || disposedRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }
    session.stream = stream

    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      sessionRef.current = null
      releaseStream(session)
      throw new Error('Voice recording is not supported in this browser. Please type your message instead.')
    }
    session.recorder = recorder

    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      releaseStream(session)
      if (disposedRef.current) return
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
      onAudioReadyRef.current(blob, session.hadSpeech)
    }

    recorder.start(VAD_TICK_MS)
    setIsRecording(true)
    setHasSpeech(false)

    // ── Two-tier VAD ───────────────────────────────────────────────────────────
    // Only one state update ever happens here (hasSpeech → true); the per-tick
    // analysis stays in local variables so it never re-renders the widget.
    try {
      const audioCtx = new AudioContext()
      session.audioCtx = audioCtx
      // Contexts created outside a gesture may start suspended (Safari) which
      // would make the analyser read pure silence and auto-stop early.
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      audioCtx.createMediaStreamSource(stream).connect(analyser)

      const data   = new Uint8Array(analyser.fftSize)
      let silentMs = 0
      let waitedMs = 0

      session.vadTimer = setInterval(() => {
        if (sessionRef.current !== session) return
        const { silenceThreshold: threshold, silenceAfterSpeech: afterSpeech, preSpeechTimeout: preSpeech } =
          vadRef.current

        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = data[i] - 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)

        if (rms >= threshold) {
          if (!session.hadSpeech) {
            session.hadSpeech = true
            setHasSpeech(true)
          }
          silentMs = 0
        } else if (!session.hadSpeech) {
          waitedMs += VAD_TICK_MS
          if (waitedMs >= preSpeech) stop()
        } else {
          silentMs += VAD_TICK_MS
          if (silentMs >= afterSpeech) stop()
        }
      }, VAD_TICK_MS)
    } catch (err) {
      // VAD is an enhancement; recording still works with a manual stop.
      console.warn('[audio recorder] voice activity detection unavailable:', err)
      releaseAnalysis(session)
    }
  }, [stop])

  // Release everything on unmount (and re-arm for StrictMode remounts).
  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      const session = sessionRef.current
      sessionRef.current = null
      if (!session) return
      releaseAnalysis(session)
      if (session.recorder) {
        session.recorder.ondataavailable = null
        session.recorder.onstop = null
        if (session.recorder.state !== 'inactive') {
          try { session.recorder.stop() } catch { /* ignore */ }
        }
      }
      releaseStream(session)
    }
  }, [])

  return { isRecording, hasSpeech, start, stop }
}
