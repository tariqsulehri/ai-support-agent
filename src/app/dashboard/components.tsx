import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardCall, DashboardFilters } from '@/lib/dashboard/analytics'
import { GlossyBarChart, GlossyDonutChart } from '@/components/admin/3d-charts'
import {
  chartColors,
  statusOptions,
  type CountItem,
} from './constants'
import { updateManagementAction, updateStatusAction } from './actions'

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

export function toneForQuality(value: string): 'neutral' | 'good' | 'warn' | 'bad' {
  if (value === 'hot') return 'warn'
  if (value === 'warm') return 'good'
  if (value === 'cold') return 'bad'
  return 'neutral'
}

export function isConversationFinalized(call: DashboardCall): boolean {
  return Boolean(call.finalizedAt || call.emailSent || call.emailError)
}

export function emailStatusLabel(call: DashboardCall): string {
  if (call.emailSent) return 'Email sent'
  if (call.emailError) return 'Email failed'
  return isConversationFinalized(call) ? 'Email skipped' : 'Email pending'
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    bad: 'border-rose-200 bg-rose-50 text-rose-700',
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
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
    <section className={`rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden ${className}`}>
      {children}
    </section>
  )
}

export function StatCard({
  label,
  value,
  detail,
  tone = 'cyan',
}: {
  label: string
  value: string | number
  detail: string
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose'
}) {
  const tones = {
    cyan: { dot: 'bg-[#0052ff]' },
    emerald: { dot: 'bg-emerald-500' },
    amber: { dot: 'bg-amber-500' },
    rose: { dot: 'bg-rose-500' },
  }
  const current = tones[tone] || tones.cyan

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`h-2 w-2 rounded-full ${current.dot}`} />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500 font-medium">{detail}</p>
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
          { label: 'Ready', value: safeValue, color: '#194ad9' },
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
      <p className="font-semibold text-slate-950">{leadName}</p>
      <p className="text-sm text-slate-500">
        {details.length ? details.join(' | ') : 'No contact details captured'}
      </p>
    </div>
  )
}

export function TranscriptPreview({ call }: { call: DashboardCall }) {
  const messages = call.transcript.slice(0, 6)
  const remaining = Math.max(call.transcript.length - messages.length, 0)

  if (messages.length === 0) {
    return <p className="text-sm text-slate-500">No transcript captured.</p>
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
      {messages.map((message, index) => (
        <div key={`${call.id}-${index}`} className="grid gap-1 rounded-md bg-white p-3 text-sm shadow-sm md:grid-cols-[88px_1fr]">
          <span className={`font-semibold ${message.role === 'user' ? 'text-cyan-700' : 'text-emerald-700'}`}>
            {message.role === 'user' ? 'Visitor' : 'Agent'}
          </span>
          <p className="whitespace-pre-wrap leading-6 text-slate-700">{message.content}</p>
        </div>
      ))}
      {remaining > 0 && (
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {remaining} more transcript messages stored
        </p>
      )}
    </div>
  )
}

export function StatusForm({ call }: { call: DashboardCall }) {
  return (
    <form action={updateStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={call.id} />
      <select
        name="status"
        defaultValue={call.status}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm"
        aria-label="Lead status"
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {formatLabel(status)}
          </option>
        ))}
      </select>
      <button className="h-9 rounded-md bg-cyan-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
        Update
      </button>
    </form>
  )
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
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <form action="/dashboard" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto_auto] lg:items-end">
        <input type="hidden" name="tab" value={activeTab} />
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Search
          </label>
          <div className="relative">
            <input
              name="q"
              defaultValue={filters.q ?? ''}
              placeholder="Name, email, phone, summary..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff]"
            />
            <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Range
          </label>
          <select name="range" defaultValue={filters.range ?? '30'} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff]">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Status
          </label>
          <select name="status" defaultValue={filters.status ?? 'all'} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff]">
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{formatLabel(status)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Quality
          </label>
          <select name="quality" defaultValue={filters.quality ?? 'all'} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff]">
            <option value="all">All quality</option>
            {['hot', 'warm', 'cold', 'unknown'].map((quality) => (
              <option key={quality} value={quality}>{formatLabel(quality)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Urgency
          </label>
          <select name="urgency" defaultValue={filters.urgency ?? 'all'} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-xs outline-none focus:border-[#0052ff]">
            <option value="all">All urgency</option>
            {['high', 'medium', 'low', 'unknown'].map((urgency) => (
              <option key={urgency} value={urgency}>{formatLabel(urgency)}</option>
            ))}
          </select>
        </div>

        <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-4 text-xs font-semibold text-white shadow-xs transition">
          Apply
        </button>
        <Link
          href={exportHref}
          prefetch={false}
          className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
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
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-slate-950">Lead Workspace</h2>
        <p className="mt-2 text-sm text-slate-500">No lead selected for the current filter set.</p>
      </Panel>
    )
  }

  return (
    <Panel className="overflow-hidden">
      <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Lead Workspace</p>
        <h2 className="mt-2 text-2xl font-semibold">{call.lead.name || call.lead.company || 'Unknown lead'}</h2>
        <p className="mt-1 text-sm text-slate-300">{call.lead.purpose || call.summary}</p>
      </div>
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
            <Badge tone={call.urgency === 'high' ? 'bad' : call.urgency === 'medium' ? 'warn' : 'neutral'}>{formatLabel(call.urgency)} urgency</Badge>
            <Badge tone={call.emailSent ? 'good' : call.emailError ? 'bad' : 'neutral'}>{emailStatusLabel(call)}</Badge>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Email', call.lead.email],
              ['Phone', call.lead.phone],
              ['Company', call.lead.company],
              ['Country', call.lead.country],
              ['Intent', formatLabel(call.intent)],
              ['Category', formatLabel(call.category)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">{label}</dt>
                <dd className="mt-1 text-slate-600">{value || 'Not captured'}</dd>
              </div>
            ))}
          </dl>
          {call.nextSteps.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-950">AI Next Steps</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {call.nextSteps.map((step) => (
                  <li key={step} className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <form action={updateManagementAction} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <input type="hidden" name="id" value={call.id} />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Management Follow-Up</h3>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-800">Owner</span>
            <input name="owner" defaultValue={call.owner ?? ''} placeholder="Sales owner or manager" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-slate-800">Follow-up date</span>
            <input name="followUpAt" type="datetime-local" defaultValue={call.followUpAt ? call.followUpAt.slice(0, 16) : ''} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-slate-800">Management notes</span>
            <textarea name="notes" defaultValue={call.notes ?? ''} rows={5} placeholder="Decision notes, objections, proposed next action" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <button className="mt-4 h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
            Save Lead Plan
          </button>
          {call.statusHistory.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-950">Status History</h3>
              <div className="mt-2 space-y-2">
                {call.statusHistory.slice(-5).reverse().map((item, index) => (
                  <p key={`${item.status}-${item.changedAt}-${index}`} className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{formatLabel(item.status)}</span> on {formatDate(item.changedAt)}
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

export function CommunicationList({ calls }: { calls: DashboardCall[] }) {
  if (calls.length === 0) {
    return <p className="rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-500 font-medium">No conversation records found.</p>
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <article key={call.id} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LeadIdentity call={call} />
                <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
                <Badge tone={call.urgency === 'high' ? 'bad' : call.urgency === 'medium' ? 'warn' : 'neutral'}>
                  {formatLabel(call.urgency)} urgency
                </Badge>
                <Badge tone={isConversationFinalized(call) ? 'good' : 'warn'}>
                  {isConversationFinalized(call) ? 'Finalized' : 'In progress'}
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700">{call.summary}</p>
              {call.keyPoints.length > 0 && (
                <ul className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                  {call.keyPoints.slice(0, 4).map((point) => (
                    <li key={point} className="rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-slate-800">
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-3 lg:items-end">
              <p className="text-xs font-medium text-slate-400">{formatDate(call.createdAt)}</p>
              <StatusForm call={call} />
              <Link
                href={`/dashboard?tab=leads&selectedId=${call.id}`}
                prefetch={false}
                className="text-xs font-semibold text-[#0052ff] hover:text-[#0043d9] transition"
              >
                Open lead workspace →
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
