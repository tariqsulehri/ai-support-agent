'use client'

import { memo } from 'react'
import type { CallSummary } from '@/types'

function emailStatus(callSummary: CallSummary | null): {
  label: string
  tone: 'success' | 'muted' | 'warning'
} {
  if (!callSummary) return { label: 'Finalizing call…', tone: 'muted' }

  const email = callSummary.email
  if (email?.sent) return { label: 'Email sent', tone: 'success' }
  if (email?.skippedLeadEmail) return { label: 'Email skipped: invalid address', tone: 'warning' }
  if (email?.error) return { label: 'Email not sent', tone: 'warning' }
  return { label: 'Email skipped', tone: 'muted' }
}

const DOT_CLASS = {
  success: 'bg-ms-green',
  warning: 'bg-ms-red',
  muted:   'bg-ms-muted',
} as const

export const CallCompletedPanel = memo(function CallCompletedPanel({
  callSummary,
  onStartNewChat,
}: {
  callSummary: CallSummary | null
  onStartNewChat: () => void
}) {
  const status = emailStatus(callSummary)

  return (
    <div
      role="status"
      className="mt-3 bg-ms-surface border border-ms-border rounded-va shadow-bubble overflow-hidden msg-enter"
    >
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-ms-border">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ms-text">Call completed</p>
          <div className="mt-1 flex items-center gap-2">
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[status.tone]}`} />
            <span className="text-xs text-ms-muted truncate">{status.label}</span>
          </div>
        </div>
        {callSummary && (
          <button
            type="button"
            onClick={onStartNewChat}
            className="
              shrink-0 rounded-lg bg-ms-teal px-3 py-2 text-xs font-semibold text-ms-on-primary
              hover:bg-ms-teal-dk active:scale-95 transition-[transform,background-color] duration-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ms-blue focus-visible:ring-offset-2
            "
          >
            Start new chat
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-ms-sub leading-relaxed">
          {callSummary
            ? 'Your details and conversation summary are shown above.'
            : 'Please wait while we save the call and handle the email notification.'}
        </p>
      </div>
    </div>
  )
})
