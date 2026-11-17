import { memo } from 'react'
import type { Phase } from '@/types'

interface Props { phase: Phase }

const STATUS: Record<Phase, { show: boolean; color: string; label: string; dots?: boolean }> = {
  connecting:   { show: false, color: '', label: '' },
  idle:         { show: false, color: '', label: '' },
  listening:    { show: true,  color: 'bg-green-50 text-green-700 border-green-100',     label: 'Listening… pause or tap the mic to send' },
  transcribing: { show: true,  color: 'bg-ms-teal-lt text-ms-teal border-ms-teal-md',   label: 'Transcribing…', dots: true },
  thinking:     { show: true,  color: 'bg-ms-teal-lt text-ms-teal border-ms-teal-md',   label: 'Thinking…',     dots: true },
  speaking:     { show: true,  color: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Speaking… tap the mic to interrupt' },
  ended:        { show: true,  color: 'bg-ms-surface-2 text-ms-sub border-ms-border',   label: 'Conversation ended' },
  error:        { show: false, color: '', label: '' },
}

export const StatusIndicator = memo(function StatusIndicator({ phase }: Props) {
  const { show, color, label, dots } = STATUS[phase]
  if (!show) return null

  return (
    <div
      role="status"
      className={`mx-3 sm:mx-4 mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium
                  flex items-center gap-1.5 shrink-0 ${color}`}
    >
      {dots ? (
        <span className="inline-flex gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot w-1 h-1 rounded-full bg-ms-teal animate-typing" />
          ))}
        </span>
      ) : (
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current animate-pulse_dot" />
      )}
      <span className="truncate">{label}</span>
    </div>
  )
})
