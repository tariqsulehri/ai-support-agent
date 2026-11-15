'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { primeAudio } from '@/lib/utils/audio-unlock'
import { isAbortError } from './voice-agent-http'

interface UseAudioPlayerOptions {
  requestHeaders?: Record<string, string>
  onPlaybackStart?: () => void
  onPlaybackEnd?:   () => void
  onPlaybackError?: (message: string) => void
}

export interface UseAudioPlayerReturn {
  isPlaying:             boolean
  isAutoplayBlocked:     boolean
  currentlyPlayingText:  string | null
  enqueue:               (text: string) => void
  playMessage:           (text: string) => void
  playPendingAudio:      () => void
  stopAll:               () => void
}

const TTS_FETCH_TIMEOUT_MS      = 30_000
const AUDIO_PLAYBACK_TIMEOUT_MS = 45_000
const URL_REVOKE_DELAY_MS       = 5_000
const GESTURE_EVENTS = ['click', 'pointerdown', 'keydown', 'touchstart'] as const

function isAutoplayBlocked(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException && err.name === 'NotAllowedError') return true
  const msg = err instanceof Error ? err.message : String(err)
  return /notallowed|allowed|interact|gesture|play\(\)/i.test(msg)
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** A queued sentence whose audio is fetched eagerly, before its turn to play. */
interface SpeechJob {
  text: string
  blob: Promise<Blob>
}

interface PendingAutoplayAudio {
  audio: HTMLAudioElement
  url:   string
  text:  string
}

/**
 * Sentence-pipeline audio player with proactive autoplay policy recovery.
 *
 * Maintains an ordered queue of sentences. The moment a sentence is enqueued
 * its audio fetch is kicked off, so by the time the previous sentence finishes
 * playing the next clip is already in hand.
 *
 * If browser autoplay policy blocks unmuted speech prior to user interaction,
 * the player stashes the buffered clip, pauses the queue (so app state remains
 * responsive), and resumes from that clip the moment any user gesture occurs.
 *
 * Every queue run is tagged with a generation number. stopAll() bumps the
 * generation and settles the in-flight clip, so a stale loop can never keep
 * playing alongside a fresh one after a quick stop → play.
 */
export function useAudioPlayer({
  requestHeaders,
  onPlaybackStart,
  onPlaybackEnd,
  onPlaybackError,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAutoplayBlockedState, setIsAutoplayBlockedState] = useState(false)
  const [currentlyPlayingText, setCurrentlyPlayingText] = useState<string | null>(null)

  const queueRef              = useRef<SpeechJob[]>([])
  const playingRef            = useRef(false)
  const generationRef         = useRef(0)
  const cancelCurrentRef      = useRef<(() => void) | null>(null)
  const inFlightControllersRef = useRef<Set<AbortController>>(new Set())
  const activeUrlsRef         = useRef<Set<string>>(new Set())
  const revokeTimersRef       = useRef<Set<number>>(new Set())
  const pendingAutoplayRef    = useRef<PendingAutoplayAudio | null>(null)
  const disarmGestureRef      = useRef<(() => void) | null>(null)
  const unmountedRef          = useRef(false)

  // Latest props in refs: callbacks stay stable and async code reads fresh values.
  const requestHeadersRef  = useRef<Record<string, string>>(requestHeaders ?? {})
  const onPlaybackStartRef = useRef(onPlaybackStart)
  const onPlaybackEndRef   = useRef(onPlaybackEnd)
  const onPlaybackErrorRef = useRef(onPlaybackError)
  useEffect(() => {
    requestHeadersRef.current  = requestHeaders ?? {}
    onPlaybackStartRef.current = onPlaybackStart
    onPlaybackEndRef.current   = onPlaybackEnd
    onPlaybackErrorRef.current = onPlaybackError
  })

  // ── Object URL bookkeeping ─────────────────────────────────────────────────
  const createObjectUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob)
    activeUrlsRef.current.add(url)
    return url
  }, [])

  const revokeObjectUrl = useCallback((url: string) => {
    if (!url) return
    // Allow the browser media pipeline time to finish before revocation
    const timer = window.setTimeout(() => {
      revokeTimersRef.current.delete(timer)
      URL.revokeObjectURL(url)
      activeUrlsRef.current.delete(url)
    }, URL_REVOKE_DELAY_MS)
    revokeTimersRef.current.add(timer)
  }, [])

  const releaseAudio = useCallback((audio: HTMLAudioElement, url: string) => {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    revokeObjectUrl(url)
  }, [revokeObjectUrl])

  // ── TTS fetch ──────────────────────────────────────────────────────────────
  const fetchBlob = useCallback(async (text: string): Promise<Blob> => {
    const controller = new AbortController()
    inFlightControllersRef.current.add(controller)
    const timeout = window.setTimeout(() => {
      controller.abort(new Error('TTS synthesis fetch timed out'))
    }, TTS_FETCH_TIMEOUT_MS)

    try {
      const res = await fetch('/api/speak', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...requestHeadersRef.current },
        body:    JSON.stringify({ text }),
        signal:  controller.signal,
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail.trim() || `/api/speak failed (${res.status})`)
      }
      return await res.blob()
    } finally {
      window.clearTimeout(timeout)
      inFlightControllersRef.current.delete(controller)
    }
  }, [])

  const disarmGesture = useCallback(() => {
    disarmGestureRef.current?.()
    disarmGestureRef.current = null
  }, [])

  const markIdle = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    setCurrentlyPlayingText(null)
    onPlaybackEndRef.current?.()
  }, [])

  /**
   * Plays one clip to completion. Resolves with:
   *  - 'done'    when it ended, errored or was cancelled
   *  - 'blocked' when autoplay policy refused it (clip is stashed)
   */
  const playClip = useCallback(
    (audio: HTMLAudioElement, url: string, text: string, generation: number): Promise<'done' | 'blocked'> =>
      new Promise((resolve) => {
        let settled = false
        const settle = (outcome: 'done' | 'blocked', error?: string) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          if (cancelCurrentRef.current === cancel) cancelCurrentRef.current = null
          if (outcome === 'done') releaseAudio(audio, url)
          if (error && generation === generationRef.current) onPlaybackErrorRef.current?.(error)
          resolve(outcome)
        }
        const cancel = () => settle('done')
        cancelCurrentRef.current = cancel

        const timeout = window.setTimeout(() => settle('done'), AUDIO_PLAYBACK_TIMEOUT_MS)
        audio.onended = () => settle('done')
        audio.onerror = () => settle('done', 'Audio could not be decoded')

        if (!audio.src) audio.src = url
        try { audio.currentTime = 0 } catch { /* not seekable yet */ }

        playingRef.current = true
        setIsPlaying(true)
        setCurrentlyPlayingText(text)
        onPlaybackStartRef.current?.()

        audio.play().catch((err) => {
          if (settled) return
          if (isAutoplayBlocked(err)) {
            settle('blocked')
            return
          }
          settle('done', isAbortError(err) ? undefined : errorMessage(err))
        })
      }),
    [releaseAudio],
  )

  // Forward reference so the gesture handler can resume the queue.
  const processQueueRef = useRef<() => void>(() => {})

  // ── Play stashed (autoplay-blocked) audio, then resume the queue ──────────
  const playPendingAudio = useCallback(() => {
    const pending = pendingAutoplayRef.current
    if (!pending || unmountedRef.current) return

    pendingAutoplayRef.current = null
    disarmGesture()
    setIsAutoplayBlockedState(false)
    primeAudio()

    const generation = generationRef.current
    // play() is invoked synchronously inside the gesture (Safari requirement).
    void playClip(pending.audio, pending.url, pending.text, generation).then((outcome) => {
      if (generation !== generationRef.current) return
      if (outcome === 'blocked') {
        // Still blocked — keep it stashed for the next gesture.
        pendingAutoplayRef.current = pending
        setIsAutoplayBlockedState(true)
        markIdle()
        return
      }
      playingRef.current = false
      if (queueRef.current.length > 0) processQueueRef.current()
      else markIdle()
    })
  }, [disarmGesture, markIdle, playClip])

  // ── Arm one-time document gesture listener ────────────────────────────────
  const armUserInteractionUnlock = useCallback(() => {
    if (disarmGestureRef.current) return // already armed

    const handleGesture = () => {
      disarmGesture()
      if (pendingAutoplayRef.current) playPendingAudio()
    }
    for (const type of GESTURE_EVENTS) {
      window.addEventListener(type, handleGesture, { capture: true, passive: true })
    }
    disarmGestureRef.current = () => {
      for (const type of GESTURE_EVENTS) {
        window.removeEventListener(type, handleGesture, { capture: true })
      }
    }
  }, [disarmGesture, playPendingAudio])

  // ── Queue processor ────────────────────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (playingRef.current || pendingAutoplayRef.current) return
    if (queueRef.current.length === 0) return

    const generation = generationRef.current
    const isStale = () => generation !== generationRef.current || unmountedRef.current
    playingRef.current = true

    while (queueRef.current.length > 0 && !isStale()) {
      const job = queueRef.current.shift()
      if (!job) continue

      let blob: Blob
      try {
        // Fetch was kicked off at enqueue time — usually ready by now
        blob = await job.blob
      } catch (err) {
        if (!isStale() && !isAbortError(err)) onPlaybackErrorRef.current?.(errorMessage(err))
        continue
      }
      if (isStale()) return

      const url   = createObjectUrl(blob)
      const audio = new Audio()
      const outcome = await playClip(audio, url, job.text, generation)
      if (isStale()) return

      if (outcome === 'blocked') {
        // Stash the loaded clip; the rest of the queue waits for a gesture.
        pendingAutoplayRef.current = { audio, url, text: job.text }
        setIsAutoplayBlockedState(true)
        armUserInteractionUnlock()
        markIdle()
        return
      }
    }

    if (!isStale()) markIdle()
  }, [armUserInteractionUnlock, createObjectUrl, markIdle, playClip])

  useEffect(() => {
    processQueueRef.current = () => { void processQueue() }
  }, [processQueue])

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim() || unmountedRef.current) return
      const blob = fetchBlob(text)
      blob.catch(() => {}) // handled in processQueue; avoid unhandled rejection
      queueRef.current.push({ text, blob })
      void processQueue()
    },
    [fetchBlob, processQueue],
  )

  const stopAll = useCallback(() => {
    generationRef.current += 1
    queueRef.current = []
    disarmGesture()

    // Abort all in-flight TTS requests
    for (const controller of inFlightControllersRef.current) {
      controller.abort(new Error('Audio playback stopped'))
    }
    inFlightControllersRef.current.clear()

    // Drop any stashed autoplay clip
    const pending = pendingAutoplayRef.current
    if (pending) {
      pendingAutoplayRef.current = null
      setIsAutoplayBlockedState(false)
      releaseAudio(pending.audio, pending.url)
    }

    // Settle the clip that is playing right now (releases its element + URL)
    cancelCurrentRef.current?.()
    cancelCurrentRef.current = null

    playingRef.current = false
    setIsPlaying(false)
    setCurrentlyPlayingText(null)
  }, [disarmGesture, releaseAudio])

  const playMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return

      // If this exact text is stashed as pending autoplay audio, play it immediately from memory
      if (pendingAutoplayRef.current?.text === text) {
        playPendingAudio()
        return
      }

      // Otherwise stop any active playback and play this message. Show it as
      // "playing" right away so the click has instant feedback while TTS loads.
      stopAll()
      primeAudio()
      setCurrentlyPlayingText(text)
      enqueue(text)
    },
    [enqueue, playPendingAudio, stopAll],
  )

  // Full teardown on unmount: no audio may outlive the widget.
  useEffect(() => {
    unmountedRef.current = false
    const activeUrls   = activeUrlsRef.current
    const revokeTimers = revokeTimersRef.current
    return () => {
      unmountedRef.current = true
      stopAll()
      for (const timer of revokeTimers) window.clearTimeout(timer)
      revokeTimers.clear()
      for (const url of activeUrls) URL.revokeObjectURL(url)
      activeUrls.clear()
    }
  }, [stopAll])

  return {
    isPlaying,
    isAutoplayBlocked: isAutoplayBlockedState,
    currentlyPlayingText,
    enqueue,
    playMessage,
    playPendingAudio,
    stopAll,
  }
}
