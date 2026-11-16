'use client'

import { useState } from 'react'
import { formatLabel } from '@/lib/admin/forms'
import { cardHeaderBand, cardSurface } from './surface'

type Count = { label: string; count: number }

export type SplitAnalyticsProps = {
  totalCalls: number
  hotLeads: number
  qualifiedPipeline: number
  statusCounts: Count[]
  leadQualityCounts: Count[]
  serviceCounts: Count[]
  intentCounts: Count[]
}

const STAGES = [
  { status: 'new', label: 'New', color: '#94a3b8' },
  { status: 'reviewing', label: 'Reviewing', color: '#38bdf8' },
  { status: 'qualified', label: 'Qualified', color: '#0052ff' },
  { status: 'proposal', label: 'Proposal', color: '#6e19eb' },
  { status: 'won', label: 'Won', color: '#10b981' },
  { status: 'lost', label: 'Lost', color: '#f43f5e' },
] as const

// Header band bleeds to the card edges (negative margins match the card padding).
const bandClass = `-mx-3.5 -mt-3.5 rounded-t-2xl px-3.5 py-3 sm:-mx-4 sm:-mt-4 sm:px-4 ${cardHeaderBand}`

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052ff]/40 ${
        active ? 'bg-white text-[#0052ff] shadow-xs' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function Donut({ segments, total }: { segments: Array<{ color: string; count: number }>; total: number }) {
  const size = 168
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {total > 0 &&
          segments.map((segment, i) => {
            const length = (segment.count / total) * circumference
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return el
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-slate-950">{total.toLocaleString()}</span>
        <span className="text-xs font-medium text-slate-400">conversations</span>
      </div>
    </div>
  )
}

/**
 * Two cards: pipeline stage distribution (every conversation has exactly one status,
 * so shares sum to 100%) and demand mix by service / intent / quality. All values come
 * from server aggregates — no synthetic fallbacks or invented targets.
 */
export function DashboardSplitAnalytics({
  totalCalls,
  hotLeads,
  qualifiedPipeline,
  statusCounts,
  leadQualityCounts,
  serviceCounts,
  intentCounts,
}: SplitAnalyticsProps) {
  const [mix, setMix] = useState<'services' | 'intents' | 'quality'>('intents')

  const stages = STAGES.map((stage) => ({
    ...stage,
    count: statusCounts.find((s) => s.label.toLowerCase() === stage.status)?.count ?? 0,
  }))
  const stagedTotal = stages.reduce((sum, s) => sum + s.count, 0)

  const mixSource = mix === 'services' ? serviceCounts : mix === 'intents' ? intentCounts : leadQualityCounts
  // Services are multi-valued per conversation, so their shares are of conversations, not of mentions.
  const mixItems = mixSource.slice(0, 6)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section className={`p-3.5 sm:p-4 ${cardSurface}`}>
        <div className={bandClass}>
          <h3 className="text-base font-semibold tracking-tight text-slate-950">Pipeline stages</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {hotLeads.toLocaleString()} hot lead{hotLeads === 1 ? '' : 's'} · {qualifiedPipeline.toLocaleString()} in qualified, proposal or won.
          </p>
        </div>

        <div className="mt-3.5 flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
          <Donut segments={stages} total={stagedTotal} />
          <ul className="w-full flex-1 space-y-1.5 sm:w-auto">
            {stages.map((stage) => (
              <li key={stage.status} className="flex items-center justify-between gap-4 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
                  <span className="truncate font-medium text-slate-600">{stage.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums">
                  <span className="font-semibold text-slate-900">{stage.count.toLocaleString()}</span>
                  <span className="w-9 text-right text-slate-400">{pct(stage.count, stagedTotal)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`p-3.5 sm:p-4 ${cardSurface}`}>
        <div className={bandClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight text-slate-950">Demand mix</h3>
            <div className="inline-flex rounded-lg bg-white/80 p-0.5 ring-1 ring-slate-200/80" role="group" aria-label="Demand mix dimension">
              <ToggleButton active={mix === 'intents'} onClick={() => setMix('intents')}>Intents</ToggleButton>
              <ToggleButton active={mix === 'services'} onClick={() => setMix('services')}>Services</ToggleButton>
              <ToggleButton active={mix === 'quality'} onClick={() => setMix('quality')}>Quality</ToggleButton>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Share of {totalCalls.toLocaleString()} conversations, largest first.</p>
        </div>

        {mixItems.length === 0 ? (
          <p className="mt-5 text-center text-xs text-slate-400">No classified conversations for this period yet.</p>
        ) : (
          <ul className="mt-3.5 space-y-2.5">
            {mixItems.map((item) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-800">{formatLabel(item.label)}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    <span className="font-semibold text-slate-900">{item.count.toLocaleString()}</span> · {pct(item.count, totalCalls)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0052ff] transition-[width] duration-500"
                    style={{ width: `${Math.min(100, pct(item.count, totalCalls))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
