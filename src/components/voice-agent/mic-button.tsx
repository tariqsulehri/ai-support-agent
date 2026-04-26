import type { Phase } from '@/types'

interface Props {
  phase:       Phase
  isRecording: boolean
  onClick:     () => void
}

/** Returns mic button appearance based on the current agent phase. */
function getMicState(phase: Phase, isRecording: boolean) {
  if (isRecording) {
    return { bg: 'bg-red-500 animate-ring', icon: 'recording', title: 'Click to stop', disabled: false }
  }
  if (phase === 'thinking' || phase === 'transcribing') {
    return { bg: 'bg-surface-card cursor-not-allowed', icon: 'idle', title: 'Processing...', disabled: true }
  }
  if (phase === 'speaking') {
    return { bg: 'bg-purple-600 hover:bg-purple-500', icon: 'stop', title: 'Click to interrupt', disabled: false }
  }
  if (phase === 'ended' || phase === 'error' || phase === 'connecting') {
    return { bg: 'bg-surface-card cursor-not-allowed', icon: 'idle', title: '', disabled: true }
  }
  return { bg: 'bg-green-500 hover:bg-green-400', icon: 'idle', title: 'Click to speak', disabled: false }
}

export function MicButton({ phase, isRecording, onClick }: Props) {
  const { bg, icon, title, disabled } = getMicState(phase, isRecording)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`
        w-[72px] h-[72px] rounded-full flex items-center justify-center
        transition-all duration-150 focus:outline-none focus-visible:ring-2
        focus-visible:ring-white/50 ${bg}
      `}
    >
      {icon === 'stop' ? <StopIcon /> : <MicIcon />}
    </button>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.5 9a1 1 0 0 1 1 1 7.5 7.5 0 0 1-15 0 1 1 0 1 1 2 0 5.5 5.5 0 0 0 11 0 1 1 0 0 1 1-1zM11 20.9V23h2v-2.1A9 9 0 0 0 12 3v0z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
