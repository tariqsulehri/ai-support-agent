import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardAnalytics, DashboardCall, PaginationMeta } from '@/lib/dashboard/analytics'
import type { ManagedTenantDetail, ManagedTenantSummary } from '@/lib/tenants/management'
import { GlossyBarChart, GlossyDonutChart, MonthlyCallVolumeChart } from '@/components/admin/3d-charts'
import { DashboardSplitAnalytics } from '@/components/admin/dashboard-split-analytics'
import {
  capabilityCards,
  featureCards,
  softClasses,
  technologyGroups,
} from './constants'
import {
  Badge,
  CommunicationList,
  Distribution,
  DonutChart,
  HeroBannerCard,
  LeadDetailPanel,
  PaginationControls,
  Panel,
  PipelineFunnel,
  StatCard,
  percent,
} from './components'

export function OverviewTab({
  analytics,
  userName,
}: {
  analytics: DashboardAnalytics
  userName?: string
}) {
  return (
    <div className="space-y-5">
      {/* 1. Hero Banner Card (Strictly extracted from Callibar visual design) */}
      <HeroBannerCard userName={userName} analytics={analytics} />

      {/* 2. Row 1 of 5-column metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          tone="blue"
          icon="assessed"
          label="Total Inquiries"
          value={analytics.totalCalls}
          target={`${analytics.callsWithLead} leads`}
          detail="have at least one qualified lead"
          tooltip="Total processed inbound voice and chat inquiries"
        />
        <StatCard
          tone="amber"
          icon="ready"
          label="High Intent"
          value={`${percent(analytics.hotLeads, analytics.totalCalls)}%`}
          target={`${analytics.hotLeads} hot`}
          detail="ready for active sales outreach"
          tooltip="Proportion of conversations exhibiting strong purchase intent"
        />
        <StatCard
          tone="blue"
          icon="comm"
          label="Average Depth"
          value={analytics.averageMessages}
          target="5.0 avg"
          detail="turns per conversation session"
          tooltip="Average exchange count between visitor and AI voice agent"
        />
        <StatCard
          tone="emerald"
          icon="check"
          label="Pipeline Ready"
          value={analytics.qualifiedPipeline}
          target={`${analytics.totalCalls} total`}
          detail="qualified, proposal, or won stage"
          tooltip="Prospects currently in an active or proposal pipeline stage"
        />
        <StatCard
          tone="purple"
          icon="target"
          label="Readiness Score"
          value={`${analytics.conversionReadiness}%`}
          target="80% target"
          detail="weighted capture & sales fit"
          tooltip="Composite metric scoring lead qualification depth and conversion viability"
        />
      </div>

      {/* 3. Row 2 of 5-column metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          tone="emerald"
          icon="lead"
          label="Captured Leads"
          value={`${percent(analytics.callsWithLead, analytics.totalCalls)}%`}
          target={`${analytics.callsWithLead} captured`}
          detail="records with full contact details"
          tooltip="Records containing verified contact information or explicit purpose"
        />
        <StatCard
          tone="blue"
          icon="clock"
          label="Email Alerts"
          value={analytics.emailSent}
          target={`${analytics.emailFailures} failed`}
          detail="delivered to team mailboxes"
          tooltip="Automated executive summary emails delivered to team members"
        />
        <StatCard
          tone="rose"
          icon="waiting"
          label="Overdue Actions"
          value={analytics.overdueFollowUps}
          target={`${analytics.openFollowUps} open`}
          detail="require immediate management"
          tooltip="Open follow-up commitments past their targeted resolution deadline"
        />
        <StatCard
          tone="amber"
          icon="sentiment"
          label="Positive Tone"
          value={`${percent(analytics.sentimentCounts[0]?.count || 0, analytics.totalCalls)}%`}
          detail={`${formatLabel(analytics.sentimentCounts[0]?.label || 'Neutral')} dominant mood`}
          tooltip="Visitor satisfaction and sentiment rating scored by the agent"
        />
        <StatCard
          tone="blue"
          icon="service"
          label="Primary Service"
          value={analytics.serviceCounts[0]?.count || 0}
          detail={`${formatLabel(analytics.serviceCounts[0]?.label || 'General Assistance')}`}
          tooltip="Most requested service category in this reporting period"
        />
      </div>

      {/* 4. Bottom 2-Column Split: Promotion Pipeline Donut + Teams Against Target Benchmarks */}
      <DashboardSplitAnalytics
        totalCalls={analytics.totalCalls}
        hotLeads={analytics.hotLeads}
        qualifiedPipeline={analytics.qualifiedPipeline}
        statusCounts={analytics.statusCounts}
        leadQualityCounts={analytics.leadQualityCounts}
        serviceCounts={analytics.serviceCounts}
        intentCounts={analytics.intentCounts}
      />

      {/* 5. Monthly Call Volume & Quality Mix */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <MonthlyCallVolumeChart
          items={analytics.monthlyCallVolume.map((item) => ({
            label: item.label,
            value: item.count,
            color: '#0052ff',
          }))}
        />
        <DonutChart
          title="Lead Quality Mix"
          subtitle="AI lead qualification distribution"
          items={analytics.leadQualityCounts}
          total={analytics.totalCalls}
          unit="leads"
          infoTooltip="Distribution of analyzed visitor conversations categorized by lead qualification quality"
          showInsight={true}
        />
      </div>

      {/* 6. Categorical Distributions */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Distribution
          title="Conversation Intent"
          subtitle="Why visitors contacted the agent"
          items={analytics.intentCounts}
          total={analytics.totalCalls}
        />
        <Distribution
          title="Sentiment Breakdown"
          subtitle="Tone of completed conversations"
          items={analytics.sentimentCounts}
          total={analytics.totalCalls}
        />
        <Distribution
          title="Service Demand"
          subtitle="Services mentioned by leads"
          items={analytics.serviceCounts}
          total={analytics.totalCalls}
        />
        <Distribution
          title="Request Categories"
          subtitle="AI classification by request type"
          items={analytics.categoryCounts}
          total={analytics.totalCalls}
        />
        <Distribution
          title="Lead Geography"
          subtitle="Top visitor countries"
          items={analytics.topCountries}
          total={analytics.totalCalls}
        />
      </div>
    </div>
  )
}

export function LeadsTab({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="emerald"
          icon="check"
          label="Email Dispatched"
          value={analytics.emailSent}
          target={`${analytics.emailFailures} failed`}
          detail={`${analytics.emailFailures} delivery exceptions`}
          tooltip="Summaries successfully delivered to staff"
        />
        <StatCard
          tone="blue"
          icon="comm"
          label="Avg. Messages"
          value={analytics.averageMessages}
          target="5.0 avg"
          detail="conversation depth per record"
          tooltip="Average dialog turns per lead record"
        />
        <StatCard
          tone="amber"
          icon="lead"
          label="Captured Leads"
          value={`${percent(analytics.callsWithLead, analytics.totalCalls)}%`}
          target={`${analytics.callsWithLead} total`}
          detail="records with contact details"
          tooltip="Percentage of conversations with captured contact info"
        />
        <StatCard
          tone="rose"
          icon="waiting"
          label="Overdue Follow-ups"
          value={analytics.overdueFollowUps}
          target={`${analytics.openFollowUps} open`}
          detail={`${analytics.openFollowUps} open follow-up commitments`}
          tooltip="Follow-up tasks requiring urgent manager action"
        />
      </div>
      <LeadDetailPanel call={analytics.selectedCall} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PipelineFunnel items={analytics.statusCounts} total={analytics.totalCalls} />
        <Distribution title="Urgency Levels" subtitle="Operational priority by conversation" items={analytics.urgencyCounts} total={analytics.totalCalls} />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-slate-950 font-sans tracking-tight">Recent Lead Interactions</h3>
          <span className="text-xs font-semibold text-slate-500">
            Page {analytics.pagination.page} of {analytics.pagination.totalPages} ({analytics.pagination.filteredRecords.toLocaleString()} filtered)
          </span>
        </div>
        <CommunicationList calls={analytics.recentCalls} />
        <PaginationControls pagination={analytics.pagination} />
      </div>
    </div>
  )
}

export function CommunicationsTab({
  calls,
  pagination,
}: {
  calls: DashboardCall[]
  pagination?: PaginationMeta
}) {
  return (
    <div className="space-y-5">
      {pagination && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-slate-950 font-sans tracking-tight">
            Call Transcripts &amp; Intelligence
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.filteredRecords.toLocaleString()} records)
          </span>
        </div>
      )}
      <CommunicationList calls={calls} />
      {pagination && <PaginationControls pagination={pagination} />}
    </div>
  )
}

export function AiTab({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#0052ff] border border-blue-200 shadow-xs">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
            </svg>
          </span>
          <h2 className="text-base font-bold text-slate-950 font-sans tracking-tight">AI Assisted Recommendations</h2>
        </div>
        <div className="space-y-3">
          {analytics.aiRecommendations.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/30 to-white px-4 py-3.5 text-xs font-medium leading-relaxed text-slate-800 shadow-[0_1px_3px_rgba(0,82,255,0.06)] flex items-start gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-[#0052ff] mt-1.5 shrink-0 shadow-xs" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
          <h2 className="text-base font-bold text-slate-950 font-sans tracking-tight">Risk Signals</h2>
        </div>
        <div className="space-y-3">
          {analytics.riskSignals.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50/80 via-amber-50/30 to-white px-4 py-3.5 text-xs font-medium leading-relaxed text-slate-800 shadow-[0_1px_3px_rgba(244,63,94,0.06)] flex items-start gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-xs" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>

      <section className="xl:col-span-2">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-950 font-sans tracking-tight">Executive Follow-Up Queue</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0052ff] border border-blue-200/80 shadow-2xs">
            {analytics.followUpQueue.length} priority records
          </span>
        </div>
        <CommunicationList calls={analytics.followUpQueue} />
      </section>
    </div>
  )
}

export function CapabilitiesTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {capabilityCards.map((card) => (
          <Panel key={card.title} className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capability</span>
                <span className="h-2 w-2 rounded-full bg-[#0052ff] shadow-xs" />
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-950 font-sans tracking-tight">{card.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{card.summary}</p>
              <ul className="mt-4 space-y-2">
                {card.points.map((point) => (
                  <li
                    key={point}
                    className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-xs flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {featureCards.map((card, index) => (
          <Panel key={card.title} className="p-6">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-950 font-sans tracking-tight">{card.title}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${softClasses[index % softClasses.length]}`}>
                {card.items.length} items
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {card.items.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50/70 to-white px-3.5 py-2 text-xs font-medium leading-relaxed text-slate-700 shadow-xs"
                >
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0052ff]">Technology Used</span>
            <h2 className="mt-1 text-lg font-bold text-slate-950 font-sans tracking-tight">Application Stack</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">Runtime, AI, data, and delivery tools behind Support Agent.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {technologyGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 p-4 shadow-xs"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{group.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:border-[#0052ff]/40 transition"
                  >
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

function ConfigurationStatus({
  label,
  detail,
  complete,
}: {
  label: string
  detail: string
  complete: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/60 p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:border-slate-300 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-600 font-medium">{detail}</p>
        </div>
        <Badge tone={complete ? 'good' : 'warn'}>
          {complete ? 'Ready' : 'Required'}
        </Badge>
      </div>
    </div>
  )
}

export function PlatformTenantsTab({ tenants }: { tenants: ManagedTenantSummary[] }) {
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length
  const disabledTenants = tenants.filter((tenant) => tenant.status === 'disabled').length
  const missingKeys = tenants.filter((tenant) => !tenant.hasOpenAiKey).length
  const archivedTenants = tenants.filter((tenant) => tenant.status === 'archived').length
  const readyTenants = tenants.filter((tenant) => tenant.hasOpenAiKey).length

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between pb-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0052ff]">Super Admin Control</span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 font-sans">Tenant Control Center</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 font-medium">
              Manage all tenant accounts, create new tenants, review subscription state, and open single tenant configurations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/tenants"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition"
            >
              Manage All Tenants
            </Link>
            <Link
              href="/admin/tenants?tab=create"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] hover:from-[#085bf6] hover:to-[#0039be] transition"
            >
              + Create Tenant
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Tenants" value={tenants.length} detail="Registered tenant accounts" tone="blue" icon="assessed" />
          <StatCard label="Active" value={activeTenants} detail="Currently enabled tenants" tone="emerald" icon="check" />
          <StatCard label="Disabled" value={disabledTenants} detail="Temporarily disabled tenants" tone="amber" icon="waiting" />
          <StatCard label="Missing OpenAI Key" value={missingKeys} detail="Tenants needing API setup" tone="rose" icon="target" />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlossyDonutChart
          title="Tenant Status"
          subtitle="Registered tenant operating distribution"
          total={tenants.length}
          unit="tenants"
          infoTooltip="Distribution of multi-tenant accounts by current system status"
          items={[
            { label: 'Active', value: activeTenants, color: '#10b981' },
            { label: 'Disabled', value: disabledTenants, color: '#f59e0b' },
            { label: 'Archived', value: archivedTenants, color: '#64748b' },
          ]}
        />
        <GlossyBarChart
          title="Tenant Setup Readiness"
          totalLabel={`${tenants.length} tenants`}
          total={tenants.length}
          infoTooltip="Tenants with OpenAI credentials configured compared with tenants still missing a key."
          items={[
            { label: 'OpenAI key configured', value: readyTenants, color: '#0052ff' },
            { label: 'OpenAI key missing', value: missingKeys, color: '#ea580c' },
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 p-5 sm:p-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-sans tracking-tight">Tenant Accounts</h3>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Open one tenant to configure domain, subscription, users, and setup status.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
            {tenants.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5 text-left">Tenant</th>
                <th className="px-5 py-3.5 text-left">Allowed Domains</th>
                <th className="px-5 py-3.5 text-left">Subscription</th>
                <th className="px-5 py-3.5 text-left">OpenAI Key</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No tenants configured yet.</td>
                </tr>
              ) : tenants.map((tenant) => (
                <tr key={tenant.tenantId} className="hover:bg-slate-50/80 transition-colors duration-150">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950 text-xs sm:text-sm font-sans">{tenant.companyName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{tenant.tenantId}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="line-clamp-2 break-words text-xs">
                      {tenant.domains.length ? tenant.domains.join(', ') : 'No domains'}
                    </span>
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
                    <Badge tone={tenant.hasOpenAiKey ? 'good' : 'warn'}>
                      {tenant.hasOpenAiKey ? 'Configured' : 'Missing'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={tenant.status === 'active' ? 'good' : tenant.status === 'disabled' ? 'warn' : 'purple'}>
                      {formatLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/tenants/${tenant.tenantId}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-3.5 text-xs font-bold text-white shadow-[0_2px_4px_rgba(0,82,255,0.25)] hover:from-[#085bf6] hover:to-[#0039be] transition"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

export function TenantConfigurationTab({
  tenantId,
  detail,
}: {
  tenantId?: string | null
  detail: ManagedTenantDetail | null
}) {
  const resolvedTargetId = detail?.tenant?.tenantId || tenantId
  const settingsHref = resolvedTargetId ? `/admin/tenants/${resolvedTargetId}` : '/admin/tenants'

  if (!detail) {
    return (
      <Panel className="p-6">
        <h2 className="text-lg font-bold text-slate-950 font-sans">Tenant Configuration</h2>
        <p className="mt-2 text-xs text-slate-500 font-medium">
          Tenant configuration is not available for this account yet.
        </p>
      </Panel>
    )
  }

  const verifiedDomains = detail.domains.filter((domain) => domain.verificationStatus === 'verified')
  const emailConfig = detail.settings.emailNotifications

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0052ff]">Tenant Configuration</span>
              <span className="rounded-full bg-blue-50 text-[#0052ff] border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">Active Profile</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 font-sans">{detail.tenant.companyName}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 font-medium">
              Configure the agent persona, OpenAI credentials, lead database URL, SMTP alerts, domain verification, and website embed snippet.
            </p>
          </div>
          <Link
            href={settingsHref}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] hover:from-[#085bf6] hover:to-[#0039be] transition"
          >
            Open Configuration →
          </Link>
        </div>

        <div className="mt-6 grid gap-3.5 md:grid-cols-2">
          <ConfigurationStatus
            label="OpenAI Key"
            detail={detail.openAiSecret ? `Stored as ${detail.openAiSecret.maskedValue}.` : 'OpenAI key not configured.'}
            complete={Boolean(detail.openAiSecret)}
          />
          <ConfigurationStatus
            label="Lead Database"
            detail={detail.databaseUrlSecret ? `Stored as ${detail.databaseUrlSecret.maskedValue}.` : 'Optional. Call summaries will skip database saves until a URL is stored.'}
            complete={true}
          />
          <ConfigurationStatus
            label="Verified Domain"
            detail={verifiedDomains.length ? `${verifiedDomains.length} verified domain(s).` : 'Domain verification is pending.'}
            complete={verifiedDomains.length > 0}
          />
          <ConfigurationStatus
            label="SMTP Email"
            detail={emailConfig?.enabled
              ? detail.smtpPasswordSecret
                ? `Enabled as ${detail.smtpPasswordSecret.maskedValue}.`
                : 'SMTP is enabled but password is not stored yet.'
              : 'Optional. Configure SMTP to send call summaries.'}
            complete={!emailConfig?.enabled || Boolean(detail.smtpPasswordSecret)}
          />
        </div>
      </Panel>
    </div>
  )
}
