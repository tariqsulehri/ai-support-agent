import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardAnalytics, DashboardCall } from '@/lib/dashboard/types'
import { GlossyBarChart, GlossyDonutChart } from '@/components/admin/3d-charts'
import { chartColors, statusOptions, type CountItem } from './constants'
import { LeadManagementForm, LeadStarRating, LocalTime, OptimisticStatusForm } from './client-controls'
import { Badge, EmptyState, Panel, percent, toneForQuality, toneForSentiment, toneForUrgency } from './_components/primitives'
import { btnPrimary, cx } from './_components/ui'

// Barrel exports so tabs and other modules import from one place.
export { Badge, EmptyState, Panel, StatCard, percent, toneForQuality } from './_components/primitives'
export { FilterBar, LeadStarRating, OptimisticStatusForm, PaginationControls, LocalTime } from './client-controls'

/* ───────────────────────── Helpers ───────────────────────── */

const utcFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/** Deterministic server-side date (UTC). Prefer <LocalTime> in rendered UI. */
export function formatDate(value: string): string {
  return utcFormatter.format(new Date(value))
}

export function isConversationFinalized(call: DashboardCall): boolean {
  return Boolean(call.finalizedAt || call.emailSent || call.emailError)
}

export function emailStatusLabel(call: DashboardCall): string {
  if (call.emailSent) return 'Email sent'
  if (call.emailError) return 'Email failed'
  return isConversationFinalized(call) ? 'Email skipped' : 'Email pending'
}

export function emailStatusTone(call: DashboardCall): 'good' | 'bad' | 'warn' | 'neutral' {
  if (call.emailSent) return 'good'
  if (call.emailError) return 'bad'
  return isConversationFinalized(call) ? 'neutral' : 'warn'
}

function leadDisplayName(call: DashboardCall): string {
  return call.lead.name || call.lead.company || call.lead.email || 'Anonymous visitor'
}

/* ───────────────────────── Hero ───────────────────────── */

export function HeroBannerCard({ userName, analytics }: { userName?: string; analytics: DashboardAnalytics }) {
  const firstName = userName?.trim().split(/\s+/)[0] || 'there'
  const readiness = Math.min(Math.max(analytics.conversionReadiness, 0), 100)
  const captureRate = percent(analytics.callsWithLead, analytics.filteredCalls)

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0052ff] to-[#0b3ec4] p-6 text-white shadow-[0_8px_30px_rgba(0,82,255,0.2)] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-2xl flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Welcome back, {firstName}</h2>
            <p className="mt-0.5 text-xs font-medium text-blue-100">
              {analytics.filteredCalls.toLocaleString()} conversations in the selected period
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 text-slate-900 shadow-sm">
            <p className="text-xs font-medium leading-snug">
              <span className="font-semibold">
                {analytics.callsWithLead.toLocaleString()} of {analytics.filteredCalls.toLocaleString()}
              </span>{' '}
              conversations captured contact details ({captureRate}% capture rate).
            </p>
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Lead capture rate"
              aria-valuenow={captureRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-[#0052ff] transition-[width] duration-500" style={{ width: `${captureRate}%` }} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
              <span>{analytics.hotLeads.toLocaleString()} hot leads</span>
              <span>
                {analytics.overdueFollowUps > 0
                  ? `${analytics.overdueFollowUps} overdue follow-up${analytics.overdueFollowUps === 1 ? '' : 's'}`
                  : 'No overdue follow-ups'}
              </span>
            </div>
          </div>
        </div>

        <dl className="flex shrink-0 items-center gap-8 sm:gap-10 lg:border-l lg:border-white/20 lg:pl-8">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Pipeline</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">{analytics.qualifiedPipeline.toLocaleString()}</dd>
            <dd className="mt-0.5 text-[11px] text-blue-100/90">qualified, proposal or won</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Readiness</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">{readiness}%</dd>
            <dd className="mt-0.5 text-[11px] text-blue-100/90">weighted conversion score</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

/* ───────────────────────── Charts ───────────────────────── */

function toChartItems(items: CountItem[]) {
  return items.map((item, index) => ({
    label: formatLabel(item.label),
    value: item.count,
    color: chartColors[index % chartColors.length],
  }))
}

export function Distribution({ title, subtitle, items, total }: { title: string; subtitle?: string; items: CountItem[]; total: number }) {
  return (
    <GlossyBarChart
      title={title}
      subtitle={subtitle}
      totalLabel={`${items.length} group${items.length === 1 ? '' : 's'}`}
      total={total}
      variant="distribution"
      items={toChartItems(items)}
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
      items={toChartItems(items.slice(0, 6))}
    />
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
      infoTooltip="Conversations by pipeline status, as a share of conversations matching the filters."
      total={total}
      variant="funnel"
      items={toChartItems(ordered)}
    />
  )
}

/* ───────────────────────── Communication cards ───────────────────────── */

export function LeadIdentity({ call }: { call: DashboardCall }) {
  const details = [call.lead.email, call.lead.phone, call.lead.country].filter(Boolean)
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="truncate text-base font-semibold tracking-tight text-slate-950">{leadDisplayName(call)}</h3>
        <LeadStarRating score={call.maturityScore} label={call.maturityLabel} />
      </div>
      <p className="mt-0.5 truncate text-xs text-slate-500">{details.length ? details.join(' · ') : 'No contact details captured'}</p>
    </div>
  )
}

export function TranscriptPreview({ call, limit = 6 }: { call: DashboardCall; limit?: number }) {
  const messages = call.transcript.slice(0, limit)
  const remaining = Math.max(call.messageCount - messages.length, 0)

  if (messages.length === 0) {
    return <p className="text-xs italic text-slate-400">No transcript recorded for this conversation.</p>
  }

  return (
    <details className="group rounded-xl border border-slate-200/80 bg-slate-50/70">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 [&::-webkit-details-marker]:hidden">
        <span>Transcript · {call.messageCount} message{call.messageCount === 1 ? '' : 's'}</span>
        <span className="transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <ol className="space-y-2 px-3.5 pb-3.5">
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          return (
            <li key={index} className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
              <div
                className={cx(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                  isUser ? 'rounded-tr-sm border border-slate-200 bg-white text-slate-900' : 'rounded-tl-sm border border-blue-100 bg-blue-50 text-slate-800'
                )}
              >
                <span className={cx('mb-0.5 block text-[10px] font-semibold', isUser ? 'text-slate-500' : 'text-[#0052ff]')}>
                  {isUser ? 'Visitor' : 'Agent'}
                </span>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </li>
          )
        })}
        {remaining > 0 && (
          <li className="pt-1 text-center text-[11px] font-medium text-slate-400">
            + {remaining} more message{remaining === 1 ? '' : 's'} — open the lead workspace for the full transcript
          </li>
        )}
      </ol>
    </details>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}

export function CommunicationCard({ call, canEdit = true }: { call: DashboardCall; canEdit?: boolean }) {
  const finalized = isConversationFinalized(call)
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:border-blue-200 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3.5">
          <LeadIdentity call={call} />
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
            <Badge tone={toneForUrgency(call.urgency)}>{formatLabel(call.urgency)} urgency</Badge>
            <Badge tone={emailStatusTone(call)}>{emailStatusLabel(call)}</Badge>
            <Badge tone={finalized ? 'good' : 'warn'}>{finalized ? 'Finalized' : 'In progress'}</Badge>
          </div>

          <p className="rounded-xl border-l-4 border-l-[#0052ff] bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">{call.summary}</p>

          {call.keyPoints.length > 0 && (
            <ul className="grid gap-2 text-xs sm:grid-cols-2">
              {call.keyPoints.slice(0, 4).map((point, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border border-slate-200/80 p-3 text-slate-800">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0052ff]" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          <TranscriptPreview call={call} />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 lg:w-64">
          <dl className="space-y-2">
            <MetaRow label="Created">
              <LocalTime iso={call.createdAt} className="font-medium text-slate-700" />
            </MetaRow>
            <MetaRow label="Intent">
              <span className="font-semibold text-slate-800">{formatLabel(call.intent)}</span>
            </MetaRow>
            <MetaRow label="Sentiment">
              <Badge tone={toneForSentiment(call.sentiment)}>{formatLabel(call.sentiment)}</Badge>
            </MetaRow>
            <MetaRow label="Category">
              <span className="font-semibold text-slate-800">{formatLabel(call.category)}</span>
            </MetaRow>
            {call.owner && (
              <MetaRow label="Owner">
                <span className="font-semibold text-slate-800">{call.owner}</span>
              </MetaRow>
            )}
          </dl>
          <div className="space-y-2 border-t border-slate-200/70 pt-3">
            <OptimisticStatusForm callId={call.id} initialStatus={call.status} readOnly={!canEdit} />
            <Link href={`/dashboard?tab=leads&selectedId=${call.id}`} className={cx(btnPrimary, 'w-full')}>
              Open lead workspace →
            </Link>
          </div>
        </aside>
      </div>
    </article>
  )
}

export function CommunicationList({
  calls,
  canEdit = true,
  emptyTitle = 'No conversations found',
  emptyDescription = 'No conversations match the current filters. Try widening the date range.',
}: {
  calls: DashboardCall[]
  canEdit?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (calls.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <CommunicationCard key={call.id} call={call} canEdit={canEdit} />
      ))}
    </div>
  )
}

/* ───────────────────────── Lead workspace ───────────────────────── */

export function LeadDetailPanel({ call, canEdit = true }: { call: DashboardCall | null; canEdit?: boolean }) {
  if (!call) {
    return (
      <EmptyState
        title="No lead selected"
        description="Pick a conversation from the list below (Open lead workspace) to review details and plan the follow-up."
      />
    )
  }

  const facts: Array<[string, string | null]> = [
    ['Email', call.lead.email],
    ['Phone', call.lead.phone],
    ['Company', call.lead.company],
    ['Country', call.lead.country],
    ['Intent', formatLabel(call.intent)],
    ['Category', formatLabel(call.category)],
  ]

  return (
    <Panel>
      <div className="flex flex-col gap-3 bg-gradient-to-r from-[#0052ff] to-[#1e3a8a] p-6 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Lead workspace</span>
          <LeadStarRating score={call.maturityScore} label={call.maturityLabel} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{leadDisplayName(call)}</h2>
        <p className="max-w-2xl text-xs leading-relaxed text-blue-100">{call.lead.purpose || call.summary}</p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-2">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={toneForQuality(call.leadQuality)}>{formatLabel(call.leadQuality)}</Badge>
            <Badge tone={toneForUrgency(call.urgency)}>{formatLabel(call.urgency)} urgency</Badge>
            <Badge tone={emailStatusTone(call)}>{emailStatusLabel(call)}</Badge>
          </div>

          <dl className="grid gap-2.5 text-xs sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className={cx('mt-1 break-words font-semibold', value ? 'text-slate-900' : 'text-slate-400')}>{value || 'Not captured'}</dd>
              </div>
            ))}
          </dl>

          {call.nextSteps.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">AI next steps</h3>
              <ul className="space-y-2 text-xs">
                {call.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-emerald-950">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TranscriptPreview call={call} limit={call.transcript.length} />
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pipeline status</h3>
            <OptimisticStatusForm callId={call.id} initialStatus={call.status} readOnly={!canEdit} />
          </div>
          <div className="border-t border-slate-200/70 pt-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Management follow-up</h3>
            <LeadManagementForm
              key={call.id}
              callId={call.id}
              owner={call.owner}
              followUpAt={call.followUpAt}
              notes={call.notes}
              readOnly={!canEdit}
            />
          </div>

          {call.statusHistory.length > 0 && (
            <div className="border-t border-slate-200/70 pt-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status history</h3>
              <ol className="space-y-1.5 text-xs">
                {call.statusHistory
                  .slice(-5)
                  .reverse()
                  .map((item, i) => (
                    <li key={`${item.changedAt}-${i}`} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{formatLabel(item.status)}</span>
                      <LocalTime iso={item.changedAt} className="text-slate-400" />
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-40 rounded-md bg-slate-200" />
            <div className="h-4 w-20 rounded-full bg-slate-100" />
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
