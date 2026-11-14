/**
 * Browser Audio Activation & Unlock Utility
 *
 * Browsers enforce strict autoplay policies requiring user activation
 * before unmuted audio can play. Running primeAudio() synchronously inside
 * any user gesture (click, tap, keydown) activates the document's audio
 * subsystem so subsequent asynchronous speech playback is allowed.
 */

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

let sharedAudioContext: AudioContext | null = null

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!sharedAudioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      try {
        sharedAudioContext = new AudioCtx()
      } catch {
        // ignore
      }
    }
  }
  return sharedAudioContext
}

export function primeAudio(): void {
  if (typeof window === 'undefined') return

  // 1. Resume shared AudioContext if suspended
  const ctx = getSharedAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  // 2. Play and immediately pause a 0.01s silent WAV buffer on a dummy audio element
  try {
    const audio = new Audio(SILENT_WAV)
    audio.volume = 0
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audio.pause()
        audio.src = ''
      }).catch(() => {})
    }
  } catch {
    // ignore
  }
}

export function isUserGestureActive(): boolean {
  if (typeof navigator === 'undefined') return false
  const userAct = (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }).userActivation
  return Boolean(userAct?.hasBeenActive)
}
