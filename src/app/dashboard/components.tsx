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
    <section className={`rounded-lg border border-white/75 bg-white/92 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 backdrop-blur ${className}`}>
      {children}
    </section>
  )
}

export function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  tone: 'cyan' | 'emerald' | 'amber' | 'rose'
}) {
  const tones = {
    cyan: {
      bar: 'from-[#194ad9] via-[#2563eb] to-[#38bdf8]',
      icon: 'from-[#194ad9] to-[#3b82f6]',
      shadow: 'shadow-[0_8px_16px_-4px_rgba(25,74,217,0.45)]',
    },
    emerald: {
      bar: 'from-[#059669] via-[#10b981] to-[#34d399]',
      icon: 'from-[#059669] to-[#10b981]',
      shadow: 'shadow-[0_8px_16px_-4px_rgba(16,185,129,0.45)]',
    },
    amber: {
      bar: 'from-[#d97706] via-[#f59e0b] to-[#fbbf24]',
      icon: 'from-[#d97706] to-[#f59e0b]',
      shadow: 'shadow-[0_8px_16px_-4px_rgba(245,158,11,0.45)]',
    },
    rose: {
      bar: 'from-[#6e19eb] via-[#9333ea] to-[#ec4899]',
      icon: 'from-[#6e19eb] to-[#9333ea]',
      shadow: 'shadow-[0_8px_16px_-4px_rgba(110,25,235,0.45)]',
    },
  }

  const current = tones[tone]

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${current.bar}`} />
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${current.icon} ${current.shadow} text-base font-black text-white`}>
        {label.slice(0, 1)}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-extrabold text-slate-950 tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600 font-medium">{detail}</p>
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
    <Panel className="mb-6 p-4">
      <form action="/dashboard" className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto_auto] lg:items-end">
        <input type="hidden" name="tab" value={activeTab} />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
          <input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Name, email, phone, service, summary"
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Range</span>
          <select name="range" defaultValue={filters.range ?? '30'} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
          <select name="status" defaultValue={filters.status ?? 'all'} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm">
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{formatLabel(status)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quality</span>
          <select name="quality" defaultValue={filters.quality ?? 'all'} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm">
            <option value="all">All quality</option>
            {['hot', 'warm', 'cold', 'unknown'].map((quality) => (
              <option key={quality} value={quality}>{formatLabel(quality)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Urgency</span>
          <select name="urgency" defaultValue={filters.urgency ?? 'all'} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm">
            <option value="all">All urgency</option>
            {['high', 'medium', 'low', 'unknown'].map((urgency) => (
              <option key={urgency} value={urgency}>{formatLabel(urgency)}</option>
            ))}
          </select>
        </label>
        <button className="h-10 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
          Apply
        </button>
        <Link
          href={exportHref}
          prefetch={false}
          className="flex h-10 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 px-5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
        >
          Export
        </Link>
      </form>
    </Panel>
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
    return <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No conversation records found.</p>
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <article key={call.id} className="rounded-lg border border-white/75 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.07)]">
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
              <p className="mt-3 text-sm leading-6 text-slate-700">{call.summary}</p>
              {call.keyPoints.length > 0 && (
                <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  {call.keyPoints.slice(0, 4).map((point) => (
                    <li key={point} className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-cyan-950">
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-3 lg:items-end">
              <p className="text-sm font-medium text-slate-500">{formatDate(call.createdAt)}</p>
              <StatusForm call={call} />
              <Link
                href={`/dashboard?tab=leads&selectedId=${call.id}`}
                prefetch={false}
                className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
              >
                Open lead workspace
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
