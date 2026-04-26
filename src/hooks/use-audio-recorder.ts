'use client'

import { useRef, useState, useCallback } from 'react'

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
  onAudioReady: (blob: Blob) => void
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  hasSpeech:   boolean   // true once voice activity detected — useful for UI hints
  start: () => Promise<void>
  stop:  () => void
}

/**
 * Two-tier VAD:
 *  Phase 1 (pre-speech): waits up to `preSpeechTimeout` ms for voice to start.
 *  Phase 2 (post-speech): cuts after `silenceAfterSpeech` ms of continuous silence.
 *
 * This prevents both:
 *  - Cutting off before the user starts talking
 *  - Staying open forever if they pause mid-thought
 */
export function useAudioRecorder({
  silenceThreshold  = 3,
  silenceAfterSpeech = 1000,
  preSpeechTimeout  = 3000,
  onAudioReady,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [hasSpeech,   setHasSpeech]   = useState(false)

  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current)
      vadTimerRef.current = null
    }
    audioCtxRef.current?.close()
    audioCtxRef.current = null

    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop()
    }
    setIsRecording(false)
    setHasSpeech(false)
  }, [])

  const start = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      throw new Error('Microphone access denied. Please allow microphone in browser settings.')
    }

    chunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const rec = new MediaRecorder(stream, { mimeType })
    mediaRecRef.current = rec

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: mimeType })
      onAudioReady(blob)
    }

    rec.start(100)
    setIsRecording(true)
    setHasSpeech(false)

    // ── Two-tier VAD ───────────────────────────────────────────────────────────
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512

    const src = audioCtx.createMediaStreamSource(stream)
    src.connect(analyser)

    const data     = new Uint8Array(analyser.fftSize)
    let speechDetected = false  // has the user started speaking?
    let silentMs       = 0      // consecutive ms of silence after speech
    let waitedMs       = 0      // ms waited for speech to begin

    vadTimerRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(data)
      const rms = Math.sqrt(
        data.reduce((sum, v) => sum + (v - 128) ** 2, 0) / data.length
      )

      if (rms >= silenceThreshold) {
        // Voice detected
        if (!speechDetected) {
          speechDetected = true
          setHasSpeech(true)
        }
        silentMs = 0
      } else {
        // Silence
        if (!speechDetected) {
          // Phase 1: still waiting for user to start
          waitedMs += 100
          if (waitedMs >= preSpeechTimeout) stop()
        } else {
          // Phase 2: user was speaking, now silent
          silentMs += 100
          if (silentMs >= silenceAfterSpeech) stop()
        }
      }
    }, 100)
  }, [silenceThreshold, silenceAfterSpeech, preSpeechTimeout, onAudioReady, stop])

  return { isRecording, hasSpeech, start, stop }
}
