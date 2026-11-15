import Link from 'next/link'
import { memo, type ReactNode } from 'react'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardAnalytics, DashboardCall, DashboardFilters } from '@/lib/dashboard/analytics'
import { GlossyBarChart, GlossyDonutChart } from '@/components/admin/3d-charts'
import {
  chartColors,
  statusOptions,
  type CountItem,
} from './constants'
import { updateManagementAction } from './actions'
import {
  LeadStarRating,
  OptimisticStatusForm,
  DebouncedSearchInput,
  PaginationControls,
} from './client-controls'

export {
  LeadStarRating,
  OptimisticStatusForm,
  DebouncedSearchInput,
  PaginationControls,
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

export function toneForQuality(value: string): 'neutral' | 'good' | 'warn' | 'bad' | 'blue' | 'purple' {
  if (value === 'hot') return 'warn'
  if (value === 'warm') return 'good'
  if (value === 'cold') return 'purple'
  return 'blue'
}

export function isConversationFinalized(call: DashboardCall): boolean {
  return Boolean(call.finalizedAt || call.emailSent || call.emailError)
}

export function emailStatusLabel(call: DashboardCall): string {
  if (call.emailSent) return 'Email sent'
  if (call.emailError) return 'Email failed'
  return isConversationFinalized(call) ? 'Email skipped' : 'Email pending'
}

export function emailStatusTone(call: DashboardCall): 'good' | 'bad' | 'warn' | 'purple' {
  if (call.emailSent) return 'good'
  if (call.emailError) return 'bad'
  return isConversationFinalized(call) ? 'purple' : 'warn'
}

export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue' | 'purple' | 'cyan' | 'indigo'
}) {
  const tones = {
    neutral: {
      pill: 'border-sky-200/90 bg-gradient-to-b from-sky-50 to-sky-100/70 text-sky-800 shadow-[0_1px_2px_rgba(14,165,233,0.12)] ring-1 ring-sky-500/10',
      dot: 'bg-sky-500 shadow-xs',
    },
    good: {
      pill: 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 text-emerald-800 shadow-[0_1px_2px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10',
      dot: 'bg-emerald-500 shadow-xs',
    },
    warn: {
      pill: 'border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-amber-100/70 text-amber-800 shadow-[0_1px_2px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/10',
      dot: 'bg-amber-500 shadow-xs',
    },
    bad: {
      pill: 'border-rose-200/90 bg-gradient-to-b from-rose-50/90 to-rose-100/70 text-rose-800 shadow-[0_1px_2px_rgba(244,63,94,0.12)] ring-1 ring-rose-500/10',
      dot: 'bg-rose-500 shadow-xs',
    },
    blue: {
      pill: 'border-blue-200/90 bg-gradient-to-b from-blue-50/90 to-blue-100/70 text-[#0052ff] shadow-[0_1px_2px_rgba(0,82,255,0.12)] ring-1 ring-blue-500/10',
      dot: 'bg-[#0052ff] shadow-xs',
    },
    purple: {
      pill: 'border-purple-200/90 bg-gradient-to-b from-purple-50/90 to-purple-100/70 text-purple-800 shadow-[0_1px_2px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/10',
      dot: 'bg-purple-500 shadow-xs',
    },
    indigo: {
      pill: 'border-indigo-200/90 bg-gradient-to-b from-indigo-50/90 to-indigo-100/70 text-indigo-800 shadow-[0_1px_2px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/10',
      dot: 'bg-indigo-500 shadow-xs',
    },
    cyan: {
      pill: 'border-cyan-200/90 bg-gradient-to-b from-cyan-50/90 to-cyan-100/70 text-cyan-800 shadow-[0_1px_2px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/10',
      dot: 'bg-cyan-500 shadow-xs',
    },
  }
  const current = tones[tone] || tones.blue

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-tight transition-all duration-150 ${current.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot}`} />
      <span>{children}</span>
    </span>
  )
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-200 ${className}`}
    >
      {children}
    </section>
  )
}

function StatIcon({ name, className = 'h-3.5 w-3.5' }: { name?: string; className?: string }) {
  if (name === 'ready') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'target') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'comm') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.74 3.37 1.97 4.6-.28 1.1-.94 2.12-1.87 2.87a.75.75 0 00.5 1.33c2.3 0 4.14-.9 5.23-1.92.7.08 1.43.12 2.17.12 4.418 0 8-3.134 8-7s-3.582-7-8-7z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'lead') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
      </svg>
    )
  }
  if (name === 'waiting' || name === 'clock') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'check') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'sentiment') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-4.464a.75.75 0 10-1.06-1.072 3.5 3.5 0 01-4.952 0 .75.75 0 00-1.06 1.072 5 5 0 007.072 0zM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5zm4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S11.448 7 12 7s1 .672 1 1.5z" clipRule="evenodd" />
      </svg>
    )
  }
  if (name === 'service') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.464 7.464 0 0114.5 16z" />
    </svg>
  )
}

export function HeroBannerCard({
  userName,
  analytics,
}: {
  userName?: string
  analytics: DashboardAnalytics
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = userName ? userName.trim().split(' ')[0] : 'Admin'

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const readinessPercent = Math.min(Math.max(analytics.conversionReadiness, 0), 100)
  const isHealthy = readinessPercent >= 60

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0052ff] via-[#0047e1] to-[#0b3ec4] p-6 sm:p-7 text-white shadow-[0_8px_30px_rgba(0,82,255,0.25)] border border-blue-400/20">
      {/* 3D Lighting Mesh Highlights */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-indigo-900/50 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        {/* Left Side: Greeting + Floating Readiness Card */}
        <div className="max-w-2xl flex-1 space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              {greeting}, {firstName}
            </h2>
            <p className="mt-0.5 text-xs text-blue-100 font-medium">
              {dateStr} · AI Voice &amp; Real-time Support Intelligence
            </p>
          </div>

          {/* Floating Nested White Card with 3D elevation */}
          <div className="rounded-xl border border-white/40 bg-white/95 backdrop-blur-sm p-4 text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
            <p className="text-xs font-semibold text-slate-900 leading-snug">
              <span className="font-bold text-slate-950">
                {isHealthy ? 'High operational readiness.' : 'Active lead qualification.'}
              </span>{' '}
              {analytics.callsWithLead} of {analytics.totalCalls} conversations captured actionable leads ({readinessPercent}% readiness score).
            </p>

            {/* Horizontal Timeline Bar with 3D track */}
            <div className="relative mt-3">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0052ff] to-[#3b82f6] shadow-xs transition-all duration-500"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${Math.max(readinessPercent, 6)}%` }}
              >
                <div className="h-4 w-1 rounded-full bg-slate-900 shadow-xs" />
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Conversations processed: {analytics.totalCalls}</span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-200" />
                Live Agent Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Key High-Level Callout Metrics */}
        <div className="flex shrink-0 items-center gap-6 sm:gap-10 lg:border-l lg:border-white/20 lg:pl-8">
          <div className="text-left sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
              Pipeline Ready
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs tabular-nums">
              {analytics.qualifiedPipeline}
            </p>
            <p className="mt-0.5 text-[11px] text-blue-100/90 font-medium">
              Qualified prospects
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
              Conversion Score
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs tabular-nums">
              {readinessPercent}%
            </p>
            <p className="mt-0.5 text-[11px] text-blue-100/90 font-medium">
              Lead capture rate
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  target,
  detail,
  tone = 'blue',
  icon = 'assessed',
  tooltip,
}: {
  label: string
  value: string | number
  target?: string | number
  detail: string
  tone?: 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple'
  icon?: string
  tooltip?: string
}) {
  const tones = {
    blue: {
      text: 'text-[#0052ff]',
      bg: 'bg-blue-50/90',
      border: 'border-blue-200/80',
      bar: 'bg-gradient-to-r from-[#0052ff] to-blue-400',
      glow: 'shadow-[0_2px_6px_rgba(0,82,255,0.12)]',
    },
    cyan: {
      text: 'text-[#0052ff]',
      bg: 'bg-blue-50/90',
      border: 'border-blue-200/80',
      bar: 'bg-gradient-to-r from-[#0052ff] to-sky-400',
      glow: 'shadow-[0_2px_6px_rgba(0,82,255,0.12)]',
    },
    emerald: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200/80',
      bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_2px_6px_rgba(16,185,129,0.12)]',
    },
    amber: {
      text: 'text-amber-800',
      bg: 'bg-amber-50/90',
      border: 'border-amber-200/80',
      bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      glow: 'shadow-[0_2px_6px_rgba(245,158,11,0.12)]',
    },
    rose: {
      text: 'text-rose-700',
      bg: 'bg-rose-50/90',
      border: 'border-rose-200/80',
      bar: 'bg-gradient-to-r from-rose-500 to-pink-400',
      glow: 'shadow-[0_2px_6px_rgba(244,63,94,0.12)]',
    },
    purple: {
      text: 'text-purple-700',
      bg: 'bg-purple-50/90',
      border: 'border-purple-200/80',
      bar: 'bg-gradient-to-r from-purple-500 to-indigo-400',
      glow: 'shadow-[0_2px_6px_rgba(168,85,247,0.12)]',
    },
  }
  const current = tones[tone] || tones.blue

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/50 p-4 sm:p-5 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.1)] hover:border-slate-300">
      {/* Top row: Icon + Label + Tooltip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${current.border} ${current.bg} ${current.text} ${current.glow}`}
          >
            <StatIcon name={icon} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-xs font-bold text-slate-700">{label}</span>
        </div>

        {/* Info tooltip ? button */}
        <span className="group/tip relative shrink-0">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={`About ${label}`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm.75 3.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {tooltip && (
            <span className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-48 rounded-lg bg-slate-900 p-2.5 text-[10px] font-medium leading-relaxed text-white shadow-xl group-hover/tip:block">
              {tooltip}
            </span>
          )}
        </span>
      </div>

      {/* Middle row: Big bold metric value + optional target */}
      <div className="mt-3.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-sans tabular-nums">
            {value}
          </span>
          {target && (
            <span className="text-xs sm:text-sm font-semibold text-slate-400">
              / {target}
            </span>
          )}
        </div>

        {/* 3D Accent bar under the number */}
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
          <div className={`h-full w-14 rounded-full ${current.bar} shadow-xs`} />
        </div>
      </div>

      {/* Bottom row: Explanatory context note */}
      <p className="mt-2 text-[11px] font-medium text-slate-500 leading-tight truncate" title={detail}>
        {detail}
      </p>
    </div>
  )
}

export function Distribution({
  title,
  subtitle,
  items,
  total,
}: {
  title: string
  subtitle?: string
  items: CountItem[]
  total: number
}) {
  return (
    <GlossyBarChart
      title={title}
      subtitle={subtitle}
      totalLabel={`${items.length} groups`}
      total={total}
      variant="distribution"
      items={items.map((item, index) => ({
        label: formatLabel(item.label),
        value: item.count,
        color: chartColors[index % chartColors.length],
      }))}
    />
  )
}

export function DonutChart({
  title,
  subtitle,
  items,
  total,
  unit = 'records',
  infoTooltip,
  showInsight = true,
}: {
  title: string
  subtitle?: string
  items: CountItem[]
  total: number
  unit?: string
  infoTooltip?: string
  showInsight?: boolean
}) {
  return (
    <GlossyDonutChart
      title={title}
      subtitle={subtitle}
      total={total}
      unit={unit}
      infoTooltip={infoTooltip}
      showInsight={showInsight}
      items={items.slice(0, 6).map((item, index) => ({
        label: formatLabel(item.label),
        value: item.count,
        color: chartColors[index % chartColors.length],
      }))}
    />
  )
}

export function ProgressRing({ value }: { value: number }) {
  const safeValue = Math.min(Math.max(value, 0), 100)

  return (
    <div className="grid gap-4">
      <GlossyDonutChart
        title="Decision Readiness"
        total={100}
        unit="score"
        centerValue={`${safeValue}%`}
        infoTooltip="A weighted view of lead capture, hot-lead volume, and movement into qualified or proposal stages."
        size={164}
        items={[
          { label: 'Ready', value: safeValue, color: '#0052ff' },
          { label: 'Remaining', value: 100 - safeValue, color: '#e2e8f0' },
        ]}
      />
      <p className="px-1 text-sm leading-6 text-slate-600">
        Weighted view of lead capture, hot-lead volume, and movement into qualified or proposal stages.
      </p>
    </div>
  )
}

export function PipelineFunnel({ items, total }: { items: CountItem[]; total: number }) {
  const ordered = statusOptions.map((status) => ({
    label: status,
    count: items.find((item) => item.label === status)?.count ?? 0,
  }))

  return (
    <GlossyBarChart
      title="Lead Pipeline Funnel"
      infoTooltip="Lead counts by pipeline status, shown as a share of all completed calls."
      total={total}
      variant="funnel"
      items={ordered.map((item, index) => ({
        label: formatLabel(item.label),
        value: item.count,
        color: chartColors[index % chartColors.length],
      }))}
    />
  )
}

export function LeadIdentity({ call }: { call: DashboardCall }) {
  const leadName = call.lead.name || call.lead.company || 'Unknown lead'
  const details = [call.lead.email, call.lead.phone, call.lead.country].filter(Boolean)

  return (
    <div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-bold text-slate-950 font-sans tracking-tight">
          {leadName}
        </h3>
        <LeadStarRating score={call.maturityScore} label={call.maturityLabel} />
      </div>
      <p className="text-xs font-medium text-slate-500 mt-0.5">
        {details.length ? details.join(' · ') : 'No contact details captured'}
      </p>
    </div>
  )
}

export function TranscriptPreview({ call }: { call: DashboardCall }) {
  const messages = call.transcript.slice(0, 6)
  const remaining = Math.max(call.transcript.length - messages.length, 0)

  if (messages.length === 0) {
    return <p className="text-xs text-slate-400 italic">No transcript recorded for this conversation.</p>
  }

  return (
    <div className="mt-3.5 space-y-2.5 rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50/80 to-slate-100/40 p-3.5 sm:p-4 shadow-inner">
      <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Conversation Exchange ({messages.length} turns)</span>
        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Synchronized
        </span>
      </div>

      <div className="space-y-2.5">
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={`${call.id}-${index}`}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar circle */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs ${
                  isUser
                    ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'
                    : 'bg-gradient-to-br from-[#0052ff] to-[#0038b8] text-white'
                }`}
                title={isUser ? 'Visitor' : 'Support Agent'}
              >
                {isUser ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.74 3.37 1.97 4.6-.28 1.1-.94 2.12-1.87 2.87a.75.75 0 00.5 1.33c2.3 0 4.14-.9 5.23-1.92.7.08 1.43.12 2.17.12 4.418 0 8-3.134 8-7s-3.582-7-8-7z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-white border border-slate-200/90 text-slate-900 rounded-tr-xs shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)]'
                    : 'bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/80 text-slate-800 rounded-tl-xs shadow-[0_2px_8px_rgba(0,82,255,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold ${
                      isUser ? 'text-slate-600' : 'text-[#0052ff]'
                    }`}
                  >
                    {isUser ? 'Visitor' : 'Support Agent'}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          )
        })}
      </div>

      {remaining > 0 && (
        <p className="pt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          + {remaining} more transcript messages stored
        </p>
      )}
    </div>
  )
}

export function StatusForm({ call }: { call: DashboardCall }) {
  return <OptimisticStatusForm callId={call.id} initialStatus={call.status} />
}

export function FilterBar({
  filters,
  activeTab,
  exportHref,
}: {
  filters: DashboardFilters
  activeTab: string
  exportHref: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/60 p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)]">
      <form
        action="/dashboard"
        className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(5,1fr)_auto_auto] lg:items-end"
      >
        <input type="hidden" name="tab" value={activeTab} />
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Search
          </label>
          <DebouncedSearchInput defaultValue={filters.q ?? ''} />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Range
          </label>
          <select
            name="range"
            defaultValue={filters.range ?? '30'}
            className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 cursor-pointer"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Status
          </label>
          <select
            name="status"
            defaultValue={filters.status ?? 'all'}
            className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 cursor-pointer"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Quality
          </label>
          <select
            name="quality"
            defaultValue={filters.quality ?? 'all'}
            className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 cursor-pointer"
          >
            <option value="all">All quality</option>
            {['hot', 'warm', 'cold', 'unknown'].map((quality) => (
              <option key={quality} value={quality}>
                {formatLabel(quality)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Urgency
          </label>
          <select
            name="urgency"
            defaultValue={filters.urgency ?? 'all'}
            className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 cursor-pointer"
          >
            <option value="all">All urgency</option>
            {['high', 'medium', 'low', 'unknown'].map((urgency) => (
              <option key={urgency} value={urgency}>
                {formatLabel(urgency)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Sort By
          </label>
          <select
            name="sort"
            defaultValue={filters.sort ?? 'recent'}
            className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="score">Maturity Score (High to Low)</option>
            <option value="urgency">Urgency</option>
          </select>
        </div>

        <button
          type="submit"
          className="h-10 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-[#085bf6] hover:to-[#0039be] hover:shadow-[0_4px_14px_rgba(0,82,255,0.5)] active:translate-y-[1px] transition-all duration-150 flex items-center justify-center cursor-pointer"
        >
          Apply
        </button>
        <Link
          href={exportHref}
          prefetch={false}
          className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 text-xs font-bold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)] hover:bg-slate-100 hover:border-slate-300 transition-all duration-150"
        >
          Export
        </Link>
      </form>
    </div>
  )
}

export function LeadDetailPanel({ call }: { call: DashboardCall | null }) {
  if (!call) {
    return (
      <Panel className="p-6">
        <h2 className="text-lg font-bold text-slate-950 font-sans">Lead Workspace</h2>
        <p className="mt-2 text-xs text-slate-400">No lead selected for the current filter set.</p>
      </Panel>
    )
  }

  return (
    <Panel className="overflow-hidden">
      <div className="bg-gradient-to-r from-[#0052ff] via-[#0047e1] to-indigo-900 p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Lead Workspace
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
              Active Record
            </span>
            <LeadStarRating score={call.maturityScore} label={call.maturityLabel} />
          </div>
          <h2 className="mt-2 text-2xl font-bold font-sans tracking-tight">
            {call.lead.name || call.lead.company || 'Unknown lead'}
          </h2>
          <p className="mt-1 text-xs text-blue-100/90 leading-relaxed max-w-2xl">
            {call.lead.purpose || call.summary}
          </p>
        </div>

        {/* Buttons in top header card for the form */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            form="lead-management-form"
            type="submit"
            className="h-10 rounded-xl bg-white text-[#0052ff] hover:bg-blue-50 px-5 text-xs font-bold shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            <span>Save Lead Plan</span>
            <span>✓</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
            <Badge tone={call.urgency === 'high' ? 'bad' : call.urgency === 'medium' ? 'warn' : 'cyan'}>
              {formatLabel(call.urgency)} urgency
            </Badge>
            <Badge tone={emailStatusTone(call)}>
              {emailStatusLabel(call)}
            </Badge>
          </div>

          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            {[
              ['Email', call.lead.email],
              ['Phone', call.lead.phone],
              ['Company', call.lead.company],
              ['Country', call.lead.country],
              ['Intent', formatLabel(call.intent)],
              ['Category', formatLabel(call.category)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-3.5 shadow-xs"
              >
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1 font-bold text-slate-900">{value || 'Not captured'}</dd>
              </div>
            ))}
          </dl>

          {call.nextSteps.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                AI Next Steps
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {call.nextSteps.map((step) => (
                  <li
                    key={step}
                    className="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 px-3.5 py-2.5 font-medium text-emerald-950 flex items-start gap-2 shadow-xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          id="lead-management-form"
          action={updateManagementAction}
          className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        >
          <input type="hidden" name="id" value={call.id} />
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Management Follow-Up
            </h3>
            <span className="text-[10px] font-bold text-[#0052ff] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/70">
              Direct Sync
            </span>
          </div>

          <label className="mt-3.5 block">
            <span className="text-xs font-bold text-slate-800">Owner</span>
            <input
              name="owner"
              defaultValue={call.owner ?? ''}
              placeholder="Sales owner or manager"
              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-bold text-slate-800">Follow-up date</span>
            <input
              name="followUpAt"
              type="datetime-local"
              defaultValue={call.followUpAt ? call.followUpAt.slice(0, 16) : ''}
              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-bold text-slate-800">Management notes</span>
            <textarea
              name="notes"
              defaultValue={call.notes ?? ''}
              rows={4}
              placeholder="Decision notes, objections, proposed next action"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
            />
          </label>

          <button
            type="submit"
            className="mt-4 h-10 w-full rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.4)] hover:from-[#085bf6] hover:to-[#0039be] transition-all duration-150 cursor-pointer"
          >
            Save Lead Plan
          </button>

          {call.statusHistory.length > 0 && (
            <div className="mt-5 border-t border-slate-200/80 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Status History
              </h3>
              <div className="space-y-1.5 text-xs text-slate-600">
                {call.statusHistory.slice(-4).reverse().map((item, index) => (
                  <p key={`${item.status}-${item.changedAt}-${index}`} className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{formatLabel(item.status)}</span>
                    <span className="text-slate-400">{formatDate(item.changedAt)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </Panel>
  )
}

export const CommunicationCard = memo(function CommunicationCard({ call }: { call: DashboardCall }) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_-4px_rgba(15,23,42,0.1)] hover:border-blue-200/90 transition-all duration-200 overflow-hidden">
      {/* Top 3D accent gradient line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0052ff] via-indigo-500 to-emerald-400 shadow-[0_1px_3px_rgba(0,82,255,0.2)]" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {/* Left Column: Caller Identity, Badges, Summary, Key Points */}
          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <LeadIdentity call={call} />
              <Badge tone={toneForQuality(call.leadQuality)}>
                {formatLabel(call.leadQuality)}
              </Badge>
              <Badge
                tone={
                  call.urgency === 'high'
                    ? 'bad'
                    : call.urgency === 'medium'
                    ? 'warn'
                    : 'cyan'
                }
              >
                {formatLabel(call.urgency)} urgency
              </Badge>
              <Badge tone={emailStatusTone(call)}>
                {emailStatusLabel(call)}
              </Badge>
              <Badge tone={isConversationFinalized(call) ? 'good' : 'warn'}>
                {isConversationFinalized(call) ? 'Finalized' : 'In progress'}
              </Badge>
            </div>

            {/* Call Summary Highlight Box */}
            <div className="rounded-xl border-l-4 border-l-[#0052ff] border border-blue-100/60 bg-gradient-to-r from-blue-50/40 to-slate-50/20 p-3.5 text-xs text-slate-700 leading-relaxed shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
              {call.summary}
            </div>

            {call.keyPoints.length > 0 && (
              <ul className="grid gap-2 text-xs sm:grid-cols-2">
                {call.keyPoints.slice(0, 4).map((point) => (
                  <li
                    key={point}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-start gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0052ff] mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            <TranscriptPreview call={call} />
          </div>

          {/* Right Column: Meta details and Quick Action */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/70 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timestamp</span>
              <span className="text-xs font-semibold text-slate-600">{formatDate(call.createdAt)}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Intent</span>
                <span className="font-bold text-[#0052ff] bg-blue-50/90 px-2.5 py-0.5 rounded-full border border-blue-200/80 shadow-2xs">
                  {formatLabel(call.intent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Sentiment</span>
                <span className="font-bold text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                  {formatLabel(call.sentiment)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Category</span>
                <span className="font-bold text-purple-800 bg-purple-50/90 px-2.5 py-0.5 rounded-full border border-purple-200/80 shadow-2xs">
                  {formatLabel(call.category)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 space-y-2">
              <StatusForm call={call} />
              <Link
                href={`/dashboard?tab=leads&selectedId=${call.id}`}
                prefetch={false}
                className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-3 py-2 text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,82,255,0.3)] hover:from-[#085bf6] hover:to-[#0039be] transition-all duration-150"
              >
                <span>Open Lead Workspace</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
})

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm animate-pulse space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-40 rounded-md bg-slate-200" />
            <div className="h-4 w-20 rounded-full bg-slate-100" />
            <div className="h-4 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="h-16 w-full rounded-xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 rounded-lg bg-slate-100" />
            <div className="h-8 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CommunicationList({ calls }: { calls: DashboardCall[] }) {
  if (calls.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-slate-700">No conversation records found</p>
        <p className="mt-1 text-xs text-slate-400">There are no calls matching the current filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <CommunicationCard key={call.id} call={call} />
      ))}
    </div>
  )
}
