import Link from 'next/link'
import { AdminPanel as Panel } from '@/components/admin/panel'
import { StatusBadge } from '@/components/admin/status-badge'
import { buttonClasses } from '@/components/admin/button-styles'
import { formatLabel } from '@/lib/admin/forms'
import { CopyButton } from './copy-button'
import { TabLink } from './tab-state'
import { InfoList, InfoRow, formatDate } from './ui'
import { readiness, type TabKey, type TenantDetailData } from './types'

type Requirement = { id: string; label: string; description: string; complete: boolean; tab: TabKey }

function requirements(data: TenantDetailData): Requirement[] {
  const { verifiedCount, subscriptionReady } = readiness(data)
  const domainCount = data.domains.length
  return [
    {
      id: 'domain_added',
      label: 'Domain Assigned',
      description: domainCount ? `${domainCount} domain(s) configured` : 'Add an allowed website domain',
      complete: domainCount > 0,
      tab: 'embed',
    },
    {
      id: 'domain_verified',
      label: 'Domain Ownership Verified',
      description: verifiedCount ? `${verifiedCount} domain(s) verified` : 'Verify via meta tag or well-known file',
      complete: verifiedCount > 0,
      tab: 'embed',
    },
    {
      id: 'openai_key',
      label: 'OpenAI API Key',
      description: data.openAiSecret ? `Stored (${data.openAiSecret.maskedValue})` : 'Required to power voice & chat',
      complete: Boolean(data.openAiSecret),
      tab: 'integrations',
    },
    {
      id: 'subscription',
      label: 'Subscription Plan',
      description: `Status: ${formatLabel(data.tenant.subscriptionStatus)}`,
      complete: subscriptionReady,
      tab: 'overview',
    },
    {
      id: 'lead_database',
      label: 'Lead Database (Optional)',
      description: data.databaseUrlSecret
        ? `Dedicated database (${data.databaseUrlSecret.maskedValue})`
        : 'Using platform database',
      complete: true,
      tab: 'integrations',
    },
    {
      id: 'smtp_email',
      label: 'SMTP Notifications (Optional)',
      description: data.email?.enabled
        ? data.smtpPasswordSecret
          ? 'Lead email alerts enabled'
          : 'Enabled, but SMTP password is missing'
        : 'Not configured (optional)',
      complete: !data.email?.enabled || Boolean(data.smtpPasswordSecret),
      tab: 'integrations',
    },
  ]
}

export function OverviewTab({ data, isPlatformAdmin }: { data: TenantDetailData; isPlatformAdmin: boolean }) {
  const items = requirements(data)
  const { verifiedCount } = readiness(data)
  const completed = items.filter((r) => r.complete).length
  const percent = Math.round((completed / items.length) * 100)
  const { tenant } = data

  return (
    <>
      <section
        aria-labelledby="setup-checklist-heading"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="setup-checklist-heading" className="text-sm font-bold tracking-tight text-slate-900">
                Tenant Setup Checklist
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Core requirements needed for live customer deployment.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#0052ff]">
              {completed} of {items.length} ready ({percent}%)
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Setup completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80"
          >
            <div
              className={`h-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-[#0052ff]'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <ul className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col justify-between bg-white p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.complete ? '✓' : '!'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className={`text-xs font-semibold ${item.complete ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {item.complete ? 'Configured' : 'Needs attention'}
                </span>
                {item.tab !== 'overview' && (
                  <TabLink tab={item.tab} className="rounded text-xs font-semibold text-[#0052ff] hover:text-[#0043d9]">
                    Configure <span aria-hidden="true">→</span>
                    <span className="sr-only"> {item.label}</span>
                  </TabLink>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Panel title="Runtime Status & Plan">
          <InfoList>
            <InfoRow label="Lifecycle Status">
              <StatusBadge status={tenant.status} />
            </InfoRow>
            <InfoRow label="Subscription Tier">{formatLabel(tenant.subscriptionType)}</InfoRow>
            <InfoRow label="Billing Cycle">{formatLabel(tenant.billingCycle)}</InfoRow>
            <InfoRow label="Allowed Domains">
              {data.domains.length} total ({verifiedCount} verified)
            </InfoRow>
            <InfoRow label="Lead Database">{data.databaseUrlSecret ? 'Dedicated MongoDB' : 'Platform shared DB'}</InfoRow>
          </InfoList>

          {isPlatformAdmin && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <Link href="/admin/tenants?tab=subscriptions" className={buttonClasses('secondary', 'sm')}>
                Manage Subscriptions <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </Panel>

        <Panel title="Tenant Identity">
          <InfoList>
            <InfoRow label="Tenant Slug">
              <span className="font-mono">{tenant.slug}</span>
            </InfoRow>
            <InfoRow label="Public Identifier">
              <span className="font-mono">{tenant.publicId}</span>
            </InfoRow>
            <InfoRow label="Tenant ID">
              <span className="inline-flex flex-wrap items-center justify-end gap-2 font-mono">
                {tenant.tenantId}
                <CopyButton value={tenant.tenantId} variant="link" ariaLabel="Copy tenant ID" />
              </span>
            </InfoRow>
            <InfoRow label="Created">{formatDate(tenant.createdAt)}</InfoRow>
            <InfoRow label="Team Members">{data.users.length} active</InfoRow>
          </InfoList>
        </Panel>
      </div>
    </>
  )
}
