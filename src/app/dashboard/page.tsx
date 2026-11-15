import { redirect } from 'next/navigation'
import { getDashboardAnalytics } from '@/lib/dashboard/analytics'
import type { DashboardFilters, DashboardSections } from '@/lib/dashboard/types'
import { canMutateDashboard, dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'
import { getManagedTenantDetail, listManagedTenants } from '@/lib/tenants/management'
import { FilterBar } from './components'
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
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[#0052ff]">
            <Icon name={activeTab} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{activeTabDef.label}</h1>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0052ff]">
                {activeTabDef.badgeText}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{activeTabDef.description}</p>
          </div>
        </div>
        {showFilters && analytics.configured && (
          <p className="shrink-0 text-[11px] text-slate-400">
            {analytics.filteredCalls.toLocaleString()} of {analytics.totalCalls.toLocaleString()} conversations · Updated{' '}
            <LocalTime iso={analytics.generatedAt} />
          </p>
        )}
      </section>

      {showFilters && <FilterBar exportHref={hrefWith('/dashboard/export', null, filters)} />}

      <div className="space-y-6">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} userName={session.name} />}
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
