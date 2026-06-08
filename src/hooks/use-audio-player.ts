'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseAudioPlayerOptions {
  requestHeaders?: Record<string, string>
  onPlaybackStart?: () => void
  onPlaybackEnd?:   () => void
}

interface UseAudioPlayerReturn {
  isPlaying:  boolean
  enqueue:    (text: string) => void
  stopAll:    () => void
}

const TTS_FETCH_TIMEOUT_MS = 12_000
const AUDIO_PLAYBACK_TIMEOUT_MS = 45_000

/**
 * Sentence-pipeline audio player.
 *
 * Maintains an ordered queue of text sentences.
 * For each sentence it:
 *   1. Fetches audio from /api/speak
 *   2. Plays it immediately via HTML Audio
 *   3. Advances to the next sentence when done
 *
 * This creates a low-latency pipeline: the first sentence plays while
 * subsequent sentences are still being fetched.
 */
export function useAudioPlayer({
  requestHeaders,
  onPlaybackStart,
  onPlaybackEnd,
}: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)

  const queueRef      = useRef<string[]>([])
  const playingRef    = useRef(false)
  const currentAudio  = useRef<HTMLAudioElement | null>(null)
  const abortRef      = useRef(false)
  const requestHeadersRef = useRef<Record<string, string>>(requestHeaders ?? {})
  requestHeadersRef.current = requestHeaders ?? {}

  const fetchBlob = useCallback(async (text: string): Promise<Blob | null> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS)

    try {
      const res = await fetch('/api/speak', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...requestHeadersRef.current },
        body:    JSON.stringify({ text }),
        signal:  controller.signal,
      })
      if (!res.ok) return null
      return await res.blob()
    } catch {
      return null
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
      const text = queueRef.current.shift()
      if (!text) continue

      const blob = await fetchBlob(text)
      if (abortRef.current) break
      if (!blob) continue

      const url = URL.createObjectURL(blob)

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

        audio.play().catch(() => {
          finish()
        })
      })
    }

    playingRef.current = false
    setIsPlaying(false)
    onPlaybackEnd?.()
  }, [fetchBlob, onPlaybackStart, onPlaybackEnd])

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim()) return
      queueRef.current.push(text)
      processQueue()
    },
    [processQueue]
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
