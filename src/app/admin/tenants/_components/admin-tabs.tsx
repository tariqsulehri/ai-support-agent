'use client'

import { useSearchParams } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { CountPill } from '@/components/admin/gradient-tile'
import { Icon, type IconName } from '@/app/dashboard/_components/icons'
import { CARD_SHADOW } from '@/components/admin/surface'

export type AdminTabMeta = { id: string; label: string; icon: IconName; count?: number }

const TENANTS_PATH = '/admin/tenants'

/** Plain left-clicks switch tabs in place; modified clicks (new tab/window) keep normal link behaviour. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

/**
 * Switches to `tab` without a server round trip. Next.js syncs `history.pushState`
 * with `useSearchParams`, so the URL stays shareable and Back/Forward still work.
 */
export function selectTab(tab: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('tab', tab)
  window.history.pushState(null, '', `${TENANTS_PATH}?${params.toString()}`)
}

/** In-page link to another tab (e.g. "+ New tenant"); instant like the tab bar. */
export function TabLink({ tab, className, children }: { tab: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`${TENANTS_PATH}?tab=${tab}`}
      className={className}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        selectTab(tab)
      }}
    >
      {children}
    </a>
  )
}

/**
 * Tab bar plus panels. Every panel is server-rendered once and kept mounted
 * (hidden when inactive), so switching tabs is instant and preserves form input.
 */
export function AdminTabs({
  tabs,
  defaultTab,
  panels,
}: {
  tabs: AdminTabMeta[]
  defaultTab: string
  panels: Record<string, ReactNode>
}) {
  const searchParams = useSearchParams()
  const requested = searchParams.get('tab')
  const selectedTab = tabs.some((tab) => tab.id === requested) ? (requested as string) : defaultTab

  return (
    <>
      <nav
        className={`flex justify-start gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 backdrop-blur ${CARD_SHADOW}`}
        aria-label="Tenant admin sections"
      >
        {tabs.map((tab) => {
          const selected = selectedTab === tab.id
          return (
            <a
              key={tab.id}
              href={`${TENANTS_PATH}?tab=${tab.id}`}
              aria-current={selected ? 'page' : undefined}
              onClick={(event) => {
                if (!isPlainClick(event)) return
                event.preventDefault()
                if (!selected) selectTab(tab.id)
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-[#0052ff]/20 ${
                selected
                  ? 'bg-gradient-to-r from-[#0052ff] to-[#133cb4] text-white shadow-[0_6px_16px_-4px_rgba(0,82,255,0.45)]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon name={tab.icon} className="h-4 w-4" />
              {tab.label}
              {typeof tab.count === 'number' && <CountPill inverted={selected}>{tab.count}</CountPill>}
            </a>
          )
        })}
      </nav>

      {tabs.map((tab) => (
        <div key={tab.id} hidden={selectedTab !== tab.id}>
          {panels[tab.id]}
        </div>
      ))}
    </>
  )
}
