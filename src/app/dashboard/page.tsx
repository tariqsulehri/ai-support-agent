import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDashboardAnalytics, type DashboardFilters } from '@/lib/dashboard/analytics'
import { dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'
import { getManagedTenantDetail, listManagedTenants } from '@/lib/tenants/management'
import { FilterBar, formatDate } from './components'
import {
  baseTabs,
  platformTenantTab,
  tenantConfigurationTab,
  type DashboardTabId,
} from './constants'
import {
  AiTab,
  CapabilitiesTab,
  CommunicationsTab,
  LeadsTab,
  OverviewTab,
  PlatformTenantsTab,
  TenantConfigurationTab,
} from './tabs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DashboardPageProps = {
  searchParams?: Promise<DashboardFilters & { tab?: string }>
}

function dashboardTabHref(tab: string, filters: DashboardFilters): string {
  const params = new URLSearchParams()
  params.set('tab', tab)
  for (const key of ['q', 'status', 'quality', 'urgency', 'range', 'selectedId'] as const) {
    const value = filters[key]
    if (value && value !== 'all') params.set(key, value)
  }
  return `/dashboard?${params.toString()}`
}

function dashboardExportHref(filters: DashboardFilters): string {
  const params = new URLSearchParams()
  for (const key of ['q', 'status', 'quality', 'urgency', 'range'] as const) {
    const value = filters[key]
    if (value && value !== 'all') params.set(key, value)
  }
  const query = params.toString()
  return query ? `/dashboard/export?${query}` : '/dashboard/export'
}

function resolveActiveTab(
  requestedTab: string | undefined,
  tabs: ReadonlyArray<{ id: DashboardTabId; label: string }>
): DashboardTabId {
  return tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab as DashboardTabId
    : 'overview'
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getVerifiedSession()
  if (!session) redirect('/tenant/login?next=/dashboard')

  const resolvedSearchParams = await searchParams
  const tabs = session.role === 'platform_admin'
    ? [...baseTabs, platformTenantTab]
    : [...baseTabs, tenantConfigurationTab]
  const activeTab = resolveActiveTab(resolvedSearchParams?.tab, tabs)
  const filters: DashboardFilters = {
    q: resolvedSearchParams?.q,
    status: resolvedSearchParams?.status,
    quality: resolvedSearchParams?.quality,
    urgency: resolvedSearchParams?.urgency,
    range: resolvedSearchParams?.range ?? '30',
    selectedId: resolvedSearchParams?.selectedId,
  }
  const [analytics, tenantDetail, platformTenants] = await Promise.all([
    getDashboardAnalytics(filters, {
      scope: dashboardScopeForSession(session),
    }),
    session.role !== 'platform_admin' && session.tenantId
      ? getManagedTenantDetail(session.tenantId)
      : Promise.resolve(null),
    session.role === 'platform_admin'
      ? listManagedTenants()
      : Promise.resolve([]),
  ])

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
                  Review communication quality, lead status, email delivery, and decision signals from active and finalized voice-agent conversations.
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-100 shadow-inner">
                <p>Updated {formatDate(analytics.generatedAt)}</p>
                {session.role === 'platform_admin' && (
                  <Link href={dashboardTabHref('tenants', filters)} className="mt-2 block text-xs font-semibold text-cyan-100 hover:text-white">
                    Tenant Control Center
                  </Link>
                )}
                {session.role !== 'platform_admin' && (
                  <Link href={dashboardTabHref('configuration', filters)} className="mt-2 block text-xs font-semibold text-cyan-100 hover:text-white">
                    Configuration
                  </Link>
                )}
                <form action="/api/admin/auth/logout" method="post" className="mt-2">
                  <input type="hidden" name="next" value={session.role === 'platform_admin' ? '/admin/login' : '/tenant/login'} />
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
            Conversation storage is not available for this view yet. Tenant dashboards require the tenant MongoDB URL, while platform fallback uses MONGODB_URI, MONGODB_DB_NAME, and MONGODB_CALLS_COLLECTION.
          </section>
        )}

        <nav className="mb-6 flex flex-wrap gap-2 rounded-lg border border-white/75 bg-white/80 p-2 shadow-[0_10px_35px_rgba(15,23,42,0.08)] backdrop-blur" aria-label="Dashboard tabs">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <Link
                key={tab.id}
                href={dashboardTabHref(tab.id, filters)}
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

        <FilterBar filters={filters} activeTab={activeTab} exportHref={dashboardExportHref(filters)} />

        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'communications' && <CommunicationsTab calls={analytics.recentCalls} />}
        {activeTab === 'leads' && <LeadsTab analytics={analytics} />}
        {activeTab === 'ai' && <AiTab analytics={analytics} />}
        {activeTab === 'capabilities' && <CapabilitiesTab />}
        {activeTab === 'tenants' && session.role === 'platform_admin' && (
          <PlatformTenantsTab tenants={platformTenants} />
        )}
        {activeTab === 'configuration' && session.tenantId && (
          <TenantConfigurationTab tenantId={session.tenantId} detail={tenantDetail} />
        )}
      </div>
    </main>
  )
}
