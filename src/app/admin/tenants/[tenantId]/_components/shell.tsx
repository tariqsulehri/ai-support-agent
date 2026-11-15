import Link from 'next/link'
import type { ReactNode } from 'react'
import { SupportAgentLogo } from '@/components/brand/support-agent-logo'
import { SidebarSubnav } from './tab-state'
import {
  BuildingIcon,
  ChatIcon,
  ChecklistIcon,
  ChevronLeftIcon,
  ExternalIcon,
  GearIcon,
  MicIcon,
  OverviewIcon,
  SparkleIcon,
  UsersIcon,
} from './icons'
import type { ViewerInfo } from './types'

const focusRing = 'outline-none focus-visible:ring-4 focus-visible:ring-[#0052ff]/20'
const navItem = `flex items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${focusRing}`

function Avatar({ initials, size = 'h-8 w-8' }: { initials: string; size?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0052ff] to-[#0038b8] text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,82,255,0.35)] ring-2 ring-white`}
    >
      {initials}
    </div>
  )
}

export function DetailHeader({ viewer, voiceUrl }: { viewer: ViewerInfo; voiceUrl: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
        >
          <ChevronLeftIcon />
        </Link>
        <Link href="/dashboard" aria-label="Support Agent dashboard" className={`rounded-xl ${focusRing}`}>
          <SupportAgentLogo variant="dark" />
        </Link>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        <a
          href={voiceUrl}
          target="_blank"
          rel="noreferrer"
          className={`hidden items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 sm:inline-flex ${focusRing}`}
        >
          <MicIcon className="h-3.5 w-3.5 text-emerald-600" />
          <span>Test Voice Agent</span>
          <ExternalIcon className="h-3 w-3 text-emerald-600" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <Avatar initials={viewer.initials} />
          <div className="hidden text-left sm:block">
            <p className="text-xs font-bold leading-tight text-slate-900">{viewer.name}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{viewer.roleTitle}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export function DetailSidebar({
  viewer,
  tenantId,
  voiceUrl,
}: {
  viewer: ViewerInfo
  tenantId: string
  voiceUrl: string
}) {
  return (
    <aside className="sticky top-14 z-30 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-white p-4 lg:flex">
      <nav aria-label="Dashboard" className="space-y-1.5">
        <SidebarLink href="/dashboard" icon={<OverviewIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
          Live Overview
        </SidebarLink>
        <SidebarLink href="/dashboard?tab=communications" icon={<ChatIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
          Call Transcripts
        </SidebarLink>
        <SidebarLink href="/dashboard?tab=leads" icon={<UsersIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
          Lead Pipeline
        </SidebarLink>
        <SidebarLink href="/dashboard?tab=ai" icon={<SparkleIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
          AI Intelligence
        </SidebarLink>
        <SidebarLink href="/dashboard?tab=capabilities" icon={<ChecklistIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
          Engine Capabilities
        </SidebarLink>
        <a href={voiceUrl} target="_blank" rel="noreferrer" className={navItem}>
          <MicIcon className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Test Voice Agent</span>
          <ExternalIcon className="ml-auto h-3 w-3 text-slate-400" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {viewer.isPlatformAdmin && (
          <SidebarLink href="/dashboard?tab=tenants" icon={<BuildingIcon className="h-4 w-4 shrink-0 text-slate-400" />}>
            Tenants Directory
          </SidebarLink>
        )}

        <div className="pt-2">
          <div
            aria-current="page"
            className="flex items-center gap-3 rounded-xl border border-blue-200/80 bg-blue-50/80 px-3.5 py-2.5 text-xs font-semibold text-[#0052ff]"
          >
            <GearIcon className="h-4 w-4 shrink-0" />
            <span>Agent Setup</span>
          </div>
          <SidebarSubnav />
        </div>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-slate-200/80 pt-4">
        <Avatar initials={viewer.initials} size="h-9 w-9" />
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-bold text-slate-900">{viewer.name}</p>
          <p className="truncate font-mono text-xs text-slate-500">
            {tenantId} · {viewer.roleTitle}
          </p>
        </div>
      </div>
    </aside>
  )
}

function SidebarLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className={navItem}>
      {icon}
      <span>{children}</span>
    </Link>
  )
}
