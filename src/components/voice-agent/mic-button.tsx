'use client'

import { memo, useRef, useState } from 'react'
import type { Phase } from '@/types'

interface Props {
  phase:        Phase
  isRecording:  boolean
  onPressDown:  () => void
  onPressUp:    () => void
  /** Keyboard activation (Enter/Space). Falls back to press/release when omitted. */
  onToggle?:    () => void
}

/**
 * Mic control. Tap to start hands-free listening (auto-sends after a pause),
 * tap again to send now; or hold to talk and release to send.
 */
export const MicButton = memo(function MicButton({ phase, isRecording, onPressDown, onPressUp, onToggle }: Props) {
  // Local pressed state gives same-frame visual feedback before the hook's
  // state round-trips (and before getUserMedia resolves).
  const [pressed, setPressed] = useState(false)
  const pressedRef = useRef(false)
  const state = getState(phase, isRecording)

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state.disabled || e.button !== 0) return
    e.preventDefault()          // prevents text-selection drag / focus steal
    // Keep receiving pointerup even if the finger/cursor drifts off the button
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    pressedRef.current = true
    setPressed(true)
    onPressDown()
  }

  const handlePointerEnd = () => {
    if (!pressedRef.current) return   // pointerup + lostpointercapture both fire
    pressedRef.current = false
    setPressed(false)
    onPressUp()
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Pointer interactions are handled above; detail === 0 means keyboard.
    if (e.detail !== 0 || state.disabled) return
    if (onToggle) onToggle()
    else { onPressDown(); onPressUp() }
  }

  const active = state.active || (pressed && !state.disabled)

  return (
    <button
      type="button"
      disabled={state.disabled}
      title={state.title}
      aria-label={state.title}
      aria-pressed={state.active}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}   // long-press on mobile
      className={`
        relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        select-none touch-none [-webkit-touch-callout:none]
        transition-[transform,background-color] duration-100 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-ms-blue focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${active ? 'bg-ms-red scale-105 animate-ring' : state.cls}
      `}
    >
      {active ? <RecordingIcon /> : <MicIcon muted={state.disabled} />}
    </button>
  )
})

function getState(phase: Phase, isRecording: boolean) {
  if (isRecording || phase === 'listening') return {
    active:   true,
    cls:      '',
    title:    'Stop and send',
    disabled: false,
  }
  if (phase === 'speaking') return {
    active:   false,
    cls:      'bg-ms-teal-lt hover:bg-ms-teal-md active:scale-95',
    title:    'Interrupt and speak',
    disabled: false,
  }
  if (phase === 'thinking' || phase === 'transcribing') return {
    active:   false,
    cls:      'bg-surface',
    title:    'Processing…',
    disabled: true,
  }
  if (phase === 'ended' || phase === 'connecting') return {
    active:   false,
    cls:      'bg-surface',
    title:    phase === 'ended' ? 'Call ended' : 'Connecting…',
    disabled: true,
  }
  return {
    active:   false,
    cls:      'bg-ms-teal-lt hover:bg-ms-teal-md active:scale-95',
    title:    'Tap to talk, or hold to speak',
    disabled: false,
  }
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`w-5 h-5 ${muted ? 'fill-ms-muted' : 'fill-ms-teal'}`}>
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm5 9a1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V20h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A7 7 0 0 1 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0z" />
    </svg>
  )
}

function RecordingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-white">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  )
}
