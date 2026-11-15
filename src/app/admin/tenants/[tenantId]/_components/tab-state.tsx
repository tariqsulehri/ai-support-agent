'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { DETAIL_TABS, type TabKey } from './types'
import { DetailTabIcon } from './icons'

type TabContextValue = { activeTab: TabKey; setTab: (tab: TabKey) => void }

const TabContext = createContext<TabContextValue | null>(null)

function useTabs(): TabContextValue {
  const ctx = useContext(TabContext)
  if (!ctx) throw new Error('Tenant tab components must be inside TenantTabProvider.')
  return ctx
}

/**
 * Client-side tab state. All tab panels are rendered on the server once and
 * switched locally, so changing tabs is instant (no server round-trip). The URL
 * is kept in sync with history.replaceState so reloads/deep links still work.
 */
export function TenantTabProvider({ initialTab, children }: { initialTab: TabKey; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const setTab = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    url.searchParams.delete('created')
    window.history.replaceState(window.history.state, '', url)
  }, [])
  return <TabContext.Provider value={{ activeTab, setTab }}>{children}</TabContext.Provider>
}

const focusRing = 'outline-none focus-visible:ring-4 focus-visible:ring-[#0052ff]/20'

export function TabBar() {
  const { activeTab, setTab } = useTabs()
  return (
    <div className="-mx-1 overflow-x-auto px-1 py-1">
      <div role="tablist" aria-label="Tenant settings sections" className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {DETAIL_TABS.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tenant-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`tenant-panel-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${focusRing} ${
                selected
                  ? 'bg-[#0052ff] text-white shadow-[0_3px_10px_rgba(0,82,255,0.30)]'
                  : 'border border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-bold ${
                  selected ? 'bg-white/20 text-white' : 'border border-blue-200/70 bg-blue-50 text-[#0052ff]'
                }`}
              >
                {tab.num}
              </span>
              <DetailTabIcon id={tab.id} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SidebarSubnav() {
  const { activeTab, setTab } = useTabs()
  return (
    <div className="ml-4 mt-1.5 space-y-1 border-l-2 border-slate-200/80 pl-3 text-[11px] font-medium text-slate-600">
      {DETAIL_TABS.map((tab) => {
        const selected = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => setTab(tab.id)}
            className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${focusRing} ${
              selected
                ? 'border-blue-200/80 bg-blue-50/80 font-bold text-[#0052ff]'
                : 'border-transparent text-slate-600 hover:bg-slate-100/80'
            }`}
          >
            <span className="font-mono font-bold text-[#0052ff]">{tab.num}</span>
            <span>{tab.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ActiveTabIcon({ className }: { className?: string }) {
  const { activeTab } = useTabs()
  return <DetailTabIcon id={activeTab} className={className} />
}

export function ActiveTabText({ field }: { field: 'badgeText' | 'description' }) {
  const { activeTab } = useTabs()
  return <>{(DETAIL_TABS.find((t) => t.id === activeTab) ?? DETAIL_TABS[0])[field]}</>
}

/** Button that jumps to another tab, optionally hidden while that tab is active. */
export function TabLink({
  tab,
  children,
  className,
  hideWhenActive,
}: {
  tab: TabKey
  children: ReactNode
  className?: string
  hideWhenActive?: boolean
}) {
  const { activeTab, setTab } = useTabs()
  if (hideWhenActive && activeTab === tab) return null
  return (
    <button type="button" onClick={() => setTab(tab)} className={`${className ?? ''} ${focusRing}`}>
      {children}
    </button>
  )
}

/** Renders only the active panel; inactive panels stay unmounted. */
export function TabPanels({ panels }: { panels: Record<TabKey, ReactNode> }) {
  const { activeTab } = useTabs()
  return (
    <div role="tabpanel" id={`tenant-panel-${activeTab}`} aria-labelledby={`tenant-tab-${activeTab}`} className="space-y-5">
      {panels[activeTab]}
    </div>
  )
}
