'use client'

import { memo, useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatLabel } from '@/lib/admin/forms'
import type { PaginationMeta } from '@/lib/dashboard/types'
import { updateManagementAction, updateStatusAction, type ActionResult } from './actions'
import { statusOptions } from './constants'
import { btnPrimary, btnSecondary, cx, fieldLabel, input, select } from './_components/ui'
import { Icon } from './_components/icons'

/* ───────────────────────── Time ───────────────────────── */

const serverFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/**
 * Renders a timestamp in the viewer's own timezone. The server pass renders UTC
 * (deterministic), then the client swaps to local time after hydration.
 */
export function LocalTime({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const [text, setText] = useState(() => (iso ? `${serverFormatter.format(new Date(iso))} UTC` : '—'))
  useEffect(() => {
    if (!iso) return
    setText(
      new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
        new Date(iso)
      )
    )
  }, [iso])
  return (
    <time dateTime={iso ?? undefined} className={className} suppressHydrationWarning>
      {text}
    </time>
  )
}

/* ───────────────────────── Rating ───────────────────────── */

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

/** 1–5 star lead maturity score. Pure presentational; safe to render in lists. */
export const LeadStarRating = memo(function LeadStarRating({
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
  const value = Math.max(1, Math.min(5, Math.round(score)))
  const starSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5"
      title={`Maturity score ${value}/5 — ${label}`}
    >
      <span className="flex items-center gap-0.5" role="img" aria-label={`Maturity ${value} of 5 — ${label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={cx(starSize, i <= value ? 'fill-amber-400' : 'fill-slate-200')} viewBox="0 0 20 20" aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </span>
      {showLabel && (
        <span className="hidden text-[10px] font-semibold text-amber-900 sm:inline" aria-hidden="true">
          {label}
        </span>
      )}
    </span>
  )
})

/* ───────────────────────── Status ───────────────────────── */

/**
 * Status selector with optimistic UI: the new value shows instantly, the server
 * action runs in a transition, and the value rolls back with an inline error if
 * the server rejects it. The select stays interactive while saving.
 */
export function OptimisticStatusForm({
  callId,
  initialStatus,
  readOnly = false,
}: {
  callId: string
  initialStatus: string
  readOnly?: boolean
}) {
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const latest = useRef(0)

  // Accept fresh server values after revalidation.
  useEffect(() => setStatus(initialStatus), [initialStatus])

  function change(next: string) {
    if (next === status) return
    const previous = status
    const requestId = ++latest.current
    setStatus(next)
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', callId)
      formData.set('status', next)
      let result: ActionResult
      try {
        result = await updateStatusAction(formData)
      } catch {
        result = { ok: false, error: 'Network error. Please retry.' }
      }
      // Ignore responses superseded by a newer selection.
      if (requestId !== latest.current) return
      if (!result.ok) {
        setStatus(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <label className="sr-only" htmlFor={`status-${callId}`}>
        Lead status
      </label>
      <div className="relative">
        <select
          id={`status-${callId}`}
          value={status}
          onChange={(e) => change(e.target.value)}
          disabled={readOnly}
          aria-busy={isPending}
          className={cx(select, 'h-9 pr-8 font-semibold')}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
        {isPending && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent"
          />
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}

/* ───────────────────────── Lead management ───────────────────────── */

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending && (
        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending ? 'Saving…' : children}
    </button>
  )
}

/**
 * Owner / follow-up / notes form. Uses useActionState so the result (success or
 * validation error) renders inline, and useFormStatus for an immediate pending state.
 * The follow-up date is converted from the browser's local time to ISO before submit.
 */
export function LeadManagementForm({
  callId,
  owner,
  followUpAt,
  notes,
  readOnly = false,
}: {
  callId: string
  owner: string | null
  followUpAt: string | null
  notes: string | null
  readOnly?: boolean
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateManagementAction, null)
  const [localDate, setLocalDate] = useState('')
  useEffect(() => setLocalDate(toLocalInputValue(followUpAt)), [followUpAt])
  const isoDate = useMemo(() => (localDate ? new Date(localDate).toISOString() : ''), [localDate])

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={callId} />
      <input type="hidden" name="followUpAt" value={isoDate} />
      <fieldset disabled={readOnly} className="space-y-3 disabled:opacity-70">
        <label className="block">
          <span className={fieldLabel}>Owner</span>
          <input name="owner" defaultValue={owner ?? ''} maxLength={120} placeholder="Sales owner or manager" className={input} />
        </label>
        <label className="block">
          <span className={fieldLabel}>Follow-up date</span>
          <input type="datetime-local" value={localDate} onChange={(e) => setLocalDate(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={fieldLabel}>Management notes</span>
          <textarea
            name="notes"
            defaultValue={notes ?? ''}
            rows={4}
            maxLength={5000}
            placeholder="Decision notes, objections, proposed next action"
            className={cx(input, 'h-auto py-2.5')}
          />
        </label>
      </fieldset>
      {!readOnly && <SubmitButton className={cx(btnPrimary, 'w-full')}>Save lead plan</SubmitButton>}
      <p aria-live="polite" className={cx('min-h-[1rem] text-[11px] font-medium', state?.ok ? 'text-emerald-700' : 'text-rose-600')}>
        {state ? (state.ok ? state.message : state.error) : readOnly ? 'Read-only access.' : ''}
      </p>
    </form>
  )
}

/* ───────────────────────── Filters ───────────────────────── */

const RANGE_OPTIONS = [
  ['all', 'All time'],
  ['today', 'Last 24 hours'],
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
] as const

const SORT_OPTIONS = [
  ['recent', 'Recently updated'],
  ['created_desc', 'Newest first'],
  ['created_asc', 'Oldest first'],
  ['maturity_desc', 'Maturity score'],
] as const

/**
 * Filter bar that applies instantly: every change pushes new search params inside a
 * transition (old results stay visible, a spinner shows), search is debounced 300ms.
 */
export function FilterBar({ exportHref }: { exportHref: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentQ = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(currentQ)

  useEffect(() => setQuery(currentQ), [currentQ])

  const apply = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all' || (key === 'sort' && value === 'recent')) params.delete(key)
      else params.set(key, value)
    }
    params.delete('page')
    params.delete('selectedId')
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }))
  }

  useEffect(() => {
    if (query.trim() === currentQ) return
    const handle = setTimeout(() => apply({ q: query.trim() }), 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply is recreated per render; query is the trigger
  }, [query, currentQ])

  const selectField = (name: string, label: string, options: ReadonlyArray<readonly [string, string]>, fallback: string) => (
    <label className="block min-w-0">
      <span className={fieldLabel}>{label}</span>
      <select
        className={select}
        value={searchParams.get(name) ?? fallback}
        onChange={(e) => apply({ [name]: e.target.value })}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div
      role="search"
      aria-busy={isPending}
      className="grid gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))_auto] lg:items-end"
    >
      <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
        <span className={fieldLabel}>Search</span>
        <span className="relative block">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, company, email, summary…"
            maxLength={100}
            className={cx(input, 'pl-9 pr-9')}
          />
          {isPending && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent"
            />
          )}
        </span>
      </label>
      {selectField('range', 'Range', RANGE_OPTIONS, 'all')}
      {selectField('status', 'Status', [['all', 'All statuses'], ...statusOptions.map((s) => [s, formatLabel(s)] as const)], 'all')}
      {selectField('quality', 'Quality', [['all', 'All quality'], ...['hot', 'warm', 'cold', 'unknown'].map((s) => [s, formatLabel(s)] as const)], 'all')}
      {selectField('urgency', 'Urgency', [['all', 'All urgency'], ...['high', 'medium', 'low', 'unknown'].map((s) => [s, formatLabel(s)] as const)], 'all')}
      {selectField('sort', 'Sort by', SORT_OPTIONS, 'recent')}
      <a href={exportHref} className={cx(btnSecondary, 'h-10')} download>
        <Icon name="download" className="h-4 w-4" />
        Export CSV
      </a>
    </div>
  )
}

/** @deprecated Search is built into FilterBar. Kept for backwards compatibility. */
export function DebouncedSearchInput({ defaultValue = '', placeholder = 'Search…' }: { defaultValue?: string; placeholder?: string }) {
  return <input name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className={input} />
}

/* ───────────────────────── Pagination ───────────────────────── */

function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: Array<number | 'gap'> = [1]
  if (page > 3) pages.push('gap')
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
  if (page < totalPages - 2) pages.push('gap')
  pages.push(totalPages)
  return pages
}

export function PaginationControls({ pagination }: { pagination: PaginationMeta }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { page, limit, totalRecords, filteredRecords, totalPages, hasPrevPage, hasNextPage } = pagination

  if (filteredRecords === 0) return null

  const href = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (target <= 1) params.delete('page')
    else params.set('page', String(target))
    return `${pathname}?${params.toString()}`
  }

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, filteredRecords)
  const pill = 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition-colors'
  const idle = cx(pill, 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
  const disabled = cx(pill, 'border border-slate-100 bg-slate-50 text-slate-300')

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-900">{start.toLocaleString()}–{end.toLocaleString()}</span> of{' '}
        <span className="font-semibold text-slate-900">{filteredRecords.toLocaleString()}</span>
        {totalRecords !== filteredRecords && <span className="text-slate-400"> (filtered from {totalRecords.toLocaleString()})</span>}
      </p>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
        {hasPrevPage ? (
          <Link href={href(page - 1)} scroll={false} className={idle} aria-label="Previous page">
            ‹ Prev
          </Link>
        ) : (
          <span className={disabled} aria-disabled="true">‹ Prev</span>
        )}
        {pageList(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-400" aria-hidden="true">…</span>
          ) : (
            <Link
              key={item}
              href={href(item)}
              scroll={false}
              aria-current={item === page ? 'page' : undefined}
              className={item === page ? cx(pill, 'bg-[#0052ff] text-white') : idle}
            >
              {item}
            </Link>
          )
        )}
        {hasNextPage ? (
          <Link href={href(page + 1)} scroll={false} className={idle} aria-label="Next page">
            Next ›
          </Link>
        ) : (
          <span className={disabled} aria-disabled="true">Next ›</span>
        )}
      </nav>
    </div>
  )
}
