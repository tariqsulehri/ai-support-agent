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
  type TabDefinition,
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
import { TkxelCalibrLogo } from '@/components/brand/calibr-logo'

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
  tabs: ReadonlyArray<TabDefinition>
): DashboardTabId {
  return tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as DashboardTabId)
    : 'overview'
}

function TabIcon({ id, className = 'h-3.5 w-3.5' }: { id: DashboardTabId; className?: string }) {
  if (id === 'overview') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75H4.25a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h4a.75.75 0 010 1.5h-4A2.25 2.25 0 012 15.75V4.25z" />
        <path d="M12.75 9a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75v-6z" />
      </svg>
    )
  }
  if (id === 'communications') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.74 3.37 1.97 4.6-.28 1.1-.94 2.12-1.87 2.87a.75.75 0 00.5 1.33c2.3 0 4.14-.9 5.23-1.92.7.08 1.43.12 2.17.12 4.418 0 8-3.134 8-7s-3.582-7-8-7z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (id === 'leads') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
      </svg>
    )
  }
  if (id === 'ai') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
      </svg>
    )
  }
  if (id === 'capabilities') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.72 9.72a.75.75 0 000 1.06l.25.25a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06L6.5 8.44l-.47-.47zm6.47-2.78a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15zM19 8.5H1v6A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-6zM3 13.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4.75-.75a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getVerifiedSession()
  if (!session) redirect('/tenant/login?next=/dashboard')

  const resolvedSearchParams = await searchParams
  const tabs =
    session.role === 'platform_admin'
      ? [...baseTabs, platformTenantTab]
      : [...baseTabs, tenantConfigurationTab]
  const activeTab = resolveActiveTab(resolvedSearchParams?.tab, tabs)
  const activeTabDef = tabs.find((t) => t.id === activeTab) || tabs[0]

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
    session.role === 'platform_admin' ? listManagedTenants() : Promise.resolve([]),
  ])

  // Compute initials for the user profile badge (matching TM in screenshot)
  const userInitials =
    session.name
      ?.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'TM'

  const roleTitle = session.role === 'platform_admin' ? 'ADMIN' : 'TENANT ADMIN'

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased">
      {/* Top Application Navbar */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200/90 bg-white px-4 sm:px-6 flex items-center justify-between select-none">
        {/* Left: Back Icon & tkxel | Calibr Logo */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-slate-600 transition p-1 -ml-1"
            title="Dashboard Home"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <TkxelCalibrLogo variant="dark" />
        </div>

        {/* Right: Notifications, Sparkle, and User Profile Badge */}
        <div className="flex items-center gap-3.5">
          {/* Notification Bell */}
          <button
            type="button"
            className="relative p-1.5 text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-100"
            title="Notifications"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#ff5e1a] ring-2 ring-white" />
          </button>

          {/* Sparkle / AI Assistant Icon */}
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-[#0052ff] transition rounded-lg hover:bg-slate-100"
            title="AI Co-pilot"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
            </svg>
          </button>

          <span className="h-5 w-px bg-slate-200" />

          {/* User Profile Chip */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052ff] text-xs font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {session.name || 'Tariq Mahmood'}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                {roleTitle}
              </p>
            </div>

            {/* Direct Sign-out icon button */}
            <form action="/api/admin/auth/logout" method="post" className="ml-1">
              <input
                type="hidden"
                name="next"
                value={session.role === 'platform_admin' ? '/admin/login' : '/tenant/login'}
              />
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Layout Area: Left Sidebar + Content */}
      <div className="flex flex-1 min-h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar Navigation */}
        <aside className="hidden lg:flex w-60 flex-col justify-between border-r border-slate-200/90 bg-white p-3 shrink-0 select-none">
          <div className="space-y-6">
            <nav className="space-y-1">
              <Link
                href={dashboardTabHref('overview', filters)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'overview'
                    ? 'bg-blue-50/70 text-[#0052ff]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75H4.25a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h4a.75.75 0 010 1.5h-4A2.25 2.25 0 012 15.75V4.25z" />
                </svg>
                <span>Admin Dashboard</span>
              </Link>

              <Link
                href={dashboardTabHref('communications', filters)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'communications'
                    ? 'bg-blue-50/70 text-[#0052ff]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Pending Approvals</span>
              </Link>

              <Link
                href={dashboardTabHref('leads', filters)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'leads'
                    ? 'bg-blue-50/70 text-[#0052ff]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>Team Roster</span>
              </Link>

              <Link
                href={dashboardTabHref('ai', filters)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'ai'
                    ? 'bg-blue-50/70 text-[#0052ff]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
                </svg>
                <span>Skill Assessments</span>
              </Link>

              <Link
                href={dashboardTabHref('capabilities', filters)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'capabilities'
                    ? 'bg-blue-50/70 text-[#0052ff]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>CEFR Communication</span>
              </Link>

              <Link
                href={dashboardTabHref('ai', filters)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.789 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-3.658-1.83z" />
                </svg>
                <span>AI Dashboard</span>
              </Link>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span>Reports</span>
                </div>
                <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Setup / Configuration Section with Expandable Tree */}
              <div className="pt-2">
                <Link
                  href={
                    session.role === 'platform_admin'
                      ? dashboardTabHref('tenants', filters)
                      : session.tenantId
                        ? `/admin/tenants/${session.tenantId}`
                        : dashboardTabHref('configuration', filters)
                  }
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#0052ff] hover:bg-blue-50/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Setup</span>
                  </div>
                  <svg className="h-3.5 w-3.5 text-[#0052ff]" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>

                {/* Sub-tree menu (matching items from screenshot 2) */}
                <div className="ml-4 pl-3 border-l-2 border-slate-100 mt-1 space-y-1 text-[11px] font-medium text-slate-600">
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">1</span>
                    <span>Evaluation Periods</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded bg-blue-50/80 text-[#0052ff] font-semibold border-l-2 border-[#0052ff] -ml-[13px] pl-[11px]">
                    <span className="font-mono">2</span>
                    <span>Assessment Options</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">3</span>
                    <span>Organization</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">4</span>
                    <span>User Management</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">5</span>
                    <span>Skill Framework</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">6</span>
                    <span>Targets & Rules</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">7</span>
                    <span>Industries & Domains</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-400 font-mono">8</span>
                    <span>Scoring Simulator</span>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Bottom Profile Widget in Sidebar (matching Image 2 bottom-left) */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0052ff] text-xs font-bold text-white shadow-xs">
                {userInitials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session.name || 'Tariq Mahmood'}
                </p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  ID 1363 | {roleTitle}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#f8fafc]/60 p-4 sm:p-6 lg:p-8 min-w-0 space-y-5 overflow-y-auto">
          {/* Header Card (matching Image 2 top card) */}
          <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Soft rounded blue square icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50/70 text-[#0052ff]">
                  <TabIcon id={activeTab} className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                      {activeTabDef.label}
                    </h1>
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0052ff]">
                      {activeTabDef.badgeText}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Updated {formatDate(analytics.generatedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 font-medium">
                    {activeTabDef.description}
                  </p>
                </div>
              </div>

              {/* Quick Search on Top Right */}
              <div className="relative shrink-0">
                <input
                  type="text"
                  placeholder="Search configuration..."
                  defaultValue={filters.q ?? ''}
                  className="h-9 w-full sm:w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 shadow-xs outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff]"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </section>

          {/* Stepped Numbered Pill Tabs Bar (matching Image 2 tab bar) */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-1">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Stepped tabs">
              {tabs.map((tab) => {
                const selected = activeTab === tab.id
                const href =
                  tab.id === 'configuration' && session.tenantId
                    ? `/admin/tenants/${session.tenantId}`
                    : dashboardTabHref(tab.id, filters)

                return (
                  <Link
                    key={tab.id}
                    href={href}
                    prefetch={false}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? 'bg-[#0052ff] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {/* Number badge */}
                    <span
                      className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-bold ${
                        selected
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.num}
                    </span>

                    <TabIcon id={tab.id} className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Contextual description note on the right (matching Image 2) */}
            <p className="text-xs text-slate-500 font-medium hidden xl:block">
              {activeTabDef.description}
            </p>
          </div>

          {/* Filter Bar (matching Image 2 table filter style) */}
          <FilterBar
            filters={filters}
            activeTab={activeTab}
            exportHref={dashboardExportHref(filters)}
          />

          {/* Tab Views */}
          <div className="space-y-6">
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
      </div>
    </div>
  )
}
