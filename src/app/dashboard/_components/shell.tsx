import Link from 'next/link'
import type { ReactNode } from 'react'
import { SupportAgentLogo } from '@/components/brand/support-agent-logo'
import type { AuthSession } from '@/lib/auth/types'
import type { DashboardTabId, TabDefinition } from '../constants'
import { Icon, type IconName } from './icons'
import { NavLink } from './nav-link'
import { btnGhost, cx, focusRing } from './ui'

export type NavItem = {
  id: DashboardTabId
  label: string
  href: string
  icon: IconName
}

const SIDEBAR_LABELS: Partial<Record<DashboardTabId, string>> = {
  overview: 'Overview',
  communications: 'Call transcripts',
  leads: 'Lead pipeline',
  ai: 'AI insights',
  capabilities: 'Capabilities',
  tenants: 'Tenants',
  configuration: 'Agent setup',
}

export function buildNavItems(tabs: ReadonlyArray<TabDefinition>, hrefFor: (tab: DashboardTabId) => string): NavItem[] {
  return tabs.map((tab) => ({
    id: tab.id,
    label: SIDEBAR_LABELS[tab.id] ?? tab.label,
    href: hrefFor(tab.id),
    icon: tab.id as IconName,
  }))
}

function initials(session: AuthSession): string {
  const source = session.name?.trim() || session.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase()
}

const ROLE_LABEL: Record<AuthSession['role'], string> = {
  platform_admin: 'Platform admin',
  tenant_owner: 'Owner',
  tenant_admin: 'Admin',
  tenant_viewer: 'Viewer',
}

const sideLink = cx('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors', focusRing)
const sideActive = 'border-blue-200 bg-blue-50 text-[#0052ff]'
const sideIdle = 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'

const pillLink = cx('inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors', focusRing)
const pillActive = 'bg-[#0052ff] text-white shadow-sm'
const pillIdle = 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'

export function DashboardShell({
  session,
  nav,
  activeTab,
  overdueFollowUps,
  alertsHref,
  searchTab,
  searchQuery,
  setupHref,
  children,
}: {
  session: AuthSession
  nav: NavItem[]
  activeTab: DashboardTabId
  overdueFollowUps: number
  alertsHref: string
  searchTab: DashboardTabId
  searchQuery?: string
  setupHref: string
  children: ReactNode
}) {
  const role = ROLE_LABEL[session.role] ?? session.role
  const logoutNext = session.role === 'platform_admin' ? '/admin/login' : '/tenant/login'

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 antialiased">
      <a href="#dashboard-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:shadow">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
        <Link href="/dashboard" className={cx('rounded-lg', focusRing)} aria-label="Dashboard home">
          <SupportAgentLogo variant="dark" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Global search: a real GET form that lands on the transcripts tab. */}
          <form action="/dashboard" method="get" role="search" className="relative hidden md:block">
            <input type="hidden" name="tab" value={searchTab} />
            <label htmlFor="global-search" className="sr-only">Search conversations</label>
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="global-search"
              name="q"
              type="search"
              defaultValue={searchQuery ?? ''}
              maxLength={100}
              placeholder="Search conversations…"
              className="h-9 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0052ff] focus:bg-white focus:ring-2 focus:ring-[#0052ff]/15"
            />
          </form>

          <a
            href="/voice"
            target="_blank"
            rel="noopener noreferrer"
            className={cx('hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 sm:inline-flex', focusRing)}
          >
            <Icon name="mic" className="h-3.5 w-3.5" />
            Test voice agent
            <Icon name="external" className="h-3 w-3 text-emerald-600" />
          </a>

          {/* Alerts: real overdue follow-up count, links to the follow-up queue. */}
          <Link
            href={alertsHref}
            className={cx(btnGhost, 'relative')}
            aria-label={overdueFollowUps ? `${overdueFollowUps} overdue follow-ups` : 'No overdue follow-ups'}
            title={overdueFollowUps ? `${overdueFollowUps} overdue follow-ups` : 'No overdue follow-ups'}
          >
            <Icon name="bell" />
            {overdueFollowUps > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-white">
                {overdueFollowUps > 99 ? '99+' : overdueFollowUps}
              </span>
            )}
          </Link>

          <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052ff] text-xs font-bold text-white" aria-hidden="true">
              {initials(session)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-[10rem] truncate text-xs font-semibold leading-tight text-slate-900">{session.name || session.email}</p>
              <p className="text-xs font-medium text-slate-400">{role}</p>
            </div>
            <form action="/api/admin/auth/logout" method="post">
              <input type="hidden" name="next" value={logoutNext} />
              <button type="submit" className={cx(btnGhost, 'hover:text-rose-600')} aria-label="Sign out" title="Sign out">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-white p-4 lg:flex">
          <nav aria-label="Dashboard sections" className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                active={activeTab === item.id}
                className={sideLink}
                activeClassName={sideActive}
                inactiveClassName={sideIdle}
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <NavLink href={setupHref} className={cx(sideLink, sideIdle)}>
                <Icon name="configuration" className="h-4 w-4 shrink-0" />
                <span>{session.role === 'platform_admin' ? 'Tenant admin' : 'Agent settings'}</span>
              </NavLink>
            </div>
          </nav>

          <div className="flex items-center gap-2.5 border-t border-slate-200/80 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0052ff] text-xs font-bold text-white" aria-hidden="true">
              {initials(session)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{session.name || session.email}</p>
              <p className="truncate text-xs text-slate-500">
                {session.tenantId ?? 'All tenants'} · {role}
              </p>
            </div>
          </div>
        </aside>

        <main id="dashboard-main" className="min-w-0 flex-1 flex flex-col gap-3.5 px-3.5 pb-5 pt-3 sm:px-4 lg:px-5">
          {/* Mobile / tablet section nav (sidebar is hidden below lg). */}
          <nav aria-label="Dashboard sections" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            {nav.map((item) => (
              <NavLink
                key={item.id}
                href={item.href}
                active={activeTab === item.id}
                className={pillLink}
                activeClassName={pillActive}
                inactiveClassName={pillIdle}
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  )
}
