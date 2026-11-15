import type { Document } from 'mongodb'
import { buildRlsQuery } from '@/lib/security/row-level-security'
import type { DashboardAccessScope } from '@/lib/auth/types'
import type { DashboardFilters, DashboardSort } from './types'

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100
export const TRANSCRIPT_PREVIEW_SIZE = 6
const MAX_SEARCH_LENGTH = 100

export const CLOSED_STATUSES = ['won', 'lost'] as const
export const PIPELINE_STATUSES = ['qualified', 'proposal', 'won'] as const

const ALLOWED_STATUS = new Set(['new', 'reviewing', 'qualified', 'proposal', 'won', 'lost'])
const ALLOWED_QUALITY = new Set(['hot', 'warm', 'cold', 'unknown'])
const ALLOWED_URGENCY = new Set(['high', 'medium', 'low', 'unknown'])
const ALLOWED_RANGE = new Set(['all', 'today', '7', '30', '90'])

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

function allowed(value: string | undefined, set: Set<string>): string | undefined {
  return value && set.has(value) ? value : undefined
}

export function resolveSort(sort?: string): DashboardSort {
  if (sort === 'created_desc' || sort === 'created_asc' || sort === 'maturity_desc') return sort
  // Legacy aliases kept so old bookmarked URLs keep working.
  if (sort === 'score' || sort === 'quality_desc') return 'maturity_desc'
  return 'recent'
}

/** Sort specs always end on _id so skip/limit pagination is stable. */
export function sortSpec(sort: DashboardSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'created_desc':
      return { createdAt: -1, _id: -1 }
    case 'created_asc':
      return { createdAt: 1, _id: 1 }
    case 'maturity_desc':
      return { maturityScore: -1, updatedAt: -1, _id: -1 }
    default:
      return { updatedAt: -1, _id: -1 }
  }
}

/** Normalizes untrusted URL filters into a known-good shape. */
export function normalizeFilters(filters: DashboardFilters): Required<
  Pick<DashboardFilters, 'range'>
> & {
  q?: string
  status?: string
  quality?: string
  urgency?: string
  page: number
  limit: number
  sort: DashboardSort
  selectedId?: string
} {
  const q = typeof filters.q === 'string' ? filters.q.trim().slice(0, MAX_SEARCH_LENGTH) : ''
  return {
    q: q || undefined,
    status: allowed(filters.status, ALLOWED_STATUS),
    quality: allowed(filters.quality, ALLOWED_QUALITY),
    urgency: allowed(filters.urgency, ALLOWED_URGENCY),
    range: allowed(filters.range, ALLOWED_RANGE) ?? 'all',
    page: Math.max(1, Math.floor(Number(filters.page) || 1)),
    limit: Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(Number(filters.limit) || DEFAULT_PAGE_SIZE))),
    sort: resolveSort(filters.sort),
    selectedId: filters.selectedId,
  }
}

export function rangeStartDate(range: string | undefined, now = Date.now()): Date | null {
  if (!range || range === 'all') return null
  const days = range === 'today' ? 1 : Number(range)
  if (!Number.isFinite(days) || days <= 0) return null
  return new Date(now - days * 24 * 60 * 60 * 1000)
}

/**
 * Builds the tenant-scoped MongoDB filter for the current view.
 *
 * Range uses `updatedAt` only: every record sets updatedAt >= createdAt, so
 * "created OR updated since X" is equivalent to "updated since X" — and a single-field
 * predicate can use the { tenant.id, updatedAt } index instead of an $or scan.
 */
export function buildFilterQuery(
  rawFilters: DashboardFilters,
  scope: DashboardAccessScope | undefined,
  storeTenantId?: string
): Document {
  const filters = normalizeFilters(rawFilters)
  const query: Document = {}

  const since = rangeStartDate(filters.range)
  if (since) query.updatedAt = { $gte: since }

  if (filters.status) query.status = filters.status
  if (filters.quality) query['classification.leadQuality'] = filters.quality
  if (filters.urgency) query['requirement.urgency'] = filters.urgency

  if (filters.q) {
    const reg = { $regex: escapeRegex(filters.q), $options: 'i' }
    query.$or = [
      'lead.name',
      'lead.company',
      'lead.email',
      'lead.phone',
      'lead.country',
      'lead.purpose',
      'summary.text',
      'callSummary.summary',
      'classification.category',
      'classification.intent',
    ].map((field) => ({ [field]: reg }))
  }

  // Row-level security: tenant users are strictly bound to their own tenant id.
  return buildRlsQuery(query, scope, storeTenantId)
}

export function hasActiveFilters(rawFilters: DashboardFilters): boolean {
  const f = normalizeFilters(rawFilters)
  return Boolean(f.q || f.status || f.quality || f.urgency || f.range !== 'all')
}

/** Fields needed to render list rows. The transcript is sliced to a preview server-side. */
export const LIST_PROJECTION = {
  tenant: 1,
  lead: 1,
  user: 1,
  hasLead: 1,
  requirement: 1,
  classification: 1,
  maturityScore: 1,
  maturityLabel: 1,
  summary: 1,
  callSummary: 1,
  transcript: { $slice: ['$transcript', TRANSCRIPT_PREVIEW_SIZE] },
  messageCount: { $ifNull: ['$messageCount', { $size: { $ifNull: ['$transcript', []] } }] },
  status: 1,
  email: 1,
  finalizedAt: 1,
  owner: 1,
  followUpAt: 1,
  notes: 1,
  statusHistory: { $slice: [{ $ifNull: ['$statusHistory', []] }, -5] },
  createdAt: 1,
  updatedAt: 1,
} as const

/** Fields needed for the selected lead workspace (full transcript). */
export const DETAIL_PROJECTION = {
  transcript: 1,
  messageCount: 1,
  tenant: 1,
  lead: 1,
  user: 1,
  hasLead: 1,
  requirement: 1,
  classification: 1,
  maturityScore: 1,
  maturityLabel: 1,
  summary: 1,
  callSummary: 1,
  status: 1,
  email: 1,
  finalizedAt: 1,
  owner: 1,
  followUpAt: 1,
  notes: 1,
  statusHistory: 1,
  createdAt: 1,
  updatedAt: 1,
} as const

/** Fields needed for CSV export (no transcript). */
export const EXPORT_PROJECTION = {
  tenant: 1,
  lead: 1,
  user: 1,
  requirement: 1,
  classification: 1,
  maturityScore: 1,
  maturityLabel: 1,
  summary: 1,
  callSummary: 1,
  status: 1,
  email: 1,
  owner: 1,
  followUpAt: 1,
  notes: 1,
  createdAt: 1,
  updatedAt: 1,
} as const
