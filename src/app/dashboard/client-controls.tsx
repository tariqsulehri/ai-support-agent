'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import { updateStatusAction } from './actions'
import { statusOptions } from './constants'
import type { PaginationMeta } from '@/lib/dashboard/analytics'

/**
 * Visual Star Rating (1 to 5 stars) displaying lead engagement & maturity score.
 * Rendered inline on every lead card with filled/empty SVGs and interactive tooltip.
 */
export function LeadStarRating({
  score = 1,
  label = 'Initial Inquiry',
  showLabel = true,
  size = 'sm',
}: {
  score?: number
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const normalizedScore = Math.max(1, Math.min(5, Math.round(score)))
  const starSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-amber-100/60 px-2.5 py-0.5 shadow-[0_1px_2px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/10"
      title={`Maturity Score: ${normalizedScore}/5 stars — ${label}`}
    >
      <div className="flex items-center gap-0.5" aria-label={`${normalizedScore} of 5 stars`}>
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = starIndex <= normalizedScore
          return (
            <svg
              key={starIndex}
              className={`${starSize} ${
                isFilled
                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_1px_1px_rgba(245,158,11,0.4)]'
                  : 'text-slate-200 fill-slate-100'
              } transition-colors duration-150`}
              viewBox="0 0 20 20"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          )
        })}
      </div>

      {showLabel && (
        <span className="text-[10px] font-extrabold tracking-tight text-amber-900 font-sans">
          {normalizedScore}★ <span className="font-semibold text-amber-800/80 hidden sm:inline">({label})</span>
        </span>
      )}
    </div>
  )
}

/**
 * Optimistic Status Form:
 * Instantly updates the UI with 0ms delay while updating status in the background.
 * Displays a micro-spinner when in-flight.
 */
export function OptimisticStatusForm({
  callId,
  initialStatus,
}: {
  callId: string
  initialStatus: string
}) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus) return
    const prev = currentStatus
    setCurrentStatus(newStatus) // Optimistic update

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('id', callId)
        formData.append('status', newStatus)
        await updateStatusAction(formData)
      } catch (err) {
        console.error('[optimistic-status-form] Failed to update status', err)
        setCurrentStatus(prev) // Rollback on error
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isPending}
          className="h-8 w-full rounded-lg border border-slate-200/90 bg-white pl-2 pr-7 text-xs font-semibold text-slate-800 shadow-xs outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10 cursor-pointer disabled:opacity-60 transition"
          aria-label="Lead status"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
        {isPending && (
          <div className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
        )}
      </div>
    </div>
  )
}

/**
 * 300ms Debounced Search Input:
 * Prevents excessive server-side database queries on every keystroke.
 * Smoothly updates URL parameters and displays an active search indicator.
 */
export function DebouncedSearchInput({
  defaultValue = '',
  placeholder = 'Search callers, leads, records...',
}: {
  defaultValue?: string
  placeholder?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)
  const [isSearching, startTransition] = useTransition()

  useEffect(() => {
    setQuery(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query === defaultValue) return

      startTransition(() => {
        const params = new URLSearchParams(searchParams?.toString())
        if (query.trim()) {
          params.set('q', query.trim())
        } else {
          params.delete('q')
        }
        params.set('page', '1') // Reset to page 1 on new search
        router.push(`${pathname}?${params.toString()}`)
      })
    }, 300)

    return () => clearTimeout(handler)
  }, [query, defaultValue, pathname, router, searchParams])

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 outline-none focus:bg-white focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10 focus:shadow-xs"
      />
      <svg
        className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      {isSearching && (
        <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
      )}
    </div>
  )
}

/**
 * Server-Side Pagination Controls Component:
 * Displays summary totals ("Showing 1–10 of 42,300 filtered records (out of 1,420,500 total)")
 * and provides page buttons with clean URL parameter preservation.
 */
export function PaginationControls({
  pagination,
  buildHref,
}: {
  pagination: PaginationMeta
  buildHref?: (page: number) => string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { page, limit, totalRecords, filteredRecords, totalPages, hasPrevPage, hasNextPage } = pagination

  const defaultBuildHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('page', String(targetPage))
    return `${pathname}?${params.toString()}`
  }

  const resolveHref = buildHref ?? defaultBuildHref

  if (filteredRecords === 0) return null

  const startRecord = (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, filteredRecords)

  // Generate page numbers with ellipses
  const pageNumbers: Array<number | '...'> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push('...')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) pageNumbers.push(i)
    if (page < totalPages - 2) pageNumbers.push('...')
    pageNumbers.push(totalPages)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      {/* Summary Totals */}
      <div className="text-xs text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-900">{startRecord}–{endRecord}</span> of{' '}
        <span className="font-bold text-[#0052ff]">{filteredRecords.toLocaleString()}</span> filtered conversations{' '}
        <span className="text-slate-400 font-normal">
          ({totalRecords.toLocaleString()} total in database)
        </span>
      </div>

      {/* Pagination Buttons */}
      <nav className="flex items-center gap-1.5 self-center sm:self-auto" aria-label="Pagination">
        {/* Previous Button */}
        {hasPrevPage ? (
          <Link
            href={resolveHref(page - 1)}
            prefetch={false}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
          >
            ‹ Prev
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300 cursor-not-allowed">
            ‹ Prev
          </span>
        )}

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((item, idx) => {
            if (item === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-400">
                  …
                </span>
              )
            }
            const isCurrent = item === page
            return (
              <Link
                key={item}
                href={resolveHref(item)}
                prefetch={false}
                className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-bold transition-all duration-150 ${
                  isCurrent
                    ? 'bg-gradient-to-b from-[#0052ff] to-[#0040d0] text-white shadow-[0_2px_6px_rgba(0,82,255,0.3)]'
                    : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {item}
              </Link>
            )
          })}
        </div>

        {/* Next Button */}
        {hasNextPage ? (
          <Link
            href={resolveHref(page + 1)}
            prefetch={false}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
          >
            Next ›
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-300 cursor-not-allowed">
            Next ›
          </span>
        )}
      </nav>
    </div>
  )
}
