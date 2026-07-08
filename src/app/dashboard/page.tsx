import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDashboardAnalytics, type DashboardCall, type DashboardFilters } from '@/lib/dashboard/analytics'
import { updateCallRecordManagement, updateCallRecordStatus, type LeadStatus } from '@/lib/db/call-records'
import { canMutateDashboard, dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DashboardPageProps = {
  searchParams?: Promise<DashboardFilters & { tab?: string }>
}

type CountItem = {
  label: string
  count: number
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'communications', label: 'Communications' },
  { id: 'leads', label: 'Lead Status' },
  { id: 'ai', label: 'AI Assisted' },
  { id: 'capabilities', label: 'Capabilities' },
] as const

const statusOptions: LeadStatus[] = ['new', 'reviewing', 'qualified', 'proposal', 'won', 'lost']
const chartColors = ['#0891b2', '#059669', '#f59e0b', '#d946ef', '#f43f5e', '#6366f1']
const barClasses = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-indigo-500']
const softClasses = [
  'border-cyan-100 bg-cyan-50 text-cyan-800',
  'border-emerald-100 bg-emerald-50 text-emerald-800',
  'border-amber-100 bg-amber-50 text-amber-900',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800',
  'border-rose-100 bg-rose-50 text-rose-800',
  'border-indigo-100 bg-indigo-50 text-indigo-800',
]
const capabilityCards = [
  {
    title: 'Conversation Intelligence',
    summary: 'Turns completed voice-agent sessions into searchable management records.',
    points: ['Transcript review', 'Intent and category classification', 'Sentiment and urgency signals', 'AI-generated summaries and key points'],
  },
  {
    title: 'Lead Operations',
    summary: 'Keeps captured prospects moving through a simple sales workflow.',
    points: ['Lead detail workspace', 'Status updates and history', 'Owner assignment', 'Follow-up dates and notes'],
  },
  {
    title: 'Executive Reporting',
    summary: 'Surfaces high-level performance indicators for leadership decisions.',
    points: ['Completed calls and captured leads', 'Hot lead volume', 'Pipeline readiness', 'Readiness score and follow-up queue'],
  },
]
const featureCards = [
  {
    title: 'Dashboard Features',
    items: ['Date-range, search, status, quality, and urgency filters', 'CSV export for filtered records', 'Lead quality, intent, service, country, and sentiment breakdowns', 'Communication timeline with transcript previews'],
  },
  {
    title: 'Management Tools',
    items: ['Lead status selector', 'Follow-up owner and due date fields', 'Management notes', 'AI next-step recommendations and risk signals'],
  },
  {
    title: 'Voice Agent Capabilities',
    items: ['Voice and text conversations', 'Lead capture fields', 'Multilingual response behavior', 'Email call-summary notifications'],
  },
]
const technologyGroups = [
  {
    title: 'Frontend',
    items: ['Next.js App Router', 'React 19', 'TypeScript', 'Tailwind CSS'],
  },
  {
    title: 'AI And Voice',
    items: ['OpenAI chat completions', 'OpenAI Whisper transcription', 'OpenAI TTS', 'ElevenLabs TTS option'],
  },
  {
    title: 'Data And Messaging',
    items: ['MongoDB call records', 'Nodemailer SMTP delivery', 'Server Actions', 'CSV export route'],
  },
  {
    title: 'Validation And Tooling',
    items: ['Zod validation', 'ESLint', 'PostCSS', 'tsx CLI tools'],
  },
]

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

async function updateStatusAction(formData: FormData) {
  'use server'

  const session = await getVerifiedSession()
  if (!session || !canMutateDashboard(session)) return

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as LeadStatus
  if (statusOptions.includes(status)) {
    await updateCallRecordStatus(id, status, dashboardScopeForSession(session))
    revalidatePath('/dashboard')
  }
}

async function updateManagementAction(formData: FormData) {
  'use server'

  const session = await getVerifiedSession()
  if (!session || !canMutateDashboard(session)) return

  await updateCallRecordManagement({
    id: String(formData.get('id') ?? ''),
    owner: String(formData.get('owner') ?? ''),
    followUpAt: String(formData.get('followUpAt') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    scope: dashboardScopeForSession(session),
  })
  revalidatePath('/dashboard')
}

function toneForQuality(value: string): 'neutral' | 'good' | 'warn' | 'bad' {
  if (value === 'hot') return 'warn'
  if (value === 'warm') return 'good'
  if (value === 'cold') return 'bad'
  return 'neutral'
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
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

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-white/75 bg-white/92 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 backdrop-blur ${className}`}>
      {children}
    </section>
  )
}

function StatCard({
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
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-400 to-orange-500',
    rose: 'from-rose-500 to-fuchsia-600',
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/75 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} />
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tones[tone]} text-sm font-black text-white shadow-lg`}>
        {label.slice(0, 1)}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p>
    </div>
  )
}

function Distribution({
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
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{items.length} groups</span>
      </div>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          items.map((item, index) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{formatLabel(item.label)}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-3 rounded-full ${barClasses[index % barClasses.length]}`}
                  style={{ width: `${Math.max(percent(item.count, total), 5)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}

function DonutChart({ title, items, total }: { title: string; items: CountItem[]; total: number }) {
  const visible = items.slice(0, 6)
  const segments = visible.length ? visible : [{ label: 'No data', count: 1 }]
  let cursor = 0
  const gradient = segments
    .map((item, index) => {
      const size = percent(item.count, total || 1)
      const start = cursor
      cursor += size
      return `${chartColors[index % chartColors.length]} ${start}% ${Math.max(cursor, start + 1)}%`
    })
    .join(', ')

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_1fr]">
        <div className="grid h-36 w-36 place-items-center rounded-full shadow-inner" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow">
            <span className="text-xl font-semibold text-slate-950">{total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            visible.map((item, index) => (
              <div key={item.label} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${softClasses[index % softClasses.length]}`}>
                <span className="font-semibold">{formatLabel(item.label)}</span>
                <span>{percent(item.count, total)}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  )
}

function ProgressRing({ value }: { value: number }) {
  const safeValue = Math.min(Math.max(value, 0), 100)

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#0891b2 ${safeValue * 3.6}deg, #e2e8f0 0deg)` }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white">
            <span className="text-3xl font-semibold text-slate-950">{safeValue}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Executive Signal</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Decision readiness</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Weighted view of lead capture, hot-lead volume, and movement into qualified or proposal stages.
          </p>
        </div>
      </div>
    </Panel>
  )
}

function PipelineFunnel({ items, total }: { items: CountItem[]; total: number }) {
  const ordered = statusOptions.map((status) => ({
    label: status,
    count: items.find((item) => item.label === status)?.count ?? 0,
  }))

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold text-slate-950">Lead Pipeline Funnel</h2>
      <div className="mt-5 space-y-3">
        {ordered.map((item, index) => (
          <div key={item.label} className="grid gap-2 sm:grid-cols-[92px_1fr_42px] sm:items-center">
            <span className="text-sm font-semibold text-slate-700">{formatLabel(item.label)}</span>
            <div className="h-9 overflow-hidden rounded-md bg-slate-100">
              <div
                className={`flex h-9 items-center justify-end rounded-md px-3 text-xs font-bold text-white ${barClasses[index % barClasses.length]}`}
                style={{ width: `${Math.max(percent(item.count, total), item.count ? 12 : 0)}%` }}
              >
                {item.count > 0 ? `${percent(item.count, total)}%` : ''}
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-950">{item.count}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function LeadIdentity({ call }: { call: DashboardCall }) {
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

function TranscriptPreview({ call }: { call: DashboardCall }) {
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

function StatusForm({ call }: { call: DashboardCall }) {
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

function FilterBar({
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

function LeadDetailPanel({ call }: { call: DashboardCall | null }) {
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
            <Badge tone={call.emailSent ? 'good' : call.emailError ? 'bad' : 'neutral'}>{call.emailSent ? 'Email sent' : call.emailError ? 'Email failed' : 'Email skipped'}</Badge>
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

function CommunicationList({ calls }: { calls: DashboardCall[] }) {
  if (calls.length === 0) {
    return <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No completed conversations found.</p>
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

function OverviewTab({ analytics }: { analytics: Awaited<ReturnType<typeof getDashboardAnalytics>> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="cyan" label="Completed Calls" value={analytics.totalCalls} detail={`${analytics.callsWithLead} include captured lead details`} />
        <StatCard tone="amber" label="Hot Leads" value={analytics.hotLeads} detail={`${percent(analytics.hotLeads, analytics.totalCalls)}% of conversations`} />
        <StatCard tone="emerald" label="Pipeline Ready" value={analytics.qualifiedPipeline} detail="Qualified, proposal, or won statuses" />
        <StatCard tone="rose" label="Readiness Score" value={`${analytics.conversionReadiness}%`} detail="Weighted lead capture and sales fit" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.45fr]">
        <ProgressRing value={analytics.conversionReadiness} />
        <PipelineFunnel items={analytics.statusCounts} total={analytics.totalCalls} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <DonutChart title="Lead Quality Mix" items={analytics.leadQualityCounts} total={analytics.totalCalls} />
        <Distribution title="Conversation Intent" subtitle="Why visitors contacted the agent" items={analytics.intentCounts} total={analytics.totalCalls} />
        <Distribution title="Sentiment" subtitle="Tone of completed conversations" items={analytics.sentimentCounts} total={analytics.totalCalls} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Distribution title="Service Demand" subtitle="Services mentioned by leads" items={analytics.serviceCounts} total={analytics.totalCalls} />
        <Distribution title="Categories" subtitle="AI classification by request type" items={analytics.categoryCounts} total={analytics.totalCalls} />
        <Distribution title="Countries" subtitle="Lead geography" items={analytics.topCountries} total={analytics.totalCalls} />
      </div>
    </div>
  )
}

function LeadsTab({ analytics }: { analytics: Awaited<ReturnType<typeof getDashboardAnalytics>> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="emerald" label="Email Sent" value={analytics.emailSent} detail={`${analytics.emailFailures} delivery failures`} />
        <StatCard tone="cyan" label="Avg. Messages" value={analytics.averageMessages} detail="Conversation depth per completed call" />
        <StatCard tone="amber" label="Captured Leads" value={`${percent(analytics.callsWithLead, analytics.totalCalls)}%`} detail="Records with any contact or purpose data" />
        <StatCard tone="rose" label="Overdue Follow-Ups" value={analytics.overdueFollowUps} detail={`${analytics.openFollowUps} open follow-up commitments`} />
      </div>
      <LeadDetailPanel call={analytics.selectedCall} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PipelineFunnel items={analytics.statusCounts} total={analytics.totalCalls} />
        <Distribution title="Urgency Levels" subtitle="Operational priority by conversation" items={analytics.urgencyCounts} total={analytics.totalCalls} />
      </div>
      <CommunicationList calls={analytics.recentCalls} />
    </div>
  )
}

function CommunicationsTab({ calls }: { calls: DashboardCall[] }) {
  return (
    <div className="space-y-4">
      {calls.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No communication records are available.</p>
      ) : (
        calls.map((call) => (
          <article key={call.id} className="overflow-hidden rounded-lg border border-white/75 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <div className="h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-400" />
            <div className="p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-3">
                    <LeadIdentity call={call} />
                    <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
                    <Badge tone={call.emailSent ? 'good' : call.emailError ? 'bad' : 'neutral'}>
                      {call.emailSent ? 'Email sent' : call.emailError ? 'Email failed' : 'Email skipped'}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{call.summary}</p>
                  <TranscriptPreview call={call} />
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  <dl className="space-y-3">
                    <div>
                      <dt className="font-semibold text-slate-900">Received</dt>
                      <dd>{formatDate(call.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Intent</dt>
                      <dd>{formatLabel(call.intent)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Sentiment</dt>
                      <dd>{formatLabel(call.sentiment)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Category</dt>
                      <dd>{formatLabel(call.category)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Status</dt>
                      <dd>{formatLabel(call.status)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

function AiTab({ analytics }: { analytics: Awaited<ReturnType<typeof getDashboardAnalytics>> }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-slate-950">AI Assisted Recommendations</h2>
        <div className="mt-4 space-y-3">
          {analytics.aiRecommendations.map((item) => (
            <p key={item} className="rounded-md border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm leading-6 text-slate-800">
              {item}
            </p>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-slate-950">Risk Signals</h2>
        <div className="mt-4 space-y-3">
          {analytics.riskSignals.map((item) => (
            <p key={item} className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-slate-800">
              {item}
            </p>
          ))}
        </div>
      </Panel>
      <section className="xl:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Executive Follow-Up Queue</h2>
          <p className="text-sm text-slate-500">{analytics.followUpQueue.length} priority records</p>
        </div>
        <CommunicationList calls={analytics.followUpQueue} />
      </section>
    </div>
  )
}

function CapabilitiesTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {capabilityCards.map((card, index) => (
          <Panel key={card.title} className="overflow-hidden">
            <div className={`h-1 ${barClasses[index % barClasses.length]}`} />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capability</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
              <ul className="mt-4 space-y-2">
                {card.points.map((point) => (
                  <li key={point} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {featureCards.map((card, index) => (
          <Panel key={card.title} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{card.title}</h2>
              <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${softClasses[index % softClasses.length]}`}>
                {card.items.length} items
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {card.items.map((item) => (
                <p key={item} className="rounded-md border border-white bg-white px-3 py-2 text-sm leading-6 text-slate-700 shadow-sm">
                  {item}
                </p>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Technology Used</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Application Stack</h2>
          </div>
          <p className="text-sm text-slate-500">Runtime, AI, data, and delivery tools behind the dashboard.</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {technologyGroups.map((group) => (
            <div key={group.title} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">{group.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getVerifiedSession()
  if (!session) redirect('/admin/login?next=/dashboard')

  const resolvedSearchParams = await searchParams
  const activeTab = (
    tabs.some((tab) => tab.id === resolvedSearchParams?.tab)
      ? resolvedSearchParams?.tab
      : 'overview'
  ) ?? 'overview'
  const filters: DashboardFilters = {
    q: resolvedSearchParams?.q,
    status: resolvedSearchParams?.status,
    quality: resolvedSearchParams?.quality,
    urgency: resolvedSearchParams?.urgency,
    range: resolvedSearchParams?.range ?? '30',
    selectedId: resolvedSearchParams?.selectedId,
  }
  const analytics = await getDashboardAnalytics(filters, {
    scope: dashboardScopeForSession(session),
  })
  const tabHref = (tab: string) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    for (const key of ['q', 'status', 'quality', 'urgency', 'range', 'selectedId'] as const) {
      const value = filters[key]
      if (value && value !== 'all') params.set(key, value)
    }
    return `/dashboard?${params.toString()}`
  }
  const exportHref = () => {
    const params = new URLSearchParams()
    for (const key of ['q', 'status', 'quality', 'urgency', 'range'] as const) {
      const value = filters[key]
      if (value && value !== 'all') params.set(key, value)
    }
    const query = params.toString()
    return query ? `/dashboard/export?${query}` : '/dashboard/export'
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#cffafe_0,#f8fafc_36%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-lg border border-white/75 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <div className="bg-[linear-gradient(120deg,rgba(6,182,212,0.35),rgba(16,185,129,0.18),rgba(245,158,11,0.22))] p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Voice Agent Intelligence</p>
                <h1 className="mt-2 text-3xl font-semibold text-white lg:text-4xl">Management Dashboard</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  Review communication quality, lead status, email delivery, and decision signals from completed voice-agent conversations.
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 shadow-inner">
                <p>Updated {formatDate(analytics.generatedAt)}</p>
                {session.role === 'platform_admin' && (
                  <Link href="/admin/tenants" className="mt-2 block text-xs font-semibold text-cyan-100 hover:text-white">
                    Manage tenants
                  </Link>
                )}
                {session.role !== 'platform_admin' && session.tenantId && (
                  <Link href={`/admin/tenants/${session.tenantId}`} className="mt-2 block text-xs font-semibold text-cyan-100 hover:text-white">
                    Tenant settings
                  </Link>
                )}
                <form action="/api/admin/auth/logout" method="post" className="mt-2">
                  <button className="text-xs font-semibold text-cyan-100 hover:text-white">
                    Sign out {session.name}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {!analytics.configured && (
          <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            MongoDB is not configured, so the dashboard cannot read completed calls yet. Set MONGODB_URI, MONGODB_DB_NAME, and MONGODB_CALLS_COLLECTION to enable live analytics.
          </section>
        )}

        <nav className="mb-6 flex flex-wrap gap-2 rounded-lg border border-white/75 bg-white/80 p-2 shadow-[0_10px_35px_rgba(15,23,42,0.08)] backdrop-blur" aria-label="Dashboard tabs">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <Link
                key={tab.id}
                href={tabHref(tab.id)}
                prefetch={false}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? 'border-cyan-600 bg-cyan-600 text-white shadow-md'
                    : 'border-transparent bg-transparent text-slate-700 hover:bg-white hover:text-cyan-700'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <FilterBar filters={filters} activeTab={activeTab} exportHref={exportHref()} />

        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'communications' && <CommunicationsTab calls={analytics.recentCalls} />}
        {activeTab === 'leads' && <LeadsTab analytics={analytics} />}
        {activeTab === 'ai' && <AiTab analytics={analytics} />}
        {activeTab === 'capabilities' && <CapabilitiesTab />}
      </div>
    </main>
  )
}
