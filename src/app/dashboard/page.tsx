import { redirect } from 'next/navigation'
import { getDashboardAnalytics } from '@/lib/dashboard/analytics'
import type { DashboardFilters, DashboardSections } from '@/lib/dashboard/types'
import { canMutateDashboard, dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'
import { getManagedTenantDetail, listManagedTenants } from '@/lib/tenants/management'
import { FilterBar, WelcomeSummary } from './components'
import { baseTabs, platformTenantTab, tenantConfigurationTab, type DashboardTabId, type TabDefinition } from './constants'
import {
  AiTab,
  CapabilitiesTab,
  CommunicationsTab,
  LeadsTab,
  OverviewTab,
  PlatformTenantsTab,
  TenantConfigurationTab,
} from './tabs'
import { DashboardShell, buildNavItems } from './_components/shell'
import { Icon } from './_components/icons'
import { LocalTime } from './client-controls'
import { CARD_SHADOW } from '@/components/admin/surface'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SearchParams = DashboardFilters & { tab?: string }

const FILTER_KEYS = ['q', 'status', 'quality', 'urgency', 'range', 'sort', 'limit'] as const

/**
 * Data each tab actually renders. Tabs that do not show conversation data skip the
 * heavy queries entirely; follow-up counts are cheap and power the header alert badge.
 */
const TAB_SECTIONS: Record<DashboardTabId, DashboardSections> = {
  overview: { list: false, aggregates: true, followUps: true, followUpQueue: false, selected: false },
  communications: { list: true, aggregates: false, followUps: true, followUpQueue: false, selected: false },
  leads: { list: true, aggregates: true, followUps: true, followUpQueue: false, selected: true },
  ai: { list: false, aggregates: true, followUps: true, followUpQueue: true, selected: false },
  capabilities: { list: false, aggregates: false, followUps: true, followUpQueue: false, selected: false },
  tenants: { list: false, aggregates: false, followUps: true, followUpQueue: false, selected: false },
  configuration: { list: false, aggregates: false, followUps: true, followUpQueue: false, selected: false },
}

const TABS_WITH_FILTERS = new Set<DashboardTabId>(['overview', 'communications', 'leads', 'ai'])

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function hrefWith(base: string, tab: string | null, filters: DashboardFilters): string {
  const params = new URLSearchParams()
  if (tab) params.set('tab', tab)
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value && value !== 'all' && !(key === 'sort' && value === 'recent')) params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

function resolveActiveTab(requested: string | undefined, tabs: ReadonlyArray<TabDefinition>): DashboardTabId {
  return tabs.some((tab) => tab.id === requested) ? (requested as DashboardTabId) : 'overview'
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getVerifiedSession()
  if (!session) redirect('/tenant/login?next=/dashboard')

  const raw = (await searchParams) ?? {}
  const params: SearchParams = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, first(v)]))

  const isPlatform = session.role === 'platform_admin'
  const tabs = isPlatform ? [...baseTabs, platformTenantTab] : [...baseTabs, tenantConfigurationTab]
  const activeTab = resolveActiveTab(params.tab, tabs)
  const activeTabDef = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const canEdit = canMutateDashboard(session)

  const filters: DashboardFilters = {
    q: params.q,
    status: params.status,
    quality: params.quality,
    urgency: params.urgency,
    range: params.range ?? '30',
    selectedId: params.selectedId,
    page: params.page,
    limit: params.limit,
    sort: params.sort,
  }

  // Only fetch tenant data for the tab that renders it.
  const [analytics, tenantDetail, platformTenants] = await Promise.all([
    getDashboardAnalytics(filters, { scope: dashboardScopeForSession(session), sections: TAB_SECTIONS[activeTab] }),
    activeTab === 'configuration' && session.tenantId ? getManagedTenantDetail(session.tenantId) : null,
    activeTab === 'tenants' && isPlatform ? listManagedTenants() : [],
  ])

  const setupHref = isPlatform ? '/admin/tenants' : session.tenantId ? `/admin/tenants/${session.tenantId}` : '/dashboard?tab=configuration'
  const nav = buildNavItems(tabs, (tab) => hrefWith('/dashboard', tab === 'overview' ? null : tab, filters))
  const showFilters = TABS_WITH_FILTERS.has(activeTab)
  const firstName = session.name?.trim().split(/\s+/)[0] || 'there'

  return (
    <DashboardShell
      session={session}
      nav={nav}
      activeTab={activeTab}
      overdueFollowUps={analytics.overdueFollowUps}
      alertsHref={hrefWith('/dashboard', 'ai', filters)}
      searchTab={activeTab === 'leads' ? 'leads' : 'communications'}
      searchQuery={filters.q}
      setupHref={setupHref}
    >
      {/* One header block per page: gradient title area (plus the overview summary)
          with the filter toolbar attached underneath, so controls sit directly above
          the KPIs and lists they change, without separate bars and gaps. */}
      <section className={`rounded-2xl ${CARD_SHADOW}`} aria-labelledby="dashboard-title">
        <div
          className={`relative isolate overflow-hidden bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] px-4 py-4 text-white sm:px-6 sm:py-5 ${
            showFilters ? 'rounded-t-2xl' : 'rounded-2xl'
          }`}
        >
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 -z-10 h-48 w-48 rounded-full bg-cyan-300/15" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm" aria-hidden="true">
                <Icon name={activeTab} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                {activeTab === 'overview' && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Welcome back, {firstName}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="dashboard-title" className="text-lg font-bold tracking-tight sm:text-xl">{activeTabDef.label}</h1>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold ring-1 ring-white/30">{activeTabDef.badgeText}</span>
                </div>
                <p className="text-xs text-white/85">{activeTabDef.description}</p>
              </div>
            </div>
            {showFilters && analytics.configured && (
              <p className="w-fit shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20">
                <span className="font-semibold tabular-nums text-white">{analytics.filteredCalls.toLocaleString()}</span> of{' '}
                <span className="tabular-nums">{analytics.totalCalls.toLocaleString()}</span> conversations · Updated{' '}
                <LocalTime iso={analytics.generatedAt} />
              </p>
            )}
          </div>

          {activeTab === 'overview' && analytics.configured && (
            <div className="mt-4 border-t border-white/15 pt-4">
              <WelcomeSummary analytics={analytics} />
            </div>
          )}
        </div>

        {showFilters && (
          <div className="rounded-b-2xl border border-t-0 border-slate-200/90 bg-white px-3 py-2.5 sm:px-4">
            <FilterBar exportHref={hrefWith('/dashboard/export', null, filters)} />
          </div>
        )}
      </section>

      <div className="space-y-3.5">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'communications' && (
          <CommunicationsTab calls={analytics.recentCalls} pagination={analytics.pagination} canEdit={canEdit} />
        )}
        {activeTab === 'leads' && <LeadsTab analytics={analytics} canEdit={canEdit} />}
        {activeTab === 'ai' && <AiTab analytics={analytics} canEdit={canEdit} />}
        {activeTab === 'capabilities' && <CapabilitiesTab />}
        {activeTab === 'tenants' && isPlatform && <PlatformTenantsTab tenants={platformTenants} />}
        {activeTab === 'configuration' && session.tenantId && (
          <TenantConfigurationTab tenantId={session.tenantId} detail={tenantDetail} />
        )}
      </div>
    </DashboardShell>
  )
}
