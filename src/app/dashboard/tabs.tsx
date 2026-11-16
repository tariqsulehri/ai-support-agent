import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardAnalytics, DashboardCall, PaginationMeta } from '@/lib/dashboard/types'
import type { ManagedTenantDetail, ManagedTenantSummary } from '@/lib/tenants/management'
import { GlossyBarChart, GlossyDonutChart, MonthlyCallVolumeChart } from '@/components/admin/3d-charts'
import { DashboardSplitAnalytics } from '@/components/admin/dashboard-split-analytics'
import { capabilityCards, featureCards, softClasses, technologyGroups } from './constants'
import {
  Badge,
  CommunicationList,
  Distribution,
  DonutChart,
  EmptyState,
  LeadDetailPanel,
  PaginationControls,
  Panel,
  PanelHeader,
  PipelineFunnel,
  StatCard,
  percent,
} from './components'
import { Icon } from './_components/icons'
import { btnPrimary, btnSecondary, sectionTitle } from './_components/ui'

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`
}

/* ───────────────────────── Overview ───────────────────────── */

export function OverviewTab({ analytics }: { analytics: DashboardAnalytics }) {
  const n = analytics.filteredCalls
  const positive = analytics.sentimentCounts.find((s) => s.label === 'positive')?.count ?? 0
  const topService = analytics.serviceCounts[0]

  if (!analytics.configured) {
    return (
      <EmptyState
        title="Conversation database not connected"
        description="Configure MongoDB for the platform (MONGODB_URI) or a tenant database URL to start recording conversations."
      />
    )
  }

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon="communications"
          label="Conversations"
          value={n.toLocaleString()}
          context={n !== analytics.totalCalls ? `of ${analytics.totalCalls.toLocaleString()}` : undefined}
          detail="matching the current filters"
          tooltip="Voice and chat conversations recorded by the agent."
        />
        <StatCard
          tone="emerald"
          icon="user"
          label="Lead capture"
          value={`${percent(analytics.callsWithLead, n)}%`}
          context={plural(analytics.callsWithLead, 'lead')}
          detail="conversations with contact details"
          progress={percent(analytics.callsWithLead, n)}
          tooltip="Share of conversations where the visitor left a name, email, phone, company or purpose."
        />
        <StatCard
          tone="amber"
          icon="ready"
          label="Hot leads"
          value={`${percent(analytics.hotLeads, n)}%`}
          context={`${analytics.hotLeads.toLocaleString()} hot`}
          detail="classified as strong purchase intent"
          progress={percent(analytics.hotLeads, n)}
          tooltip="Conversations the AI classified as hot leads."
        />
        <StatCard
          icon="communications"
          label="Avg. depth"
          value={analytics.averageMessages}
          context="messages"
          detail="per conversation"
          tooltip="Average number of visitor and agent messages per conversation."
        />
        <StatCard
          tone="purple"
          icon="overview"
          label="Readiness score"
          value={`${analytics.conversionReadiness}%`}
          detail="weighted capture, intent & pipeline"
          progress={analytics.conversionReadiness}
          tooltip="(2 × hot leads + pipeline + captured leads) ÷ (4 × conversations)."
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          tone="emerald"
          icon="check"
          label="Pipeline"
          value={analytics.qualifiedPipeline.toLocaleString()}
          context={`${percent(analytics.qualifiedPipeline, n)}%`}
          detail="qualified, proposal or won"
          progress={percent(analytics.qualifiedPipeline, n)}
        />
        <StatCard
          icon="mail"
          label="Summary emails"
          value={analytics.emailSent.toLocaleString()}
          context={analytics.emailFailures ? `${analytics.emailFailures} failed` : undefined}
          detail="call recaps delivered to the team"
          tone={analytics.emailFailures ? 'rose' : 'blue'}
        />
        <StatCard
          tone="rose"
          icon="clock"
          label="Overdue follow-ups"
          value={analytics.overdueFollowUps.toLocaleString()}
          context={`of ${analytics.openFollowUps.toLocaleString()} open`}
          detail="past their scheduled date"
          tooltip="Open (not won/lost) records whose follow-up date has passed. Not affected by filters."
        />
        <StatCard
          tone="amber"
          icon="sentiment"
          label="Positive sentiment"
          value={`${percent(positive, n)}%`}
          context={`${positive.toLocaleString()} conversations`}
          detail="visitor tone rated positive"
          progress={percent(positive, n)}
        />
        <StatCard
          icon="capabilities"
          label="Top service"
          value={topService ? topService.count.toLocaleString() : '—'}
          detail={topService ? formatLabel(topService.label) : 'No services detected yet'}
          tooltip="Most requested service in the selected period."
        />
      </div>

      <DashboardSplitAnalytics
        totalCalls={n}
        hotLeads={analytics.hotLeads}
        qualifiedPipeline={analytics.qualifiedPipeline}
        statusCounts={analytics.statusCounts}
        leadQualityCounts={analytics.leadQualityCounts}
        serviceCounts={analytics.serviceCounts}
        intentCounts={analytics.intentCounts}
      />

      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <MonthlyCallVolumeChart
          items={analytics.monthlyCallVolume.map((item) => ({ label: item.label, value: item.count, color: '#0052ff' }))}
        />
        <DonutChart
          title="Lead Quality Mix"
          subtitle="AI lead qualification distribution"
          items={analytics.leadQualityCounts}
          total={n}
          unit="conversations"
          infoTooltip="Conversations grouped by the AI's lead quality classification."
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Distribution title="Conversation Intent" subtitle="Why visitors contacted the agent" items={analytics.intentCounts} total={n} />
        <Distribution title="Sentiment" subtitle="Tone of conversations" items={analytics.sentimentCounts} total={n} />
        <Distribution title="Service Demand" subtitle="Services mentioned by leads" items={analytics.serviceCounts} total={n} />
        <Distribution title="Request Categories" subtitle="AI classification by request type" items={analytics.categoryCounts} total={n} />
        <Distribution title="Lead Geography" subtitle="Top visitor countries" items={analytics.topCountries} total={n} />
      </div>
    </div>
  )
}

/* ───────────────────────── Leads ───────────────────────── */

export function LeadsTab({ analytics, canEdit = true }: { analytics: DashboardAnalytics; canEdit?: boolean }) {
  const n = analytics.filteredCalls
  return (
    <div className="space-y-3.5">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="emerald"
          icon="user"
          label="Captured leads"
          value={`${percent(analytics.callsWithLead, n)}%`}
          context={plural(analytics.callsWithLead, 'lead')}
          detail="conversations with contact details"
          progress={percent(analytics.callsWithLead, n)}
        />
        <StatCard
          tone="amber"
          icon="ready"
          label="Hot leads"
          value={analytics.hotLeads.toLocaleString()}
          detail="strong purchase intent"
        />
        <StatCard
          icon="check"
          label="Pipeline"
          value={analytics.qualifiedPipeline.toLocaleString()}
          detail="qualified, proposal or won"
        />
        <StatCard
          tone="rose"
          icon="clock"
          label="Overdue follow-ups"
          value={analytics.overdueFollowUps.toLocaleString()}
          context={`of ${analytics.openFollowUps.toLocaleString()} open`}
          detail="past their scheduled date"
        />
      </div>

      <LeadDetailPanel call={analytics.selectedCall} canEdit={canEdit} />

      <div className="grid gap-3 lg:grid-cols-2">
        <PipelineFunnel items={analytics.statusCounts} total={n} />
        <Distribution title="Urgency" subtitle="Operational priority by conversation" items={analytics.urgencyCounts} total={n} />
      </div>

      <RecordList
        title="Recent lead interactions"
        calls={analytics.recentCalls}
        pagination={analytics.pagination}
        canEdit={canEdit}
        clearFiltersHref="/dashboard?tab=leads"
      />
    </div>
  )
}

/* ───────────────────────── Communications ───────────────────────── */

function RecordList({
  title,
  calls,
  pagination,
  canEdit,
  clearFiltersHref,
}: {
  title: string
  calls: DashboardCall[]
  pagination?: PaginationMeta
  canEdit: boolean
  clearFiltersHref?: string
}) {
  const isFiltered = pagination && pagination.totalRecords > 0 && pagination.filteredRecords === 0
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className={sectionTitle}>{title}</h3>
        {pagination && pagination.filteredRecords > 0 && (
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        )}
      </div>
      <CommunicationList
        calls={calls}
        canEdit={canEdit}
        emptyTitle={isFiltered ? 'No rows match these filters' : 'No conversations recorded yet'}
        emptyDescription={
          isFiltered
            ? 'Try widening the search query, date range, or resetting status filters.'
            : 'Conversations will appear here once visitors start interacting with the voice agent.'
        }
        clearFiltersHref={isFiltered ? clearFiltersHref : undefined}
      />
      {pagination && <PaginationControls pagination={pagination} />}
    </section>
  )
}

export function CommunicationsTab({
  calls,
  pagination,
  canEdit = true,
}: {
  calls: DashboardCall[]
  pagination?: PaginationMeta
  canEdit?: boolean
}) {
  return (
    <RecordList
      title="Call transcripts & intelligence"
      calls={calls}
      pagination={pagination}
      canEdit={canEdit}
      clearFiltersHref="/dashboard?tab=communications"
    />
  )
}

/* ───────────────────────── AI ───────────────────────── */

function InsightList({ items, tone }: { items: string[]; tone: 'blue' | 'rose' }) {
  const styles = tone === 'blue' ? 'border-blue-200 bg-blue-50/60' : 'border-rose-200 bg-rose-50/60'
  const dot = tone === 'blue' ? 'bg-[#0052ff]' : 'bg-rose-500'
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed text-slate-800 ${styles}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function AiTab({ analytics, canEdit = true }: { analytics: DashboardAnalytics; canEdit?: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Recommendations" icon="ai" description="Derived from aggregate counts for all conversations matching the filters." />
        <div className="p-5 sm:p-6">
          <InsightList items={analytics.aiRecommendations} tone="blue" />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Risk signals" icon="warning" iconTone="rose" />
        <div className="p-5 sm:p-6">
          <InsightList items={analytics.riskSignals} tone="rose" />
        </div>
      </Panel>

      <section className="xl:col-span-2">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className={sectionTitle}>Follow-up queue</h2>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0052ff]">
            {plural(analytics.followUpQueue.length, 'priority record')}
          </span>
        </div>
        <CommunicationList
          calls={analytics.followUpQueue}
          canEdit={canEdit}
          emptyTitle="Follow-up queue is clear"
          emptyDescription="No open hot leads, high-urgency conversations or scheduled follow-ups."
        />
      </section>
    </div>
  )
}

/* ───────────────────────── Capabilities (static product info) ───────────────────────── */

export function CapabilitiesTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {capabilityCards.map((card) => (
          <Panel key={card.title}>
            <PanelHeader title={card.title} description={card.summary} />
            <ul className="space-y-2 p-5 sm:p-6">
              {card.points.map((point) => (
                <li key={point} className="flex items-center gap-2 rounded-xl border border-slate-200/80 px-3.5 py-2.5 text-xs font-medium text-slate-800">
                  <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {point}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {featureCards.map((card, index) => (
          <Panel key={card.title}>
            <PanelHeader
              title={card.title}
              actions={
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${softClasses[index % softClasses.length]}`}>
                  {card.items.length} items
                </span>
              }
            />
            <ul className="space-y-2 p-5 sm:p-6">
              {card.items.map((item) => (
                <li key={item} className="rounded-xl border border-slate-200/80 px-3.5 py-2 text-xs leading-relaxed text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader title="Application stack" description="Runtime, AI, data and delivery tools behind the Support Agent." />
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          {technologyGroups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">{group.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
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

/* ───────────────────────── Platform tenants ───────────────────────── */

function ConfigurationStatus({ label, detail, complete, optional }: { label: string; detail: string; complete: boolean; optional?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">{label}</p>
          <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-600">{detail}</p>
        </div>
        <Badge tone={complete ? 'good' : optional ? 'neutral' : 'warn'}>{complete ? 'Ready' : optional ? 'Optional' : 'Required'}</Badge>
      </div>
    </div>
  )
}

export function PlatformTenantsTab({ tenants }: { tenants: ManagedTenantSummary[] }) {
  const count = (pred: (t: ManagedTenantSummary) => boolean) => tenants.filter(pred).length
  const active = count((t) => t.status === 'active')
  const disabled = count((t) => t.status === 'disabled')
  const archived = count((t) => t.status === 'archived')
  const withKey = count((t) => t.hasOpenAiKey)
  const missingKey = tenants.length - withKey

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Tenant control center"
          icon="tenants"
          description="Manage tenant accounts, review subscription state and open a tenant's configuration."
          actions={
            <>
              <Link href="/admin/tenants?tab=tenants" className={btnSecondary}>Manage all tenants</Link>
              <Link href="/admin/tenants?tab=create" className={btnPrimary}>+ Create tenant</Link>
            </>
          }
        />

        <div className="grid gap-3.5 p-5 sm:grid-cols-2 sm:p-6 md:grid-cols-4">
          <StatCard label="Total tenants" value={tenants.length} detail="registered accounts" icon="tenants" />
          <StatCard label="Active" value={active} detail="currently enabled" tone="emerald" icon="check" progress={percent(active, tenants.length)} />
          <StatCard label="Disabled" value={disabled} detail="temporarily disabled" tone="amber" icon="clock" />
          <StatCard label="Missing OpenAI key" value={missingKey} detail="need API setup" tone="rose" icon="warning" />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlossyDonutChart
          title="Tenant Status"
          subtitle="Accounts by operating status"
          total={tenants.length}
          unit="tenants"
          items={[
            { label: 'Active', value: active, color: '#10b981' },
            { label: 'Disabled', value: disabled, color: '#f59e0b' },
            { label: 'Archived', value: archived, color: '#64748b' },
          ]}
        />
        <GlossyBarChart
          title="Tenant Setup Readiness"
          totalLabel={plural(tenants.length, 'tenant')}
          total={tenants.length}
          infoTooltip="Tenants with OpenAI credentials configured vs. still missing a key."
          items={[
            { label: 'OpenAI key configured', value: withKey, color: '#0052ff' },
            { label: 'OpenAI key missing', value: missingKey, color: '#ea580c' },
          ]}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Tenant accounts"
          description="Open a tenant to configure domains, subscription, users and setup."
          actions={
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{tenants.length} total</span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3.5">Tenant</th>
                <th scope="col" className="px-5 py-3.5">Allowed domains</th>
                <th scope="col" className="px-5 py-3.5">Subscription</th>
                <th scope="col" className="px-5 py-3.5">OpenAI key</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No tenants configured yet.</td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.tenantId} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-950">{tenant.companyName}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{tenant.tenantId}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="line-clamp-2 break-words">{tenant.domains.length ? tenant.domains.join(', ') : 'No domains'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={tenant.subscriptionStatus === 'active' || tenant.subscriptionStatus === 'trial' ? 'good' : 'warn'}>
                          {formatLabel(tenant.subscriptionStatus)}
                        </Badge>
                        <Badge tone="indigo">{formatLabel(tenant.subscriptionType)}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={tenant.hasOpenAiKey ? 'good' : 'warn'}>{tenant.hasOpenAiKey ? 'Configured' : 'Missing'}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={tenant.status === 'active' ? 'good' : tenant.status === 'disabled' ? 'warn' : 'neutral'}>
                        {formatLabel(tenant.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/tenants/${tenant.tenantId}`} className={`${btnPrimary} h-8 px-3.5`}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

/* ───────────────────────── Tenant configuration ───────────────────────── */

export function TenantConfigurationTab({ tenantId, detail }: { tenantId?: string | null; detail: ManagedTenantDetail | null }) {
  const targetId = detail?.tenant?.tenantId || tenantId
  const settingsHref = targetId ? `/admin/tenants/${targetId}` : '/admin/tenants'

  if (!detail) {
    return <EmptyState title="Tenant configuration unavailable" description="Configuration is not available for this account yet." />
  }

  const verifiedDomains = detail.domains.filter((d) => d.verificationStatus === 'verified')
  const email = detail.settings.emailNotifications

  return (
    <Panel>
      <PanelHeader
        title={detail.tenant.companyName}
        icon="configuration"
        description="Configure the agent persona, OpenAI credentials, lead database, SMTP alerts, domain verification and the website embed snippet."
        actions={<Link href={settingsHref} className={btnPrimary}>Open configuration →</Link>}
      />

      <div className="grid gap-3.5 p-5 sm:p-6 md:grid-cols-2">
        <ConfigurationStatus
          label="OpenAI key"
          detail={detail.openAiSecret ? `Stored as ${detail.openAiSecret.maskedValue}.` : 'No OpenAI key configured.'}
          complete={Boolean(detail.openAiSecret)}
        />
        <ConfigurationStatus
          label="Lead database"
          detail={detail.databaseUrlSecret ? `Stored as ${detail.databaseUrlSecret.maskedValue}.` : 'Using the platform database.'}
          complete={Boolean(detail.databaseUrlSecret)}
          optional
        />
        <ConfigurationStatus
          label="Verified domain"
          detail={verifiedDomains.length ? `${plural(verifiedDomains.length, 'verified domain')}.` : 'Domain verification is pending.'}
          complete={verifiedDomains.length > 0}
        />
        <ConfigurationStatus
          label="SMTP email"
          detail={
            email?.enabled
              ? detail.smtpPasswordSecret
                ? `Enabled as ${detail.smtpPasswordSecret.maskedValue}.`
                : 'SMTP is enabled but the password is not stored yet.'
              : 'Not enabled. Configure SMTP to email call summaries.'
          }
          complete={Boolean(email?.enabled && detail.smtpPasswordSecret)}
          optional={!email?.enabled}
        />
      </div>
    </Panel>
  )
}
