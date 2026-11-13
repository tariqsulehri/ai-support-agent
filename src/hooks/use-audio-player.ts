'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseAudioPlayerOptions {
  requestHeaders?: Record<string, string>
  onPlaybackStart?: () => void
  onPlaybackEnd?:   () => void
  onPlaybackError?: (message: string) => void
}

interface UseAudioPlayerReturn {
  isPlaying:  boolean
  enqueue:    (text: string) => void
  stopAll:    () => void
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

/**
 * Sentence-pipeline audio player.
 *
 * Maintains an ordered queue of sentences. The moment a sentence is enqueued
 * its audio fetch is kicked off, so by the time the previous sentence finishes
 * playing the next clip is already in hand. Playback then advances with no
 * network round-trip in between — the agent reads across sentence breaks the
 * way a person speaks instead of stalling at every period.
 */
export function useAudioPlayer({
  requestHeaders,
  onPlaybackStart,
  onPlaybackEnd,
  onPlaybackError,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)

  const queueRef      = useRef<SpeechJob[]>([])
  const playingRef    = useRef(false)
  const currentAudio  = useRef<HTMLAudioElement | null>(null)
  const abortRef      = useRef(false)
  const inFlightControllersRef = useRef<Set<AbortController>>(new Set())
  const requestHeadersRef = useRef<Record<string, string>>(requestHeaders ?? {})
  requestHeadersRef.current = requestHeaders ?? {}

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

  const processQueue = useCallback(async () => {
    if (playingRef.current) return
    if (queueRef.current.length === 0) return

    playingRef.current = true
    abortRef.current   = false
    setIsPlaying(true)
    onPlaybackStart?.()

    while (queueRef.current.length > 0 && !abortRef.current) {
      const job = queueRef.current.shift()
      if (!job) continue

      let blob: Blob
      try {
        // Already in flight since enqueue — usually resolved by now.
        blob = await job.blob
      } catch (err) {
        // If playback was aborted or cancelled, ignore silently
        if (abortRef.current || isAbortError(err)) {
          continue
        }
        onPlaybackError?.(err instanceof Error ? err.message : String(err))
        continue
      }

      if (abortRef.current) break

      const url = URL.createObjectURL(blob)
      let playbackError: string | null = null

      await new Promise<void>((resolve) => {
        const audio = new Audio()
        currentAudio.current = audio
        let settled = false

        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          currentAudio.current = null
          audio.onended = null
          audio.onerror = null
          audio.pause()
          audio.removeAttribute('src')
          audio.load()

          // Allow the browser media pipeline time to release the blob before revocation
          window.setTimeout(() => {
            try {
              URL.revokeObjectURL(url)
            } catch {
              // ignore
            }
          }, 10_000)

          resolve()
        }

        const timeout = window.setTimeout(() => {
          finish()
        }, AUDIO_PLAYBACK_TIMEOUT_MS)

        audio.onended = finish
        audio.onerror = finish

        audio.src = url
        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            // Autoplay blocked by browser policy prior to user interaction.
            // Listen for the user's first click or touch, then immediately play this audio.
            const unlockAndPlay = () => {
              window.removeEventListener('click', unlockAndPlay, true)
              window.removeEventListener('pointerdown', unlockAndPlay, true)
              window.removeEventListener('keydown', unlockAndPlay, true)
              window.removeEventListener('touchstart', unlockAndPlay, true)
              if (!abortRef.current && currentAudio.current === audio) {
                audio.play().catch(() => finish())
              }
            }
            window.addEventListener('click', unlockAndPlay, { capture: true, once: true, passive: true })
            window.addEventListener('pointerdown', unlockAndPlay, { capture: true, once: true, passive: true })
            window.addEventListener('keydown', unlockAndPlay, { capture: true, once: true, passive: true })
            window.addEventListener('touchstart', unlockAndPlay, { capture: true, once: true, passive: true })
            return
          }

          if (!abortRef.current && !isAbortError(err)) {
            playbackError = err instanceof Error ? err.message : String(err)
          }
          finish()
        })
      })

      if (playbackError && !abortRef.current && !isAbortError(playbackError)) {
        onPlaybackError?.(playbackError)
      }
    }

    playingRef.current = false
    setIsPlaying(false)
    onPlaybackEnd?.()
  }, [onPlaybackStart, onPlaybackEnd, onPlaybackError])

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim()) return
      // Kick off the fetch now, not when this sentence reaches the front of the
      // queue, so the next clip is ready before the current one ends.
      const blob = fetchBlob(text)
      blob.catch(() => {}) // swallow unhandled rejection if aborted before played
      queueRef.current.push({ text, blob })
      processQueue()
    },
    [fetchBlob, processQueue]
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

    if (currentAudio.current) {
      const audio = currentAudio.current
      currentAudio.current = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    playingRef.current = false
    setIsPlaying(false)
  }, [])

  useEffect(() => stopAll, [stopAll])

  return { isPlaying, enqueue, stopAll }
}
