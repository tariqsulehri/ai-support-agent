'use client'

import type { LeadData, CallSummary } from '@/types'

interface LeadPanelProps {
  lead:        LeadData
  callSummary: CallSummary | null
}

const FIELDS: { key: keyof LeadData; label: string; icon: React.ReactNode }[] = [
  { key: 'name',    label: 'Name',    icon: <UserIcon /> },
  { key: 'email',   label: 'Email',   icon: <MailIcon /> },
  { key: 'phone',   label: 'Phone',   icon: <PhoneIcon /> },
  { key: 'company', label: 'Company', icon: <BuildingIcon /> },
  { key: 'purpose', label: 'Purpose', icon: <TagIcon /> },
]

const hasAny = (lead: LeadData) =>
  Object.values(lead).some(v => v !== null && v !== '')

export function LeadPanel({ lead, callSummary }: LeadPanelProps) {
  if (!hasAny(lead) && !callSummary) return null

  return (
    <div className="w-full flex flex-col gap-3">

      {/* Contact info */}
      {hasAny(lead) && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-ms-blue" />
            <h3 className="text-xs font-semibold text-ms-text uppercase tracking-wider">
              Contact Details
            </h3>
          </div>
          <div className="px-5 py-3 flex flex-col gap-2.5">
            {FIELDS.map(({ key, label, icon }) => {
              const value = lead[key]
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-ms-muted w-4 shrink-0">{icon}</span>
                  <span className="text-xs text-ms-muted w-14 shrink-0">{label}</span>
                  {value ? (
                    <span className="text-sm text-ms-text font-medium truncate flex-1">{value}</span>
                  ) : (
                    <span className="text-xs text-ms-muted italic flex-1">—</span>
                  )}
                  {value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-ms-green shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Call summary */}
      {callSummary && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-ms-blue" />
            <h3 className="text-xs font-semibold text-ms-text uppercase tracking-wider">
              Conversation Summary
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-ms-sub leading-relaxed">{callSummary.summary}</p>

            {callSummary.keyPoints.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-ms-muted uppercase tracking-wider mb-2">
                  Key Points
                </p>
                <ul className="flex flex-col gap-1.5">
                  {callSummary.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ms-sub">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ms-blue shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline SVG icons ───────────────────────────────────────────────────────────
function UserIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
}
function MailIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
}
function PhoneIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
  </svg>
}
function BuildingIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
  </svg>
}
function TagIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
  </svg>
}
