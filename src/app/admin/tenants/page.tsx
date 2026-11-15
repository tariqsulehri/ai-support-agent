import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getVerifiedSession } from '@/lib/auth/session'
import { generateEmbedToken, listManagedTenants, type ManagedTenantSummary } from '@/lib/tenants/management'
import { listTenantUsageSummaries, type TenantUsageSummary } from '@/lib/observability/usage'
import { Field, SelectField, TextArea } from '@/components/admin/form-fields'
import { StatusBadge } from '@/components/admin/status-badge'
import { GlossyBarChart, GlossyDonutChart } from '@/components/admin/3d-charts'
import {
  ActionForm,
  ActionFormProvider,
  ActionMessage,
  SubmitButton,
  type ButtonVariant,
} from '@/components/admin/action-form'
import { buttonClasses } from '@/components/admin/button-styles'
import { formatLabel } from '@/lib/admin/forms'
import {
  TENANT_BILLING_CYCLES,
  TENANT_SUBSCRIPTION_STATUSES,
  TENANT_SUBSCRIPTION_TYPES,
} from '@/lib/tenants/options'
import { createTenantAction, tenantLifecycleAction, updateSubscriptionAction } from './actions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AdminTenantTab = 'tenants' | 'create' | 'subscriptions' | 'usage' | 'archived'

type TenantsPageProps = {
  searchParams?: Promise<{ tab?: string }>
}

const tabs: Array<{ id: AdminTenantTab; label: string }> = [
  { id: 'tenants', label: 'Tenants' },
  { id: 'create', label: 'Create Tenant' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'usage', label: 'Usage' },
  { id: 'archived', label: 'Archived' },
]

const usageChartLabels: Array<[keyof TenantUsageSummary['counters'], string]> = [
  ['embed_session_created', 'Embed Sessions'],
  ['embed_session_denied', 'Denied Sessions'],
  ['config_request', 'Config'],
  ['chat_request', 'Chat'],
  ['transcription_request', 'Transcription'],
  ['tts_request', 'TTS'],
  ['conversation_completed', 'Completed Calls'],
]
const usageColors = ['#0052ff', '#6e19eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']

function activeTab(value: string | undefined): AdminTenantTab {
  return tabs.some((tab) => tab.id === value) ? (value as AdminTenantTab) : 'tenants'
}

// ── Small presentational primitives ─────────────────────────────────────────

const cardClass =
  'overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)]'
const thClass = 'px-4 py-3 font-semibold'
const tdClass = 'px-4 py-3 align-middle'

function Card({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-gradient-to-r from-blue-50/40 via-white to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-slate-950">{title}</h2>
          {description && <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  )
}

function TenantName({ tenant }: { tenant: ManagedTenantSummary }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-950">{tenant.companyName}</p>
      <p className="mt-0.5 break-all font-mono text-xs text-slate-500">{tenant.tenantId}</p>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">{children}</p>
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-950">{value}</p>
      <div className={`mt-2.5 h-1.5 w-14 rounded-full ${accent}`} />
    </div>
  )
}

/** One status-change button (archive / disable / enable / activate) with pending + inline error. */
function LifecycleButton({
  tenant,
  op,
  label,
  pendingLabel,
  variant,
  confirmMessage,
}: {
  tenant: ManagedTenantSummary
  op: 'archive' | 'disable' | 'enable' | 'activate'
  label: string
  pendingLabel: string
  variant: ButtonVariant
  confirmMessage?: string
}) {
  return (
    <ActionFormProvider action={tenantLifecycleAction}>
      <div className="flex flex-col items-end gap-1">
        <ActionForm>
          <input type="hidden" name="tenantId" value={tenant.tenantId} />
          <input type="hidden" name="op" value={op} />
          <SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel} confirmMessage={confirmMessage}>
            {label}
            <span className="sr-only"> {tenant.companyName}</span>
          </SubmitButton>
        </ActionForm>
        <ActionMessage className="max-w-[16rem] text-left" />
      </div>
    </ActionFormProvider>
  )
}

// ── Tab panels ──────────────────────────────────────────────────────────────

function TenantTable({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <Card title="Registered Tenants" description={`${tenants.length} tenant account${tenants.length === 1 ? '' : 's'} configured.`}>
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Registered tenants</caption>
          <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className={thClass}>Tenant</th>
              <th scope="col" className={thClass}>Domains</th>
              <th scope="col" className={thClass}>Subscription</th>
              <th scope="col" className={thClass}>OpenAI Key</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No tenants yet. <Link href="/admin/tenants?tab=create" className="font-semibold text-[#0052ff] hover:underline">Create one</Link>.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.tenantId} className="transition hover:bg-blue-50/30">
                  <td className={tdClass}><TenantName tenant={tenant} /></td>
                  <td className={`${tdClass} max-w-[16rem] break-words text-xs text-slate-600`}>
                    {tenant.domains.length ? tenant.domains.join(', ') : <span className="text-slate-400">No domains</span>}
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={tenant.subscriptionStatus} />
                      <span className="rounded-full border border-indigo-200/90 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                        {formatLabel(tenant.subscriptionType)}
                      </span>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={tenant.hasOpenAiKey ? 'active' : 'pending'} />
                  </td>
                  <td className={tdClass}><StatusBadge status={tenant.status} /></td>
                  <td className={tdClass}>
                    <div className="flex items-start justify-end gap-2">
                      <Link href={`/admin/tenants/${tenant.tenantId}`} className={buttonClasses('primary', 'sm')}>
                        Manage<span className="sr-only"> {tenant.companyName}</span>
                      </Link>
                      {tenant.status === 'active' ? (
                        <LifecycleButton tenant={tenant} op="disable" label="Disable" pendingLabel="Disabling…" variant="warning" />
                      ) : tenant.status === 'disabled' ? (
                        <LifecycleButton tenant={tenant} op="enable" label="Enable" pendingLabel="Enabling…" variant="success" />
                      ) : null}
                      <LifecycleButton
                        tenant={tenant}
                        op="archive"
                        label="Archive"
                        pendingLabel="Archiving…"
                        variant="secondary"
                        confirmMessage={`Archive ${tenant.companyName}? Its agent will stop serving requests until reactivated.`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CreateTenantPanel({ suggestedEmbedToken }: { suggestedEmbedToken: string }) {
  return (
    <ActionFormProvider action={createTenantAction}>
      <Card
        title="Create Tenant"
        description="Creates the tenant, admin login, allowed domains, subscription, and initial embed token."
        actions={
          <SubmitButton form="create-tenant-form" pendingLabel="Creating…">
            Create Tenant
          </SubmitButton>
        }
      >
        <ActionForm id="create-tenant-form" className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <Field
              label="Tenant ID"
              name="tenantId"
              required
              placeholder="acme-support"
              maxLength={63}
              hint="3-63 characters: lowercase letters, numbers, hyphens."
            />
            <Field label="Company Name" name="companyName" required placeholder="Acme Inc." maxLength={120} />
            <Field label="Agent Name" name="agentName" placeholder="Acme Assistant" maxLength={80} />
            <TextArea label="Allowed Domains (one per line)" name="domains" placeholder={'https://example.com\nhttps://app.example.com'} />
            <TextArea label="Services (one per line)" name="services" placeholder={'Customer Support\nSales Inquiry\nBooking'} />
            <TextArea label="Greeting" name="greeting" rows={3} maxLength={500} placeholder="Hi, I am Acme Assistant. How can I help you today?" />
            <Field label="Tone" name="tone" placeholder="friendly, professional, and helpful" maxLength={200} />
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Subscription" name="subscriptionStatus" options={TENANT_SUBSCRIPTION_STATUSES} defaultValue="trial" />
              <SelectField label="Plan Type" name="subscriptionType" options={TENANT_SUBSCRIPTION_TYPES} defaultValue="free" />
              <SelectField label="Billing Cycle" name="billingCycle" options={TENANT_BILLING_CYCLES} defaultValue="monthly" />
            </div>
            <Field label="Embed Token" name="embedToken" required defaultValue={suggestedEmbedToken} autoComplete="off" />
            <fieldset className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
              <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">Tenant Admin Login (optional)</legend>
              <div className="space-y-3">
                <Field label="Admin Name" name="adminName" placeholder="Tenant Admin" maxLength={120} />
                <Field label="Admin Email" name="adminEmail" type="email" placeholder="admin@example.com" autoComplete="off" />
                <Field
                  label="Admin Password"
                  name="adminPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  hint="At least 8 characters."
                />
              </div>
            </fieldset>
            <ActionMessage />
            <SubmitButton size="lg" pendingLabel="Creating tenant…" className="w-full">
              Create Tenant
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </ActionFormProvider>
  )
}

function SubscriptionsPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <Card
      title="Tenant Subscriptions"
      description="Set subscription status, plan type, billing cycle, seats, and expiry. Clear a field to remove it."
    >
      {tenants.length === 0 ? (
        <EmptyState>No tenants available.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {tenants.map((tenant) => (
            <li key={tenant.tenantId}>
              <ActionFormProvider action={updateSubscriptionAction}>
                <ActionForm className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))_auto] lg:items-end">
                  <input type="hidden" name="tenantId" value={tenant.tenantId} />
                  <div className="sm:col-span-2 lg:col-span-1">
                    <TenantName tenant={tenant} />
                  </div>
                  <SelectField label="Subscription" name="subscriptionStatus" options={TENANT_SUBSCRIPTION_STATUSES} defaultValue={tenant.subscriptionStatus} />
                  <SelectField label="Type" name="subscriptionType" options={TENANT_SUBSCRIPTION_TYPES} defaultValue={tenant.subscriptionType} />
                  <SelectField label="Cycle" name="billingCycle" options={TENANT_BILLING_CYCLES} defaultValue={tenant.billingCycle} />
                  <Field label="Seats" name="seats" type="number" min={1} inputMode="numeric" defaultValue={tenant.seats != null ? String(tenant.seats) : undefined} />
                  <Field label="Expires" name="expiresAt" type="date" defaultValue={tenant.expiresAt ?? undefined} />
                  <SubmitButton pendingLabel="Saving…" className="h-10">
                    Save<span className="sr-only"> subscription for {tenant.companyName}</span>
                  </SubmitButton>
                  <div className="sm:col-span-2 lg:col-span-7 empty:hidden">
                    <ActionMessage />
                  </div>
                </ActionForm>
              </ActionFormProvider>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ArchivedPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <Card title="Archived Tenants" description="Archived tenants are blocked from runtime usage until reactivated.">
      {tenants.length === 0 ? (
        <EmptyState>No archived tenants.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {tenants.map((tenant) => (
            <li
              key={tenant.tenantId}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4"
            >
              <TenantName tenant={tenant} />
              <div className="flex items-start gap-2">
                <Link href={`/admin/tenants/${tenant.tenantId}`} className={buttonClasses('secondary', 'sm')}>
                  View<span className="sr-only"> {tenant.companyName}</span>
                </Link>
                <LifecycleButton tenant={tenant} op="activate" label="Activate" pendingLabel="Activating…" variant="primary" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function UsagePanel({
  tenants,
  usageByTenant,
}: {
  tenants: ManagedTenantSummary[]
  usageByTenant: Map<string, TenantUsageSummary>
}) {
  return (
    <Card title="Tenant Usage Counters" description="Aggregate totals only. Detailed usage events are not stored.">
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
        <table className="w-full min-w-[980px] text-left text-sm">
          <caption className="sr-only">Usage counters per tenant</caption>
          <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className={thClass}>Tenant</th>
              <th scope="col" className={thClass}>Total</th>
              {usageChartLabels.map(([, label]) => (
                <th scope="col" key={label} className={thClass}>{label}</th>
              ))}
              <th scope="col" className={thClass}>Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={usageChartLabels.length + 3} className="px-4 py-8 text-center text-slate-500">
                  No tenants available.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => {
                const usage = usageByTenant.get(tenant.tenantId)
                return (
                  <tr key={tenant.tenantId} className="transition hover:bg-blue-50/30">
                    <td className={tdClass}><TenantName tenant={tenant} /></td>
                    <td className={`${tdClass} font-semibold tabular-nums text-slate-950`}>{usage?.total ?? 0}</td>
                    {usageChartLabels.map(([key, label]) => (
                      <td key={label} className={`${tdClass} tabular-nums text-slate-700`}>
                        {usage?.counters?.[key] ?? 0}
                      </td>
                    ))}
                    <td className={`${tdClass} text-xs text-slate-500`}>
                      {usage?.lastEventAt
                        ? usage.lastEventAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
                        : 'No usage'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AdminTenantsPage({ searchParams }: TenantsPageProps) {
  // Session check runs in parallel with data loads; data is only rendered
  // after the platform-admin check passes.
  const [session, params, tenants, usageSummaries] = await Promise.all([
    getVerifiedSession(),
    searchParams,
    listManagedTenants().catch((error: unknown) => (error instanceof Error ? error : new Error(String(error)))),
    listTenantUsageSummaries().catch(() => [] as TenantUsageSummary[]),
  ])
  if (!session) redirect(`/admin/login?next=${encodeURIComponent('/admin/tenants')}`)
  if (session.role !== 'platform_admin') redirect('/dashboard')
  if (tenants instanceof Error) throw tenants

  const selectedTab = activeTab(params?.tab)
  const activeTenants = tenants.filter((tenant) => tenant.status !== 'archived')
  const archivedTenants = tenants.filter((tenant) => tenant.status === 'archived')
  const usageByTenant = new Map(usageSummaries.map((summary) => [summary.tenantId, summary]))
  const aggregateUsage = usageChartLabels.map(([key, label], index) => ({
    label,
    value: usageSummaries.reduce((sum, summary) => sum + (summary.counters[key] ?? 0), 0),
    color: usageColors[index],
  }))

  return (
    <main className="min-h-dvh bg-[#f6f8fb] px-4 py-6 text-slate-950 sm:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0052ff]">Platform Admin</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Tenant Management</h1>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Control tenant access, runtime readiness, subscriptions, and deployment settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/dashboard" className={buttonClasses('secondary', 'md')}>
                Dashboard
              </Link>
              <form action="/api/admin/auth/logout" method="post">
                <input type="hidden" name="next" value="/admin/login" />
                <button type="submit" className={buttonClasses('primary', 'md')}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid gap-3.5 sm:grid-cols-3" aria-label="Tenant totals">
          <StatCard label="Active tenants" value={activeTenants.length} accent="bg-emerald-500" />
          <StatCard label="Archived" value={archivedTenants.length} accent="bg-slate-400" />
          <StatCard
            label="OpenAI ready"
            value={activeTenants.filter((tenant) => tenant.hasOpenAiKey).length}
            accent="bg-[#0052ff]"
          />
        </section>

        {(selectedTab === 'tenants' || selectedTab === 'usage') && (
          <section className="grid gap-4 xl:grid-cols-2" aria-label="Platform metrics">
            <GlossyDonutChart
              title="Tenant Status"
              infoTooltip="Registered tenant accounts grouped by active, disabled, and archived status."
              total={tenants.length}
              items={[
                { label: 'Active', value: tenants.filter((tenant) => tenant.status === 'active').length, color: '#10b981' },
                { label: 'Disabled', value: tenants.filter((tenant) => tenant.status === 'disabled').length, color: '#f59e0b' },
                { label: 'Archived', value: archivedTenants.length, color: '#64748b' },
              ]}
            />
            <GlossyBarChart
              title="Platform Usage"
              totalLabel={`${usageSummaries.length} tenant${usageSummaries.length === 1 ? '' : 's'} with usage`}
              infoTooltip="Aggregated usage counters across registered tenants."
              items={aggregateUsage}
            />
          </section>
        )}

        <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm" aria-label="Tenant admin sections">
          {tabs.map((tab) => {
            const selected = selectedTab === tab.id
            return (
              <Link
                key={tab.id}
                href={`/admin/tenants?tab=${tab.id}`}
                aria-current={selected ? 'page' : undefined}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-[#0052ff]/20 ${
                  selected
                    ? 'bg-[#0052ff] text-white shadow-[0_3px_10px_rgba(0,82,255,0.30)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {selectedTab === 'tenants' && <TenantTable tenants={activeTenants} />}
        {/* Only mint a new embed token when the create form is actually shown. */}
        {selectedTab === 'create' && <CreateTenantPanel suggestedEmbedToken={generateEmbedToken()} />}
        {selectedTab === 'subscriptions' && <SubscriptionsPanel tenants={activeTenants} />}
        {selectedTab === 'usage' && <UsagePanel tenants={activeTenants} usageByTenant={usageByTenant} />}
        {selectedTab === 'archived' && <ArchivedPanel tenants={archivedTenants} />}
      </div>
    </main>
  )
}
