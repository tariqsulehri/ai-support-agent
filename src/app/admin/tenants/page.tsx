import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getVerifiedSession } from '@/lib/auth/session'
import {
  activateManagedTenant,
  archiveManagedTenant,
  createManagedTenant,
  disableManagedTenant,
  enableManagedTenant,
  generateEmbedToken,
  listManagedTenants,
  parseDomains,
  parseLines,
  updateManagedTenantSubscription,
  type ManagedTenantSummary,
} from '@/lib/tenants/management'
import { recordAuditLog } from '@/lib/observability/audit'
import { listTenantUsageSummaries, type TenantUsageSummary } from '@/lib/observability/usage'
import { Field, SelectField, TextArea } from '@/components/admin/form-fields'
import { StatusBadge } from '@/components/admin/status-badge'
import { formText as text, formatLabel, safeErrorMessage as safeMessage } from '@/lib/admin/forms'
import {
  TENANT_BILLING_CYCLES,
  TENANT_SUBSCRIPTION_STATUSES,
  TENANT_SUBSCRIPTION_TYPES,
} from '@/lib/tenants/options'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AdminTenantTab = 'tenants' | 'create' | 'subscriptions' | 'usage' | 'archived'

type TenantsPageProps = {
  searchParams?: Promise<{ error?: string; saved?: string; tab?: string }>
}

const tabs: Array<{ id: AdminTenantTab; label: string }> = [
  { id: 'tenants', label: 'Tenants' },
  { id: 'create', label: 'Create Tenant' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'usage', label: 'Usage' },
  { id: 'archived', label: 'Archived' },
]

function activeTab(value: string | undefined): AdminTenantTab {
  return tabs.some((tab) => tab.id === value) ? value as AdminTenantTab : 'tenants'
}

async function requirePlatformAdmin(next = '/admin/tenants') {
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(next)}`)
  if (session.role !== 'platform_admin') redirect('/dashboard')
  return session
}

async function createTenantAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants?tab=create')
  const tenantId = text(formData, 'tenantId')
  const domains = parseDomains(text(formData, 'domains'))
  const subscriptionStatus = text(formData, 'subscriptionStatus')
  const subscriptionType = text(formData, 'subscriptionType')
  const billingCycle = text(formData, 'billingCycle')

  try {
    await createManagedTenant({
      tenantId,
      companyName: text(formData, 'companyName'),
      agentName: text(formData, 'agentName'),
      greeting: text(formData, 'greeting'),
      tone: text(formData, 'tone'),
      services: parseLines(text(formData, 'services')),
      domains,
      embedToken: text(formData, 'embedToken'),
      adminEmail: text(formData, 'adminEmail'),
      adminPassword: text(formData, 'adminPassword'),
      adminName: text(formData, 'adminName'),
      subscriptionStatus,
      subscriptionType,
      billingCycle,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.created',
      actor: session,
      metadata: {
        companyName: text(formData, 'companyName'),
        domainCount: domains.length,
        subscriptionStatus,
        subscriptionType,
        billingCycle,
        adminEmail: text(formData, 'adminEmail') || undefined,
      },
    })
  } catch (error) {
    redirect(`/admin/tenants?tab=create&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect(`/admin/tenants/${tenantId}?created=1`)
}

async function archiveTenantAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants')
  const tenantId = text(formData, 'tenantId')

  try {
    await archiveManagedTenant(tenantId)
    await recordAuditLog({ tenantId, action: 'tenant.archived', actor: session })
  } catch (error) {
    redirect(`/admin/tenants?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants?tab=archived&saved=archived')
}

async function disableTenantAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants')
  const tenantId = text(formData, 'tenantId')

  try {
    await disableManagedTenant(tenantId)
    await recordAuditLog({ tenantId, action: 'tenant.disabled', actor: session })
  } catch (error) {
    redirect(`/admin/tenants?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants?saved=disabled')
}

async function enableTenantAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants')
  const tenantId = text(formData, 'tenantId')

  try {
    await enableManagedTenant(tenantId)
    await recordAuditLog({ tenantId, action: 'tenant.enabled', actor: session })
  } catch (error) {
    redirect(`/admin/tenants?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants?saved=enabled')
}

async function activateTenantAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants?tab=archived')
  const tenantId = text(formData, 'tenantId')

  try {
    await activateManagedTenant(tenantId)
    await recordAuditLog({ tenantId, action: 'tenant.activated', actor: session })
  } catch (error) {
    redirect(`/admin/tenants?tab=archived&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants?tab=tenants&saved=activated')
}

async function updateSubscriptionAction(formData: FormData) {
  'use server'

  const session = await requirePlatformAdmin('/admin/tenants?tab=subscriptions')
  const tenantId = text(formData, 'tenantId')
  const status = text(formData, 'subscriptionStatus')
  const type = text(formData, 'subscriptionType')
  const billingCycle = text(formData, 'billingCycle')
  const seats = text(formData, 'seats')
  const expiresAt = text(formData, 'expiresAt')

  try {
    await updateManagedTenantSubscription({
      tenantId,
      status,
      type,
      billingCycle,
      seats,
      expiresAt,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.subscription_updated',
      actor: session,
      metadata: { status, type, billingCycle, seats, expiresAt },
    })
  } catch (error) {
    redirect(`/admin/tenants?tab=subscriptions&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath('/admin/tenants')
  redirect('/admin/tenants?tab=subscriptions&saved=subscription')
}

function TenantTable({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
      <div className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Registered Tenants</h2>
        <p className="mt-1 text-sm text-slate-500">{tenants.length} tenant accounts configured.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200/80">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Domains</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">OpenAI Key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No tenants yet.</td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.tenantId} className="transition hover:bg-cyan-50/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{tenant.companyName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tenant.domains.length ? tenant.domains.join(', ') : 'No domains'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={tenant.subscriptionStatus} />
                      <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                        {formatLabel(tenant.subscriptionType)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tenant.hasOpenAiKey ? 'active' : 'pending'} />
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/tenants/${tenant.tenantId}`} className="rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700">
                        Manage
                      </Link>
                      {tenant.status === 'active' ? (
                        <form action={disableTenantAction}>
                          <input type="hidden" name="tenantId" value={tenant.tenantId} />
                          <button className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                            Disable
                          </button>
                        </form>
                      ) : tenant.status === 'disabled' ? (
                        <form action={enableTenantAction}>
                          <input type="hidden" name="tenantId" value={tenant.tenantId} />
                          <button className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                            Enable
                          </button>
                        </form>
                      ) : null}
                      {tenant.status !== 'archived' && (
                        <form action={archiveTenantAction}>
                          <input type="hidden" name="tenantId" value={tenant.tenantId} />
                          <button className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Archive
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  )
}

function CreateTenantPanel({ suggestedEmbedToken }: { suggestedEmbedToken: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
      <div className="p-5">
      <h2 className="text-lg font-semibold">Create Tenant</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Creates the tenant, admin login, allowed domains, subscription, and initial embed token. Tenant secrets are added by tenant admins.
      </p>
      <form action={createTenantAction} className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <Field label="Tenant ID" name="tenantId" required placeholder="acme-support" />
          <Field label="Company Name" name="companyName" required placeholder="Acme Inc." />
          <Field label="Agent Name" name="agentName" placeholder="Acme Assistant" />
          <TextArea label="Allowed Domains" name="domains" placeholder="https://example.com&#10;https://app.example.com" />
          <TextArea label="Services" name="services" placeholder="Customer Support&#10;Sales Inquiry&#10;Booking" />
          <TextArea label="Greeting" name="greeting" rows={3} placeholder="Hi, I am Acme Assistant. How can I help you today?" />
          <Field label="Tone" name="tone" placeholder="friendly, professional, and helpful" />
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Subscription" name="subscriptionStatus" options={TENANT_SUBSCRIPTION_STATUSES} defaultValue="trial" />
            <SelectField label="Plan Type" name="subscriptionType" options={TENANT_SUBSCRIPTION_TYPES} defaultValue="free" />
            <SelectField label="Billing Cycle" name="billingCycle" options={TENANT_BILLING_CYCLES} defaultValue="monthly" />
          </div>
          <Field label="Embed Token" name="embedToken" required defaultValue={suggestedEmbedToken} autoComplete="off" />
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Tenant Admin Login</p>
            <div className="space-y-4">
              <Field label="Admin Name" name="adminName" placeholder="Tenant Admin" />
              <Field label="Admin Email" name="adminEmail" type="email" placeholder="admin@example.com" autoComplete="off" />
              <Field label="Admin Password" name="adminPassword" type="password" placeholder="Minimum 4 chars in development" autoComplete="new-password" />
            </div>
          </div>
          <button className="h-11 w-full rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
            Create Tenant
          </button>
        </div>
      </form>
      </div>
    </section>
  )
}

function SubscriptionsPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
      <div className="p-5">
      <h2 className="text-lg font-semibold">Tenant Subscriptions</h2>
      <p className="mt-1 text-sm text-slate-500">Set subscription status, plan type, billing cycle, seats, and expiry.</p>
      <div className="mt-5 space-y-3">
        {tenants.length === 0 ? (
          <p className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">No tenants available.</p>
        ) : (
          tenants.map((tenant) => (
            <form key={tenant.tenantId} action={updateSubscriptionAction} className="grid gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 lg:grid-cols-[1.2fr_repeat(5,1fr)_auto] lg:items-end">
              <input type="hidden" name="tenantId" value={tenant.tenantId} />
              <div>
                <p className="font-semibold text-slate-950">{tenant.companyName}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</p>
              </div>
              <SelectField label="Subscription" name="subscriptionStatus" options={TENANT_SUBSCRIPTION_STATUSES} defaultValue={tenant.subscriptionStatus} />
              <SelectField label="Type" name="subscriptionType" options={TENANT_SUBSCRIPTION_TYPES} defaultValue={tenant.subscriptionType} />
              <SelectField label="Cycle" name="billingCycle" options={TENANT_BILLING_CYCLES} defaultValue={tenant.billingCycle} />
              <Field label="Seats" name="seats" type="number" placeholder="1" />
              <Field label="Expires" name="expiresAt" type="date" />
              <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                Save
              </button>
            </form>
          ))
        )}
      </div>
      </div>
    </section>
  )
}

function ArchivedPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#64748b,#0891b2,#10b981)]" />
      <div className="p-5">
      <h2 className="text-lg font-semibold">Archived Tenants</h2>
      <p className="mt-1 text-sm text-slate-500">Archived tenants are blocked from runtime usage until activated again.</p>
      <div className="mt-5 space-y-3">
        {tenants.length === 0 ? (
          <p className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">No archived tenants.</p>
        ) : (
          tenants.map((tenant) => (
            <div key={tenant.tenantId} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4">
              <div>
                <p className="font-semibold text-slate-950">{tenant.companyName}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/tenants/${tenant.tenantId}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  View
                </Link>
                <form action={activateTenantAction}>
                  <input type="hidden" name="tenantId" value={tenant.tenantId} />
                  <button className="rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700">
                    Activate
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </section>
  )
}

function UsagePanel({
  tenants,
  usageByTenant,
}: {
  tenants: ManagedTenantSummary[]
  usageByTenant: Map<string, TenantUsageSummary>
}) {
  const labels: Array<[keyof TenantUsageSummary['counters'], string]> = [
    ['embed_session_created', 'Embed Sessions'],
    ['embed_session_denied', 'Denied Sessions'],
    ['config_request', 'Config'],
    ['chat_request', 'Chat'],
    ['transcription_request', 'Transcription'],
    ['tts_request', 'TTS'],
    ['conversation_completed', 'Completed Calls'],
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
      <div className="p-5">
      <h2 className="text-lg font-semibold">Tenant Usage Counters</h2>
      <p className="mt-1 text-sm text-slate-500">
        Aggregate totals only. Detailed usage event inserts are not stored.
      </p>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200/80">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Total</th>
              {labels.map(([, label]) => (
                <th key={label} className="px-4 py-3">{label}</th>
              ))}
              <th className="px-4 py-3">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={labels.length + 3} className="px-4 py-8 text-center text-slate-500">No tenants available.</td>
              </tr>
            ) : tenants.map((tenant) => {
              const usage = usageByTenant.get(tenant.tenantId)
              return (
                <tr key={tenant.tenantId} className="transition hover:bg-cyan-50/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{tenant.companyName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{tenant.tenantId}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{usage?.total ?? 0}</td>
                  {labels.map(([key, label]) => (
                    <td key={label} className="px-4 py-3 text-slate-700">{usage?.counters?.[key] ?? 0}</td>
                  ))}
                  <td className="px-4 py-3 text-slate-500">
                    {usage?.lastEventAt ? usage.lastEventAt.toLocaleString() : 'No usage'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  )
}

export default async function AdminTenantsPage({ searchParams }: TenantsPageProps) {
  await requirePlatformAdmin('/admin/tenants')

  const [params, tenants, usageSummaries] = await Promise.all([
    searchParams,
    listManagedTenants(),
    listTenantUsageSummaries(),
  ])
  const selectedTab = activeTab(params?.tab)
  const suggestedEmbedToken = generateEmbedToken()
  const activeTenants = tenants.filter((tenant) => tenant.status !== 'archived')
  const archivedTenants = tenants.filter((tenant) => tenant.status === 'archived')
  const usageByTenant = new Map(usageSummaries.map((summary) => [summary.tenantId, summary]))

  return (
    <main className="min-h-dvh bg-[#f6f8fb] px-4 py-8 text-slate-950">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-5 overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5">
          <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Platform Admin</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950">Tenant Management</h1>
              <p className="mt-2 text-sm text-slate-500">Control tenant access, runtime readiness, subscriptions, and deployment settings.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                Dashboard
              </Link>
              <form action="/api/admin/auth/logout" method="post">
                <input type="hidden" name="next" value="/admin/login" />
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active tenants</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{activeTenants.length}</p>
          </div>
          <div className="rounded-lg border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archived</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{archivedTenants.length}</p>
          </div>
          <div className="rounded-lg border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OpenAI ready</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{activeTenants.filter((tenant) => tenant.hasOpenAiKey).length}</p>
          </div>
        </section>

        <nav className="mb-5 flex flex-wrap gap-2 rounded-lg border border-white/80 bg-white/90 p-2 shadow-sm ring-1 ring-slate-900/5" aria-label="Tenant admin tabs">
          {tabs.map((tab) => {
            const selected = selectedTab === tab.id
            return (
              <Link
                key={tab.id}
                href={`/admin/tenants?tab=${tab.id}`}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${selected ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-800'}`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {params?.error && (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {params.error}
          </div>
        )}
        {params?.saved && (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Saved {params.saved}.
          </div>
        )}

        {selectedTab === 'tenants' && <TenantTable tenants={activeTenants} />}
        {selectedTab === 'create' && <CreateTenantPanel suggestedEmbedToken={suggestedEmbedToken} />}
        {selectedTab === 'subscriptions' && <SubscriptionsPanel tenants={activeTenants} />}
        {selectedTab === 'usage' && <UsagePanel tenants={activeTenants} usageByTenant={usageByTenant} />}
        {selectedTab === 'archived' && <ArchivedPanel tenants={archivedTenants} />}
      </div>
    </main>
  )
}
