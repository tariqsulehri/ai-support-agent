import { ObjectId, type Collection, type Document } from 'mongodb'
import {
  conversationCollection,
  getConversationStoresForScope,
  type ConversationStore,
} from '@/lib/db/conversation-store'
import { buildRlsQuery, filterRecordsByRls } from '@/lib/security/row-level-security'
import type { DashboardAccessScope } from '@/lib/auth/types'
import { buildRecommendations, buildRiskSignals, conversionReadiness } from './insights'
import { toDashboardCall } from './mapper'
import {
  CLOSED_STATUSES,
  DETAIL_PROJECTION,
  EXPORT_PROJECTION,
  LIST_PROJECTION,
  PIPELINE_STATUSES,
  buildFilterQuery,
  hasActiveFilters,
  normalizeFilters,
  sortSpec,
} from './query'
import type {
  CountItem,
  DashboardAnalytics,
  DashboardAnalyticsOptions,
  DashboardCall,
  DashboardFilters,
  DashboardSections,
  DashboardSignalCounts,
  PaginationMeta,
  RawRecord,
} from './types'

// Re-export the public types so existing imports from '@/lib/dashboard/analytics' keep working.
export type {
  CountItem,
  DashboardAnalytics,
  DashboardAnalyticsOptions,
  DashboardCall,
  DashboardFilters,
  DashboardSections,
  PaginationMeta,
} from './types'
export { toDashboardCall } from './mapper'

const ALL_SECTIONS: Required<DashboardSections> = {
  list: true,
  aggregates: true,
  followUps: true,
  followUpQueue: true,
  selected: true,
}

const FOLLOW_UP_QUEUE_SIZE = 10
const EXPORT_MAX_ROWS = 50_000
const FAR_FUTURE = new Date('9999-12-31T00:00:00Z')

function emptyPagination(page = 1, limit = 10): PaginationMeta {
  return {
    page,
    limit,
    totalRecords: 0,
    filteredRecords: 0,
    totalPages: 1,
    hasPrevPage: page > 1,
    hasNextPage: false,
  }
}

function emptyAnalytics(configured: boolean): DashboardAnalytics {
  return {
    configured,
    generatedAt: new Date().toISOString(),
    totalCalls: 0,
    filteredCalls: 0,
    pagination: emptyPagination(),
    callsWithLead: 0,
    hotLeads: 0,
    qualifiedPipeline: 0,
    emailSent: 0,
    emailFailures: 0,
    averageMessages: 0,
    conversionReadiness: 0,
    openFollowUps: 0,
    overdueFollowUps: 0,
    selectedCall: null,
    recentCalls: [],
    statusCounts: [],
    leadQualityCounts: [],
    monthlyCallVolume: [],
    intentCounts: [],
    urgencyCounts: [],
    sentimentCounts: [],
    categoryCounts: [],
    serviceCounts: [],
    topCountries: [],
    aiRecommendations: [],
    riskSignals: [],
    followUpQueue: [],
  }
}

async function primaryStore(scope?: DashboardAccessScope): Promise<ConversationStore | null> {
  // getConversationStoresForScope returns at most one store (internal platform DB, or the
  // tenant's own DB as a fallback), so the dashboard works against a single collection.
  const stores = await getConversationStoresForScope(scope)
  return stores[0] ?? null
}

/** Unfiltered total. Uses collection metadata for the platform-wide count (O(1)). */
async function countTotal(
  col: Collection<RawRecord>,
  scope: DashboardAccessScope | undefined,
  storeTenantId?: string
): Promise<number> {
  const query = buildRlsQuery({}, scope, storeTenantId)
  if (Object.keys(query).length === 0) return col.estimatedDocumentCount()
  return col.countDocuments(query)
}

async function fetchPage(
  col: Collection<RawRecord>,
  filterQuery: Document,
  sort: Record<string, 1 | -1>,
  skip: number,
  limit: number
): Promise<RawRecord[]> {
  return col
    .aggregate<RawRecord>([
      { $match: filterQuery },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      { $project: LIST_PROJECTION },
    ])
    .toArray()
}

type FacetBucket = { _id: string | null; count: number }
type FacetResult = {
  kpis: Array<Omit<DashboardSignalCounts, 'averageMessages'> & { totalMessages: number }>
  statuses: FacetBucket[]
  qualities: FacetBucket[]
  intents: FacetBucket[]
  urgencies: FacetBucket[]
  sentiments: FacetBucket[]
  categories: FacetBucket[]
  services: FacetBucket[]
  countries: FacetBucket[]
  monthly: Array<{ _id: { year: number; month: number }; count: number }>
}

function topN(field: string, n = 8): Document[] {
  return [{ $group: { _id: field, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: n }]
}

const sumIf = (cond: Document) => ({ $sum: { $cond: [cond, 1, 0] } })

async function fetchAggregates(col: Collection<RawRecord>, filterQuery: Document): Promise<FacetResult | null> {
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const isOpen = { $not: [{ $in: ['$status', [...CLOSED_STATUSES]] }] }

  const [result] = await col
    .aggregate<FacetResult>([
      { $match: filterQuery },
      // Narrow the document before $facet so each sub-pipeline handles small objects.
      {
        $project: {
          _id: 0,
          status: 1,
          hasLead: 1,
          createdAt: 1,
          quality: '$classification.leadQuality',
          intent: '$classification.intent',
          sentiment: '$classification.sentiment',
          category: '$classification.category',
          urgency: '$requirement.urgency',
          services: '$requirement.servicesInterested',
          country: '$lead.country',
          emailSent: '$email.sent',
          emailError: '$email.error',
          messages: { $ifNull: ['$messageCount', { $size: { $ifNull: ['$transcript', []] } }] },
        },
      },
      {
        $facet: {
          kpis: [
            {
              $group: {
                _id: null,
                filteredCalls: { $sum: 1 },
                callsWithLead: sumIf({ $eq: ['$hasLead', true] }),
                hotLeads: sumIf({ $eq: ['$quality', 'hot'] }),
                hotOpen: sumIf({ $and: [{ $eq: ['$quality', 'hot'] }, isOpen] }),
                highUrgencyOpen: sumIf({ $and: [{ $eq: ['$urgency', 'high'] }, isOpen] }),
                qualifiedPipeline: sumIf({ $in: ['$status', [...PIPELINE_STATUSES]] }),
                emailSent: sumIf({ $eq: ['$emailSent', true] }),
                emailFailures: sumIf({ $gt: [{ $ifNull: ['$emailError', ''] }, ''] }),
                negativeSentiment: sumIf({ $eq: ['$sentiment', 'negative'] }),
                complaints: sumIf({ $eq: ['$intent', 'complaint'] }),
                staleNew: sumIf({ $and: [{ $eq: ['$status', 'new'] }, { $lt: ['$createdAt', staleBefore] }] }),
                totalMessages: { $sum: '$messages' },
              },
            },
          ],
          statuses: topN('$status'),
          qualities: topN('$quality'),
          intents: topN('$intent'),
          urgencies: topN('$urgency'),
          sentiments: topN('$sentiment'),
          categories: topN('$category'),
          services: [{ $unwind: '$services' }, ...topN('$services')],
          countries: [{ $match: { country: { $nin: [null, ''] } } }, ...topN('$country', 6)],
          monthly: [
            { $match: { createdAt: { $type: 'date' } } },
            {
              $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            // Latest six months, returned newest-first and reversed for display below.
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 },
          ],
        },
      },
    ])
    .toArray()

  return result ?? null
}

async function fetchFollowUpQueue(col: Collection<RawRecord>, baseQuery: Document): Promise<RawRecord[]> {
  return col
    .aggregate<RawRecord>([
      {
        $match: {
          ...baseQuery,
          status: { $nin: [...CLOSED_STATUSES] },
          $or: [
            { 'classification.leadQuality': 'hot' },
            { 'requirement.urgency': 'high' },
            { followUpAt: { $type: 'date' } },
          ],
        },
      },
      // Scheduled follow-ups first (soonest due), then unscheduled priority leads by recency.
      { $addFields: { _dueSort: { $ifNull: ['$followUpAt', FAR_FUTURE] } } },
      { $sort: { _dueSort: 1, updatedAt: -1, _id: -1 } },
      { $limit: FOLLOW_UP_QUEUE_SIZE },
      { $project: LIST_PROJECTION },
    ])
    .toArray()
}

async function fetchFollowUpCounts(
  col: Collection<RawRecord>,
  baseQuery: Document
): Promise<{ open: number; overdue: number }> {
  const openQuery: Document = { ...baseQuery, followUpAt: { $type: 'date' }, status: { $nin: [...CLOSED_STATUSES] } }
  const [open, overdue] = await Promise.all([
    col.countDocuments(openQuery),
    col.countDocuments({ ...openQuery, followUpAt: { $lt: new Date() } }),
  ])
  return { open, overdue }
}

async function fetchSelected(
  col: Collection<RawRecord>,
  selectedId: string | undefined,
  scope: DashboardAccessScope | undefined,
  storeTenantId?: string
): Promise<RawRecord | null> {
  if (!selectedId || !ObjectId.isValid(selectedId)) return null
  return col.findOne(buildRlsQuery({ _id: new ObjectId(selectedId) }, scope, storeTenantId), {
    projection: DETAIL_PROJECTION,
  })
}

function buckets(items: FacetBucket[] | undefined, fallback: string): CountItem[] {
  return (items ?? []).map((item) => ({ label: item._id || fallback, count: item.count }))
}

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })

/** Settled helper: a failing optional section logs and degrades instead of failing the page. */
async function settle<T>(label: string, promise: Promise<T> | null, fallback: T): Promise<T> {
  if (!promise) return fallback
  try {
    return await promise
  } catch (err) {
    console.warn(`[dashboard:analytics] ${label} failed`, err instanceof Error ? err.message : err)
    return fallback
  }
}

/**
 * Dashboard analytics. All MongoDB round-trips run in parallel and only the
 * requested sections are computed, so lightweight tabs never pay for heavy
 * aggregations. Every KPI is derived from the full filtered set.
 */
export async function getDashboardAnalytics(
  rawFilters: DashboardFilters = {},
  options: DashboardAnalyticsOptions = {}
): Promise<DashboardAnalytics> {
  const sections = { ...ALL_SECTIONS, ...options.sections }
  const filters = normalizeFilters(rawFilters)

  let store: ConversationStore | null
  try {
    store = await primaryStore(options.scope)
  } catch (err) {
    console.error('[dashboard:analytics] store unavailable', err)
    return emptyAnalytics(false)
  }
  if (!store) return emptyAnalytics(false)

  const scope = options.scope
  const col = conversationCollection<RawRecord>(store)
  const filterQuery = buildFilterQuery(rawFilters, scope, store.tenantId)
  const baseQuery = buildRlsQuery({}, scope, store.tenantId)
  const filtered = hasActiveFilters(rawFilters)
  const skip = (filters.page - 1) * filters.limit

  try {
    const [totalCalls, filteredCount, pageDocs, facet, queueDocs, followUpCounts, selectedDoc] = await Promise.all([
      countTotal(col, scope, store.tenantId),
      // Skip the second count when no filters are applied: filtered == total.
      filtered ? col.countDocuments(filterQuery) : null,
      sections.list ? fetchPage(col, filterQuery, sortSpec(filters.sort), skip, filters.limit) : [],
      settle('aggregates', sections.aggregates ? fetchAggregates(col, filterQuery) : null, null),
      settle('follow-up queue', sections.followUpQueue ? fetchFollowUpQueue(col, baseQuery) : null, [] as RawRecord[]),
      settle('follow-up counts', sections.followUps ? fetchFollowUpCounts(col, baseQuery) : null, { open: 0, overdue: 0 }),
      settle('selected record', sections.selected ? fetchSelected(col, filters.selectedId, scope, store.tenantId) : null, null),
    ])

    const filteredCalls = filteredCount ?? totalCalls
    // Defense in depth: drop anything that does not belong to the caller's tenant.
    const recentCalls = filterRecordsByRls(pageDocs, scope).map(toDashboardCall)
    const followUpQueue = filterRecordsByRls(queueDocs, scope).map(toDashboardCall)
    const selectedCall =
      (selectedDoc && filterRecordsByRls([selectedDoc], scope)[0]
        ? toDashboardCall(selectedDoc)
        : null) ?? recentCalls[0] ?? null

    const totalPages = Math.max(1, Math.ceil(filteredCalls / filters.limit))
    const pagination: PaginationMeta = {
      page: filters.page,
      limit: filters.limit,
      totalRecords: totalCalls,
      filteredRecords: filteredCalls,
      totalPages,
      hasPrevPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    }

    const kpi = facet?.kpis[0]
    const signals: DashboardSignalCounts = {
      filteredCalls,
      callsWithLead: kpi?.callsWithLead ?? 0,
      hotLeads: kpi?.hotLeads ?? 0,
      hotOpen: kpi?.hotOpen ?? 0,
      highUrgencyOpen: kpi?.highUrgencyOpen ?? 0,
      qualifiedPipeline: kpi?.qualifiedPipeline ?? 0,
      emailSent: kpi?.emailSent ?? 0,
      emailFailures: kpi?.emailFailures ?? 0,
      negativeSentiment: kpi?.negativeSentiment ?? 0,
      complaints: kpi?.complaints ?? 0,
      staleNew: kpi?.staleNew ?? 0,
      averageMessages: kpi && filteredCalls ? Math.round((kpi.totalMessages / filteredCalls) * 10) / 10 : 0,
    }

    return {
      configured: true,
      generatedAt: new Date().toISOString(),
      totalCalls,
      filteredCalls,
      pagination,
      callsWithLead: signals.callsWithLead,
      hotLeads: signals.hotLeads,
      qualifiedPipeline: signals.qualifiedPipeline,
      emailSent: signals.emailSent,
      emailFailures: signals.emailFailures,
      averageMessages: signals.averageMessages,
      conversionReadiness: conversionReadiness(signals),
      openFollowUps: followUpCounts.open,
      overdueFollowUps: followUpCounts.overdue,
      selectedCall,
      recentCalls,
      statusCounts: buckets(facet?.statuses, 'unknown'),
      leadQualityCounts: buckets(facet?.qualities, 'unknown'),
      intentCounts: buckets(facet?.intents, 'other'),
      urgencyCounts: buckets(facet?.urgencies, 'unknown'),
      sentimentCounts: buckets(facet?.sentiments, 'neutral'),
      categoryCounts: buckets(facet?.categories, 'other'),
      serviceCounts: buckets(facet?.services, 'other'),
      topCountries: buckets(facet?.countries, 'unknown'),
      monthlyCallVolume: (facet?.monthly ?? [])
        .slice()
        .reverse()
        .map((m) => ({
          label: monthFormatter.format(new Date(Date.UTC(m._id.year, (m._id.month || 1) - 1, 15))),
          count: m.count,
        })),
      aiRecommendations: facet ? buildRecommendations(signals) : [],
      riskSignals: facet ? buildRiskSignals(signals) : [],
      followUpQueue,
    }
  } catch (err) {
    console.error('[dashboard:analytics] query failed', err)
    return emptyAnalytics(true)
  }
}

/**
 * Streams every record matching the filters (capped) for CSV export.
 * Uses a cursor with a narrow projection so memory stays flat.
 */
export async function* iterateDashboardExport(
  rawFilters: DashboardFilters,
  scope: DashboardAccessScope | undefined,
  maxRows = EXPORT_MAX_ROWS
): AsyncGenerator<DashboardCall> {
  const store = await primaryStore(scope)
  if (!store) return

  const filters = normalizeFilters(rawFilters)
  const cursor = conversationCollection<RawRecord>(store)
    .find(buildFilterQuery(rawFilters, scope, store.tenantId), { projection: EXPORT_PROJECTION })
    .sort(sortSpec(filters.sort))
    .limit(maxRows)
    .batchSize(1000)

  try {
    for await (const doc of cursor) {
      if (filterRecordsByRls([doc], scope).length === 0) continue
      yield toDashboardCall(doc)
    }
  } finally {
    await cursor.close()
  }
}
