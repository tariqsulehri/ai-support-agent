import type { Phase } from '@/types'

interface Props {
  phase: Phase
}

const STATUS: Record<Phase, { dot: string; label: string }> = {
  connecting:   { dot: 'bg-gray-500',                         label: 'Connecting...' },
  idle:         { dot: 'bg-gray-500',                         label: 'Ready — click mic to speak' },
  listening:    { dot: 'bg-green-400 shadow-green animate-pulse_dot', label: 'Listening...' },
  transcribing: { dot: 'bg-blue-400',                         label: 'Transcribing...' },
  thinking:     { dot: 'bg-blue-400 animate-pulse_dot',       label: 'Thinking...' },
  speaking:     { dot: 'bg-purple-400 animate-pulse_dot',     label: 'Speaking...' },
  ended:        { dot: 'bg-gray-600',                         label: 'Call ended' },
  error:        { dot: 'bg-red-500',                          label: 'Error' },
}

export function StatusIndicator({ phase }: Props) {
  const { dot, label } = STATUS[phase]

  return (
    <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-full px-4 py-1.5 text-xs text-gray-400 select-none">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span>{label}</span>
    </div>
  )
}
