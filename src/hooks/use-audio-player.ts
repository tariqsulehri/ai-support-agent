'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { primeAudio } from '@/lib/utils/audio-unlock'

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

const TTS_FETCH_TIMEOUT_MS = 30_000
const AUDIO_PLAYBACK_TIMEOUT_MS = 45_000

function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error) {
    return /abort|aborted|canceled|cancelled/i.test(err.message) || err.name === 'AbortError'
  }
  return typeof err === 'string' && /abort|aborted|canceled|cancelled/i.test(err)
}

function isAutoplayBlocked(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException && err.name === 'NotAllowedError') return true
  const msg = err instanceof Error ? err.message : String(err)
  return /notallowed|allowed|interact|gesture|play\(\)/i.test(msg)
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
 * the player stashes the buffered clip, cleanly releases the queue lock (so
 * app state remains responsive), and plays the audio instantly the moment
 * any user gesture (click, tap, key) occurs.
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

  const queueRef               = useRef<SpeechJob[]>([])
  const playingRef             = useRef(false)
  const currentAudio           = useRef<HTMLAudioElement | null>(null)
  const abortRef               = useRef(false)
  const inFlightControllersRef  = useRef<Set<AbortController>>(new Set())
  const activeUrlsRef          = useRef<Set<string>>(new Set())
  const pendingAutoplayRef     = useRef<PendingAutoplayAudio | null>(null)

  const requestHeadersRef = useRef<Record<string, string>>(requestHeaders ?? {})
  requestHeadersRef.current = requestHeaders ?? {}

  const onPlaybackStartRef = useRef(onPlaybackStart)
  onPlaybackStartRef.current = onPlaybackStart

  const onPlaybackEndRef = useRef(onPlaybackEnd)
  onPlaybackEndRef.current = onPlaybackEnd

  const onPlaybackErrorRef = useRef(onPlaybackError)
  onPlaybackErrorRef.current = onPlaybackError

  const createSafeObjectUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob)
    activeUrlsRef.current.add(url)
    return url
  }, [])

  const revokeSafeObjectUrl = useCallback((url: string) => {
    if (!url) return
    // Allow the browser media pipeline time to finish before revocation
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
      activeUrlsRef.current.delete(url)
    }, 5_000)
  }, [])

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

  // ── Immediately play any stashed audio when user interacts ────────────────
  const playPendingAudio = useCallback(() => {
    const pending = pendingAutoplayRef.current
    if (!pending || abortRef.current) return

    pendingAutoplayRef.current = null
    setIsAutoplayBlockedState(false)
    primeAudio()

    const { audio, url, text } = pending
    currentAudio.current = audio
    playingRef.current = true
    setIsPlaying(true)
    setCurrentlyPlayingText(text)
    onPlaybackStartRef.current?.()

    const finish = () => {
      currentAudio.current = null
      playingRef.current = false
      setIsPlaying(false)
      setCurrentlyPlayingText(null)
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
      revokeSafeObjectUrl(url)
      onPlaybackEndRef.current?.()
    }

    audio.onended = finish
    audio.onerror = finish

    try {
      audio.currentTime = 0
    } catch {
      // ignore
    }

    audio.play().catch((err) => {
      if (!isAbortError(err)) {
        console.warn('[voice playback] user interaction playback failed:', err)
      }
      finish()
    })
  }, [revokeSafeObjectUrl])

  // ── Arm one-time document gesture listener ────────────────────────────────
  const armUserInteractionUnlock = useCallback(() => {
    const handleGesture = () => {
      window.removeEventListener('click', handleGesture, true)
      window.removeEventListener('pointerdown', handleGesture, true)
      window.removeEventListener('keydown', handleGesture, true)
      window.removeEventListener('touchstart', handleGesture, true)

      if (pendingAutoplayRef.current) {
        playPendingAudio()
      }
    }

    window.addEventListener('click', handleGesture, { capture: true, once: true, passive: true })
    window.addEventListener('pointerdown', handleGesture, { capture: true, once: true, passive: true })
    window.addEventListener('keydown', handleGesture, { capture: true, once: true, passive: true })
    window.addEventListener('touchstart', handleGesture, { capture: true, once: true, passive: true })
  }, [playPendingAudio])

  // ── Queue processor ────────────────────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (playingRef.current) return
    if (queueRef.current.length === 0) return

    playingRef.current = true
    abortRef.current   = false

    while (queueRef.current.length > 0 && !abortRef.current) {
      const job = queueRef.current.shift()
      if (!job) continue

      let blob: Blob
      try {
        // Fetch was kicked off at enqueue time — usually ready by now
        blob = await job.blob
      } catch (err) {
        if (abortRef.current || isAbortError(err)) {
          continue
        }
        onPlaybackErrorRef.current?.(err instanceof Error ? err.message : String(err))
        continue
      }

      if (abortRef.current) break

      const url = createSafeObjectUrl(blob)
      let playbackError: string | null = null

      await new Promise<void>((resolve) => {
        const audio = new Audio()
        currentAudio.current = audio
        let settled = false

        const finish = (isAutoplay = false) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          audio.onended = null
          audio.onerror = null

          if (!isAutoplay) {
            currentAudio.current = null
            audio.pause()
            audio.src = ''
            revokeSafeObjectUrl(url)
          }

          resolve()
        }

        const timeout = window.setTimeout(() => finish(false), AUDIO_PLAYBACK_TIMEOUT_MS)

        audio.onended = () => finish(false)
        audio.onerror = () => finish(false)

        audio.src = url
        setIsPlaying(true)
        setCurrentlyPlayingText(job.text)
        onPlaybackStartRef.current?.()

        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            // Autoplay blocked by browser policy prior to user interaction.
            // Stash the loaded audio element so user gesture triggers it with zero lag.
            pendingAutoplayRef.current = { audio, url, text: job.text }
            setIsAutoplayBlockedState(true)
            setIsPlaying(false)
            setCurrentlyPlayingText(null)
            onPlaybackEndRef.current?.()
            armUserInteractionUnlock()
            finish(true)
            return
          }

          if (!abortRef.current && !isAbortError(err)) {
            playbackError = err instanceof Error ? err.message : String(err)
          }
          finish(false)
        })
      })

      if (playbackError && !abortRef.current && !isAbortError(playbackError)) {
        onPlaybackErrorRef.current?.(playbackError)
      }
    }

    if (!pendingAutoplayRef.current) {
      playingRef.current = false
      setIsPlaying(false)
      setCurrentlyPlayingText(null)
      onPlaybackEndRef.current?.()
    }
  }, [createSafeObjectUrl, revokeSafeObjectUrl, armUserInteractionUnlock])

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const blob = fetchBlob(text)
      blob.catch(() => {}) // swallow unhandled rejection if aborted
      queueRef.current.push({ text, blob })
      processQueue()
    },
    [fetchBlob, processQueue]
  )

  const playMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return

      // If this exact text is stashed as pending autoplay audio, play it immediately from memory
      if (pendingAutoplayRef.current && pendingAutoplayRef.current.text === text) {
        playPendingAudio()
        return
      }

      // Otherwise stop any active playback and enqueue this message to play
      stopAll()
      enqueue(text)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playPendingAudio, enqueue]
  )

  const stopAll = useCallback(() => {
    abortRef.current = true
    queueRef.current = []

    // Abort all in-flight fetch requests
    for (const controller of inFlightControllersRef.current) {
      try {
        controller.abort(new Error('Audio playback stopped'))
      } catch {
        // ignore
      }
    }
    inFlightControllersRef.current.clear()

    // Clear pending autoplay buffer if any
    if (pendingAutoplayRef.current) {
      const pending = pendingAutoplayRef.current
      pendingAutoplayRef.current = null
      setIsAutoplayBlockedState(false)
      pending.audio.pause()
      pending.audio.src = ''
      revokeSafeObjectUrl(pending.url)
    }

    if (currentAudio.current) {
      const audio = currentAudio.current
      currentAudio.current = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
    }

    playingRef.current = false
    setIsPlaying(false)
    setCurrentlyPlayingText(null)
  }, [revokeSafeObjectUrl])

  useEffect(() => stopAll, [stopAll])

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
