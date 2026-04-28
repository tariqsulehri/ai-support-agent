import type { Phase } from '@/types'

interface Props {
  phase:        Phase
  isRecording:  boolean
  onPressDown:  () => void
  onPressUp:    () => void
}

export function MicButton({ phase, isRecording, onPressDown, onPressUp }: Props) {
  const state = getState(phase, isRecording)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.disabled) return
    e.preventDefault()          // prevents text-selection drag on desktop
    onPressDown()
  }

  const handlePointerUp = () => {
    if (state.disabled) return
    onPressUp()
  }

  return (
    <button
      type="button"
      disabled={state.disabled}
      title={state.title}
      aria-label={state.title}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}   // release if pointer leaves while held
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        select-none touch-none
        transition-all duration-150 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-ms-teal focus-visible:ring-offset-1
        ${state.cls}
      `}
    >
      {isRecording ? <RecordingIcon /> : <MicIcon active={!state.disabled} />}
    </button>
  )
}

function getState(phase: Phase, isRecording: boolean) {
  if (isRecording) return {
    cls:      'bg-ms-red scale-110',
    title:    'Release to send',
    disabled: false,
  }
  if (phase === 'thinking' || phase === 'transcribing' || phase === 'speaking') return {
    cls:      'bg-surface text-ms-muted cursor-not-allowed opacity-50',
    title:    'Processing…',
    disabled: true,
  }
  if (phase === 'ended' || phase === 'connecting') return {
    cls:      'bg-surface text-ms-muted cursor-not-allowed opacity-50',
    title:    '',
    disabled: true,
  }
  return {
    cls:      'bg-ms-teal-lt hover:bg-ms-teal-md active:scale-95',
    title:    'Hold to speak, release to send',
    disabled: false,
  }
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${active ? 'fill-ms-teal' : 'fill-ms-muted'}`}>
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm5 9a1 1 0 0 1 2 0 7 7 0 0 1-14 0 1 1 0 0 1 2 0 5 5 0 0 0 10 0zM11 19.93V22h2v-2.07A9 9 0 0 0 12 4v0" />
    </svg>
  )
}

function RecordingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white animate-pulse_dot">
      <circle cx="12" cy="12" r="5" />
    </svg>
  )
}
