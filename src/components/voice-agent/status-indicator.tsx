import type { Phase } from '@/types'

interface Props { phase: Phase }

const STATUS: Record<Phase, { show: boolean; color: string; label: string }> = {
  connecting:   { show: false, color: '',                               label: '' },
  idle:         { show: false, color: '',                               label: '' },
  listening:    { show: true,  color: 'bg-green-50 text-green-700 border-green-100',  label: '🎙 Listening…' },
  transcribing: { show: true,  color: 'bg-ms-teal-lt text-ms-teal border-ms-teal-md',   label: '✦ Transcribing…' },
  thinking:     { show: true,  color: 'bg-ms-teal-lt text-ms-teal border-ms-teal-md',   label: '✦ Thinking…' },
  speaking:     { show: true,  color: 'bg-purple-50 text-purple-700 border-purple-100', label: '🔊 Speaking…' },
  ended:        { show: true,  color: 'bg-gray-50 text-ms-sub border-surface-border', label: 'Conversation ended' },
  error:        { show: false, color: '',                               label: '' },
}

export function StatusIndicator({ phase }: Props) {
  const { show, color, label } = STATUS[phase]
  if (!show) return null

  return (
    <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium
                     flex items-center gap-1.5 shrink-0 ${color}`}>
      {(phase === 'thinking' || phase === 'transcribing') && (
        <span className="inline-flex gap-0.5">
          {[0,1,2].map(i => (
            <span key={i} className={`typing-dot w-1 h-1 rounded-full bg-ms-teal animate-typing`} />
          ))}
        </span>
      )}
      <span>{label}</span>
    </div>
  )
}
