import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import type { DashboardAnalytics, DashboardCall } from '@/lib/dashboard/analytics'
import type { ManagedTenantDetail, ManagedTenantSummary } from '@/lib/tenants/management'
import {
  barClasses,
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
  LeadDetailPanel,
  LeadIdentity,
  Panel,
  PipelineFunnel,
  ProgressRing,
  StatCard,
  TranscriptPreview,
  formatDate,
  percent,
  toneForQuality,
} from './components'

export function OverviewTab({ analytics }: { analytics: DashboardAnalytics }) {
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

export function LeadsTab({ analytics }: { analytics: DashboardAnalytics }) {
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

export function CommunicationsTab({ calls }: { calls: DashboardCall[] }) {
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

export function AiTab({ analytics }: { analytics: DashboardAnalytics }) {
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

export function CapabilitiesTab() {
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
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="mt-1 break-words text-sm leading-5 text-slate-500">{detail}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
          complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
        }`}>
          {complete ? 'Ready' : 'Required'}
        </span>
      </div>
    </div>
  )
}

export function PlatformTenantsTab({ tenants }: { tenants: ManagedTenantSummary[] }) {
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length
  const disabledTenants = tenants.filter((tenant) => tenant.status === 'disabled').length
  const missingKeys = tenants.filter((tenant) => !tenant.hasOpenAiKey).length

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Super Admin</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Tenant Control Center</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage all tenant accounts, create new tenants, review subscription state, and open a single tenant configuration from one dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/tenants"
              className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
            >
              Manage All Tenants
            </Link>
            <Link
              href="/admin/tenants?tab=create"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create Tenant
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <StatCard label="Total Tenants" value={tenants.length} detail="Registered tenant accounts" tone="cyan" />
          <StatCard label="Active" value={activeTenants} detail="Currently enabled tenants" tone="emerald" />
          <StatCard label="Disabled" value={disabledTenants} detail="Temporarily disabled tenants" tone="amber" />
          <StatCard label="Missing OpenAI Key" value={missingKeys} detail="Tenants needing API setup" tone="rose" />
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Tenant Accounts</h3>
          <p className="mt-1 text-sm text-slate-500">Open one tenant to configure domain, subscription, users, and setup status.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">Domains</th>
                <th className="px-5 py-3">Subscription</th>
                <th className="px-5 py-3">OpenAI Key</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No tenants configured yet.</td>
                </tr>
              ) : tenants.map((tenant) => (
                <tr key={tenant.tenantId}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{tenant.companyName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="line-clamp-2 break-words">
                      {tenant.domains.length ? tenant.domains.join(', ') : 'No domains'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={tenant.subscriptionStatus === 'active' || tenant.subscriptionStatus === 'trial' ? 'good' : 'warn'}>
                        {formatLabel(tenant.subscriptionStatus)}
                      </Badge>
                      <Badge>{formatLabel(tenant.subscriptionType)}</Badge>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={tenant.hasOpenAiKey ? 'good' : 'warn'}>
                      {tenant.hasOpenAiKey ? 'Configured' : 'Missing'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={tenant.status === 'active' ? 'good' : tenant.status === 'disabled' ? 'warn' : 'neutral'}>
                      {formatLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/tenants/${tenant.tenantId}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Manage Tenant
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
  tenantId: string
  detail: ManagedTenantDetail | null
}) {
  const settingsHref = `/admin/tenants/${tenantId}`

  if (!detail) {
    return (
      <Panel className="p-5">
        <h2 className="text-xl font-semibold text-slate-950">Tenant Configuration</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tenant configuration is not available for this account yet.
        </p>
      </Panel>
    )
  }

  const verifiedDomains = detail.domains.filter((domain) => domain.verificationStatus === 'verified')
  const emailConfig = detail.settings.emailNotifications

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Tenant Configuration</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{detail.tenant.companyName}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Configure the agent profile, OpenAI key, tenant database URL, SMTP, domain verification, and embed setup from one dashboard entry point.
            </p>
          </div>
          <Link
            href={settingsHref}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
          >
            Open Configuration
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
