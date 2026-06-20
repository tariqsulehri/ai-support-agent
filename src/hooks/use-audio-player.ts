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

const TTS_FETCH_TIMEOUT_MS = 12_000
const AUDIO_PLAYBACK_TIMEOUT_MS = 45_000

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
  const requestHeadersRef = useRef<Record<string, string>>(requestHeaders ?? {})
  requestHeadersRef.current = requestHeaders ?? {}

  const fetchBlob = useCallback(async (text: string): Promise<Blob> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS)

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
        onPlaybackError?.(err instanceof Error ? err.message : String(err))
        continue
      }

      if (abortRef.current) break

      const url = URL.createObjectURL(blob)
      let playbackError: string | null = null

      await new Promise<void>((resolve) => {
        const audio = new Audio(url)
        currentAudio.current = audio
        let settled = false

        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          URL.revokeObjectURL(url)
          currentAudio.current = null
          resolve()
        }

        const timeout = window.setTimeout(() => {
          audio.pause()
          finish()
        }, AUDIO_PLAYBACK_TIMEOUT_MS)

        audio.onended = finish
        audio.onerror = finish

        audio.play().catch((err) => {
          playbackError = err instanceof Error ? err.message : String(err)
          finish()
        })
      })

      if (playbackError) onPlaybackError?.(playbackError)
    }

    playingRef.current = false
    setIsPlaying(false)
    onPlaybackEnd?.()
  }, [fetchBlob, onPlaybackStart, onPlaybackEnd, onPlaybackError])

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

    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }

    playingRef.current = false
    setIsPlaying(false)
  }, [])

  useEffect(() => stopAll, [stopAll])

  return { isPlaying, enqueue, stopAll }
}
