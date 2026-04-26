'use client'

import type { LeadData, CallSummary } from '@/types'

interface LeadPanelProps {
  lead:        LeadData
  callSummary: CallSummary | null
}

const CONTACT_FIELDS: { key: keyof LeadData; label: string; icon: string }[] = [
  { key: 'name',    label: 'Name',    icon: '👤' },
  { key: 'email',   label: 'Email',   icon: '✉️' },
  { key: 'phone',   label: 'Phone',   icon: '📞' },
  { key: 'company', label: 'Company', icon: '🏢' },
  { key: 'purpose', label: 'Purpose', icon: '🎯' },
]

const hasAny = (lead: LeadData) =>
  Object.values(lead).some((v) => v !== null && v !== '')

export function LeadPanel({ lead, callSummary }: LeadPanelProps) {
  if (!hasAny(lead) && !callSummary) return null

  return (
    <div className="w-full flex flex-col gap-3">

      {/* ── Contact info ── */}
      {hasAny(lead) && (
        <div className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Collected Info
          </p>
          <div className="flex flex-col gap-2">
            {CONTACT_FIELDS.map(({ key, label, icon }) => {
              const value = lead[key]
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-4 shrink-0">{icon}</span>
                  <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                  {value ? (
                    <span className="text-sm text-gray-200 truncate">{value}</span>
                  ) : (
                    <span className="text-xs text-gray-600 italic">not yet collected</span>
                  )}
                  {value && (
                    <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Call summary ── */}
      {callSummary && (
        <div className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Call Summary
          </p>

          <p className="text-sm text-gray-300 leading-relaxed mb-3">
            {callSummary.summary}
          </p>

          {callSummary.keyPoints.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Key Points
              </p>
              <ul className="flex flex-col gap-1">
                {callSummary.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

    </div>
  )
}
