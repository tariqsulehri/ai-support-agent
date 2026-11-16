'use client'

import { useSearchParams } from 'next/navigation'
import { Fragment, useDeferredValue, useState, type ReactNode } from 'react'
import { buttonClasses } from '@/components/admin/button-styles'
import { CountPill, SectionCard } from '@/components/admin/gradient-tile'
import { Icon } from '@/app/dashboard/_components/icons'
import { TabLink } from './admin-tabs'

export type StatusFilter = 'all' | 'active' | 'disabled'

/** One server-rendered table row plus the fields needed to filter it on the client. */
export type DirectoryRow = { id: string; status: string; haystack: string; row: ReactNode }

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'disabled', label: 'Disabled' },
]

const thClass = 'px-4 py-3 font-semibold'

function parseFilter(value: string | null): StatusFilter {
  return value === 'active' || value === 'disabled' ? value : 'all'
}

/** Mirror filter state into the URL without a navigation, so the view stays shareable. */
function syncUrl(filter: StatusFilter, query: string) {
  const params = new URLSearchParams(window.location.search)
  if (filter === 'all') params.delete('status')
  else params.set('status', filter)
  if (query) params.set('q', query)
  else params.delete('q')
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
}

/**
 * Registered tenants card. Rows arrive server-rendered; status filter and search
 * run in the browser so they respond instantly with no server round trip.
 */
export function TenantDirectory({ rows }: { rows: DirectoryRow[] }) {
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<StatusFilter>(() => parseFilter(searchParams.get('status')))
  const [query, setQuery] = useState(() => (searchParams.get('q') ?? '').slice(0, 100))
  const needle = useDeferredValue(query.trim().toLowerCase())

  const counts: Record<StatusFilter, number> = {
    all: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    disabled: rows.filter((r) => r.status === 'disabled').length,
  }
  const visible = rows.filter(
    (r) => (filter === 'all' || r.status === filter) && (!needle || r.haystack.includes(needle)),
  )

  const changeFilter = (next: StatusFilter) => {
    setFilter(next)
    syncUrl(next, query.trim())
  }
  const changeQuery = (next: string) => {
    setQuery(next)
    syncUrl(filter, next.trim())
  }
  const clearFilters = () => {
    setFilter('all')
    setQuery('')
    syncUrl('all', '')
  }

  return (
    <SectionCard
      title="Registered Tenants"
      icon="tenants"
      badge={<CountPill>{rows.length}</CountPill>}
      description="Search, filter and manage tenant accounts."
      actions={
        <TabLink tab="create" className={buttonClasses('primary', 'sm')}>
          + New tenant
        </TabLink>
      }
      toolbar={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div
            className="inline-flex w-fit rounded-xl border border-slate-200/80 bg-white/70 p-1 shadow-sm"
            role="group"
            aria-label="Filter by status"
          >
            {FILTERS.map((item) => {
              const selected = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => changeFilter(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#0052ff]/30 ${
                    selected ? 'bg-[#0052ff] text-white shadow-[0_3px_10px_rgba(0,82,255,0.30)]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  <span className={`tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}>{counts[item.id]}</span>
                </button>
              )
            })}
          </div>
          <div className="relative w-full md:w-72" role="search">
            <label htmlFor="tenant-search" className="sr-only">Search tenants</label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              id="tenant-search"
              type="search"
              value={query}
              maxLength={100}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search name, ID or domain"
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10"
            />
          </div>
        </div>
      }
    >
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
        <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
          <caption className="sr-only">Registered tenants</caption>
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[20%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className={thClass}>Tenant</th>
              <th scope="col" className={thClass}>Domains</th>
              <th scope="col" className={thClass}>Plan</th>
              <th scope="col" className={thClass}>OpenAI key</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0 ? (
                    <>
                      No tenants yet.{' '}
                      <TabLink tab="create" className="font-semibold text-[#0052ff] hover:underline">Create one</TabLink>.
                    </>
                  ) : (
                    <>
                      No tenants match these filters.{' '}
                      <button type="button" onClick={clearFilters} className="font-semibold text-[#0052ff] hover:underline">
                        Clear filters
                      </button>
                      .
                    </>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((r) => <Fragment key={r.id}>{r.row}</Fragment>)
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500" aria-live="polite">
        Showing <span className="font-semibold tabular-nums text-slate-900">{visible.length}</span> of{' '}
        <span className="tabular-nums">{rows.length}</span> tenants
      </p>
    </SectionCard>
  )
}

