import { ObjectId, type Document } from 'mongodb'
import { conversationCollection, getConversationStoresForScope, type ConversationStore } from '@/lib/db/conversation-store'
import { buildRlsQuery, filterRecordsByRls } from '@/lib/security/row-level-security'
import { calculateMaturityScore } from '@/lib/ai/maturity-score'
import type { DashboardAccessScope } from '@/lib/auth/types'
import type {
  ChatHistory,
  ConversationIntent,
  ConversationSentiment,
  ConversationUrgency,
  LeadData,
  LeadQuality,
} from '@/types'

export type CountItem = {
  label: string
  count: number
}

export type PaginationMeta = {
  page: number
  limit: number
  totalRecords: number
  filteredRecords: number
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

export type DashboardCall = {
  id: string
  tenantId: string
  companyName: string
  lead: LeadData
  status: string
  leadQuality: LeadQuality | 'unknown'
  intent: ConversationIntent | 'other'
  urgency: ConversationUrgency
  sentiment: ConversationSentiment
  category: string
  servicesInterested: string[]
  summary: string
  keyPoints: string[]
  nextSteps: string[]
  transcript: ChatHistory
  emailSent: boolean
  emailError: string | null
  finalizedAt: string | null
  owner: string | null
  followUpAt: string | null
  notes: string | null
  statusHistory: Array<{ status: string; changedAt: string }>
  createdAt: string
  updatedAt: string
  maturityScore: number // 1 to 5 stars
  maturityLabel: string
}

export type DashboardFilters = {
  q?: string
  status?: string
  quality?: string
  urgency?: string
  range?: string
  selectedId?: string
  page?: number | string
  limit?: number | string
  sort?: string
}

export type DashboardAnalyticsOptions = {
  scope?: DashboardAccessScope
}

export type DashboardAnalytics = {
  configured: boolean
  generatedAt: string
  totalCalls: number
  filteredCalls: number
  pagination: PaginationMeta
  callsWithLead: number
  hotLeads: number
  qualifiedPipeline: number
  emailSent: number
  emailFailures: number
  averageMessages: number
  conversionReadiness: number
  openFollowUps: number
  overdueFollowUps: number
  selectedCall: DashboardCall | null
  recentCalls: DashboardCall[]
  statusCounts: CountItem[]
  leadQualityCounts: CountItem[]
  monthlyCallVolume: CountItem[]
  intentCounts: CountItem[]
  urgencyCounts: CountItem[]
  sentimentCounts: CountItem[]
  categoryCounts: CountItem[]
  serviceCounts: CountItem[]
  topCountries: CountItem[]
  aiRecommendations: string[]
  riskSignals: string[]
  followUpQueue: DashboardCall[]
}

type RawRecord = Document & {
  _id: { toString(): string }
  tenant?: {
    id?: string
    companyName?: string
  }
  lead?: Partial<LeadData>
  user?: Partial<LeadData>
  hasLead?: boolean
  requirement?: {
    servicesInterested?: string[]
    urgency?: ConversationUrgency
  } | null
  classification?: {
    category?: string
    intent?: ConversationIntent
    leadQuality?: LeadQuality
    sentiment?: ConversationSentiment
  } | null
  maturityScore?: number
  maturityLabel?: string
  summary?: {
    text?: string
    keyPoints?: string[]
  }
  callSummary?: {
    summary?: string
    keyPoints?: string[]
    nextSteps?: string[]
  }
  transcript?: ChatHistory
  status?: string
  email?: {
    sent?: boolean
    error?: string
  } | null
  owner?: string | null
  followUpAt?: Date | null
  notes?: string | null
  statusHistory?: Array<{ status?: string; changedAt?: Date }>
  createdAt?: Date
  updatedAt?: Date
  finalizedAt?: Date
}

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  totalRecords: 0,
  filteredRecords: 0,
  totalPages: 1,
  hasPrevPage: false,
  hasNextPage: false,
}

const EMPTY_ANALYTICS: DashboardAnalytics = {
  configured: false,
  generatedAt: new Date().toISOString(),
  totalCalls: 0,
  filteredCalls: 0,
  pagination: EMPTY_PAGINATION,
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

function normalizeLead(input: Partial<LeadData> | undefined): LeadData {
  return {
    name: input?.name ?? null,
    email: input?.email ?? null,
    phone: input?.phone ?? null,
    company: input?.company ?? null,
    country: input?.country ?? null,
    purpose: input?.purpose ?? null,
  }
}

function hasLead(lead: LeadData): boolean {
  return Object.values(lead).some((value) => Boolean(value?.trim()))
}

function safeDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function dateString(value: unknown): string {
  const d = safeDate(value)
  return (d ?? new Date(0)).toISOString()
}

function optionalDateString(value: unknown): string | null {
  const d = safeDate(value)
  return d ? d.toISOString() : null
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

export function toDashboardCall(record: RawRecord): DashboardCall {
  const lead = normalizeLead(record.lead ?? record.user)
  const classification = record.classification
  const requirement = record.requirement

  const maturity =
    typeof record.maturityScore === 'number' && record.maturityLabel
      ? { score: record.maturityScore as 1 | 2 | 3 | 4 | 5, label: record.maturityLabel }
      : calculateMaturityScore({
          status: record.status,
          leadQuality: classification?.leadQuality,
          urgency: requirement?.urgency,
          sentiment: classification?.sentiment,
          lead,
          messageCount: Array.isArray(record.transcript) ? record.transcript.length : 0,
          hasLead: record.hasLead ?? hasLead(lead),
        })

  return {
    id: record._id.toString(),
    tenantId: record.tenant?.id ?? 'unknown',
    companyName: record.tenant?.companyName ?? 'Unknown tenant',
    lead,
    status: record.status?.trim() || 'new',
    leadQuality: classification?.leadQuality ?? 'unknown',
    intent: classification?.intent ?? 'other',
    urgency: requirement?.urgency ?? 'unknown',
    sentiment: classification?.sentiment ?? 'neutral',
    category: classification?.category ?? 'other',
    servicesInterested: requirement?.servicesInterested ?? [],
    summary: record.callSummary?.summary ?? record.summary?.text ?? 'No summary captured.',
    keyPoints: record.callSummary?.keyPoints ?? record.summary?.keyPoints ?? [],
    nextSteps: record.callSummary?.nextSteps ?? [],
    transcript: record.transcript ?? [],
    emailSent: Boolean(record.email?.sent),
    emailError: record.email?.error ?? null,
    finalizedAt: optionalDateString(record.finalizedAt),
    owner: record.owner?.trim() || null,
    followUpAt: optionalDateString(record.followUpAt),
    notes: record.notes?.trim() || null,
    statusHistory: (record.statusHistory ?? []).map((item) => ({
      status: item.status ?? 'unknown',
      changedAt: dateString(item.changedAt),
    })),
    createdAt: dateString(record.createdAt),
    updatedAt: dateString(record.updatedAt),
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
  }
}

function rangeStartDate(range: string | undefined): Date | null {
  if (!range || range === 'all') return null

  const days = range === 'today' ? 1 : Number(range)
  if (!Number.isFinite(days)) return null

  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function buildStoreQuery(
  store: ConversationStore,
  filters: DashboardFilters,
  scope: DashboardAccessScope | undefined
): Document {
  const baseFilter: Document = {}
  const createdAfter = rangeStartDate(filters.range)
  const conditions: Document[] = []

  if (createdAfter) {
    conditions.push({
      $or: [
        { createdAt: { $gte: createdAfter } },
        { updatedAt: { $gte: createdAfter } },
      ],
    })
  }

  if (filters.q?.trim()) {
    const reg = { $regex: escapeRegex(filters.q.trim()), $options: 'i' }
    conditions.push({
      $or: [
        { 'lead.name': reg },
        { 'lead.company': reg },
        { 'lead.email': reg },
        { 'lead.phone': reg },
        { 'lead.country': reg },
        { 'lead.purpose': reg },
        { 'summary.text': reg },
        { 'callSummary.summary': reg },
        { 'classification.category': reg },
        { 'classification.intent': reg },
      ],
    })
  }

  if (conditions.length === 1) {
    const [single] = conditions
    if (single.$or) baseFilter.$or = single.$or
    else Object.assign(baseFilter, single)
  } else if (conditions.length > 1) {
    baseFilter.$and = conditions
  }

  if (filters.status && filters.status !== 'all') baseFilter.status = filters.status
  if (filters.quality && filters.quality !== 'all') baseFilter['classification.leadQuality'] = filters.quality
  if (filters.urgency && filters.urgency !== 'all') baseFilter['requirement.urgency'] = filters.urgency

  // Enforce Row-Level Security: tenant users are strictly bound to scope.tenantId
  return buildRlsQuery(baseFilter, scope, store.tenantId)
}

const DASHBOARD_RECORD_PROJECTION = {
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
  transcript: 1,
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

function buildRecommendations(
  calls: DashboardCall[],
  analytics: Pick<DashboardAnalytics, 'totalCalls' | 'callsWithLead' | 'hotLeads' | 'emailFailures' | 'averageMessages'>
): string[] {
  if (analytics.totalCalls === 0) {
    return ['No communications are available yet. Start by validating call capture, MongoDB persistence, and email notifications end to end.']
  }

  const recommendations: string[] = []
  const hotOpen = calls.filter((call) => call.leadQuality === 'hot' && !['won', 'lost'].includes(call.status))
  const highUrgency = calls.filter((call) => call.urgency === 'high' && !['won', 'lost'].includes(call.status))
  const leadCaptureRate = Math.round((analytics.callsWithLead / (analytics.totalCalls || 1)) * 100)

  if (hotOpen.length > 0) {
    recommendations.push(`Prioritize ${hotOpen.length} hot lead${hotOpen.length === 1 ? '' : 's'} still outside won/lost status; assign owner follow-up within the same business day.`)
  }
  if (highUrgency.length > 0) {
    recommendations.push(`${highUrgency.length} high-urgency conversation${highUrgency.length === 1 ? '' : 's'} need executive visibility because timeline pressure was detected.`)
  }
  if (leadCaptureRate < 70) {
    recommendations.push(`Lead capture rate is ${leadCaptureRate}%. Tighten the agent prompt around name, email, phone, company, and buying purpose before closing calls.`)
  }
  if (analytics.emailFailures > 0) {
    recommendations.push(`${analytics.emailFailures} summary email${analytics.emailFailures === 1 ? '' : 's'} failed. Review SMTP credentials and recipient rules so managers receive every call recap.`)
  }
  if (analytics.averageMessages < 4) {
    recommendations.push('Average conversation depth is low. Review greeting and discovery questions to increase qualification quality.')
  }

  return recommendations.slice(0, 5)
}

function buildRiskSignals(calls: DashboardCall[]): string[] {
  const risks: string[] = []
  const negative = calls.filter((call) => call.sentiment === 'negative')
  const complaints = calls.filter((call) => call.intent === 'complaint')
  const staleNew = calls.filter((call) => {
    const ageMs = Date.now() - new Date(call.createdAt).getTime()
    return call.status === 'new' && ageMs > 24 * 60 * 60 * 1000
  })
  const emailErrors = calls.filter((call) => call.emailError)

  if (negative.length) risks.push(`${negative.length} conversation${negative.length === 1 ? '' : 's'} had negative sentiment and should be reviewed for service recovery.`)
  if (complaints.length) risks.push(`${complaints.length} complaint-intent communication${complaints.length === 1 ? '' : 's'} may require escalation.`)
  if (staleNew.length) risks.push(`${staleNew.length} new lead${staleNew.length === 1 ? ' is' : 's are'} older than 24 hours without pipeline movement.`)
  if (emailErrors.length) risks.push(`${emailErrors.length} record${emailErrors.length === 1 ? '' : 's'} show email delivery errors, which can hide important opportunities from leadership.`)

  return risks.length ? risks.slice(0, 5) : ['No major risk signals detected in the current communication set.']
}

function resolveSortSpec(sortKey?: string): Document {
  if (sortKey === 'created_desc') return { createdAt: -1 }
  if (sortKey === 'created_asc') return { createdAt: 1 }
  if (sortKey === 'maturity_desc') return { maturityScore: -1, updatedAt: -1 }
  if (sortKey === 'quality_desc') return { 'classification.leadQuality': 1, updatedAt: -1 }
  return { updatedAt: -1, createdAt: -1 }
}

/**
 * High-performance dashboard analytics and paginated records fetcher.
 * Uses index-backed COUNT queries, server-side aggregations, and pagination (default 10 records).
 * Can smoothly handle millions of records without high memory pressure or full-table scans.
 */
export async function getDashboardAnalytics(
  filters: DashboardFilters = {},
  options: DashboardAnalyticsOptions = {}
): Promise<DashboardAnalytics> {
  try {
    const stores = await getConversationStoresForScope(options.scope)
    if (stores.length === 0) return EMPTY_ANALYTICS

    // Enforce server-side pagination parameters (default 10 records per page)
    const page = Math.max(1, Math.floor(Number(filters.page) || 1))
    const limit = Math.max(1, Math.min(100, Math.floor(Number(filters.limit) || 10)))
    const skip = (page - 1) * limit
    const sortSpec = resolveSortSpec(filters.sort)

    let totalRecordsCount = 0
    let filteredRecordsCount = 0

    // 1. Parallel execution across stores: Counts and Paginated Query
    const storeResults = await Promise.allSettled(
      stores.map(async (store) => {
        const col = conversationCollection<RawRecord>(store)

        // Query 1: Unfiltered scope query for total database count
        const scopeTotalQuery = buildStoreQuery(store, {}, options.scope)

        // Query 2: Filtered query for current view
        const filteredQuery = buildStoreQuery(store, filters, options.scope)

        // Parallel count queries directly on B-tree indexes
        const [storeTotalCount, storeFilteredCount, pagedDocs] = await Promise.all([
          col.countDocuments(scopeTotalQuery),
          col.countDocuments(filteredQuery),
          col
            .find(filteredQuery, { projection: DASHBOARD_RECORD_PROJECTION })
            .sort(sortSpec)
            .skip(skip)
            .limit(limit)
            .toArray(),
        ])

        return {
          storeTotalCount,
          storeFilteredCount,
          pagedDocs,
          store,
          filteredQuery,
        }
      })
    )

    const fulfilledStores = storeResults
      .flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))

    for (const r of fulfilledStores) {
      totalRecordsCount += r.storeTotalCount
      filteredRecordsCount += r.storeFilteredCount
    }

    const rawPagedDocs = fulfilledStores.flatMap((r) => r.pagedDocs)

    // Apply defense-in-depth RLS filtering
    const verifiedDocs = filterRecordsByRls(rawPagedDocs, options.scope)
    const recentCalls = verifiedDocs.slice(0, limit).map(toDashboardCall)

    // Calculate pagination metadata
    const totalPages = Math.max(1, Math.ceil(filteredRecordsCount / limit))
    const pagination: PaginationMeta = {
      page,
      limit,
      totalRecords: totalRecordsCount,
      filteredRecords: filteredRecordsCount,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    }

    // 2. Fetch Selected Call (Single indexed lookup if specified)
    let selectedCall: DashboardCall | null = null
    if (filters.selectedId && ObjectId.isValid(filters.selectedId)) {
      const matchInRecent = recentCalls.find((c) => c.id === filters.selectedId)
      if (matchInRecent) {
        selectedCall = matchInRecent
      } else {
        const targetId = new ObjectId(filters.selectedId)
        for (const { store } of fulfilledStores) {
          const doc = await conversationCollection<RawRecord>(store).findOne(
            buildRlsQuery({ _id: targetId }, options.scope, store.tenantId),
            { projection: DASHBOARD_RECORD_PROJECTION }
          )
          if (doc) {
            selectedCall = toDashboardCall(doc)
            break
          }
        }
      }
    }
    if (!selectedCall) {
      selectedCall = recentCalls[0] ?? null
    }

    // 3. Fast Server-Side Aggregations for Distributions & KPIs
    // We execute an aggregation pipeline on the primary store to calculate KPI counts
    let callsWithLead = 0
    let hotLeads = 0
    let qualifiedPipeline = 0
    let emailSent = 0
    let emailFailures = 0
    let openFollowUps = 0
    let overdueFollowUps = 0
    let averageMessages = 0
    let statusCounts: CountItem[] = []
    let leadQualityCounts: CountItem[] = []
    let monthlyCallVolume: CountItem[] = []
    let intentCounts: CountItem[] = []
    let urgencyCounts: CountItem[] = []
    let sentimentCounts: CountItem[] = []
    let categoryCounts: CountItem[] = []
    let serviceCounts: CountItem[] = []
    let topCountries: CountItem[] = []
    let followUpQueue: DashboardCall[] = []

    try {
      const primaryStore = stores[0]
      if (primaryStore) {
        const col = conversationCollection<RawRecord>(primaryStore)
        const filteredQuery = buildStoreQuery(primaryStore, filters, options.scope)

        const [facetResult, followUpDocs] = await Promise.all([
          col
            .aggregate<{
              kpis: Array<{
                callsWithLead: number
                hotLeads: number
                qualifiedPipeline: number
                emailSent: number
                emailFailures: number
                totalMessages: number
                totalRecords: number
              }>
              statuses: Array<{ _id: string; count: number }>
              qualities: Array<{ _id: string; count: number }>
              intents: Array<{ _id: string; count: number }>
              urgencies: Array<{ _id: string; count: number }>
              sentiments: Array<{ _id: string; count: number }>
              categories: Array<{ _id: string; count: number }>
              services: Array<{ _id: string; count: number }>
              countries: Array<{ _id: string; count: number }>
              monthly: Array<{ _id: { year: number; month: number }; count: number }>
            }>([
              { $match: filteredQuery },
              {
                $facet: {
                  kpis: [
                    {
                      $group: {
                        _id: null,
                        callsWithLead: { $sum: { $cond: [{ $eq: ['$hasLead', true] }, 1, 0] } },
                        hotLeads: { $sum: { $cond: [{ $eq: ['$classification.leadQuality', 'hot'] }, 1, 0] } },
                        qualifiedPipeline: {
                          $sum: {
                            $cond: [{ $in: ['$status', ['qualified', 'proposal', 'won']] }, 1, 0],
                          },
                        },
                        emailSent: { $sum: { $cond: [{ $eq: ['$email.sent', true] }, 1, 0] } },
                        emailFailures: {
                          $sum: { $cond: [{ $ifNull: ['$email.error', false] }, 1, 0] },
                        },
                        totalMessages: { $sum: { $size: { $ifNull: ['$transcript', []] } } },
                        totalRecords: { $sum: 1 },
                      },
                    },
                  ],
                  statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  qualities: [{ $group: { _id: '$classification.leadQuality', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  intents: [{ $group: { _id: '$classification.intent', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  urgencies: [{ $group: { _id: '$requirement.urgency', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  sentiments: [{ $group: { _id: '$classification.sentiment', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  categories: [{ $group: { _id: '$classification.category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  services: [{ $unwind: { path: '$requirement.servicesInterested', preserveNullAndEmptyArrays: false } }, { $group: { _id: '$requirement.servicesInterested', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }],
                  countries: [{ $group: { _id: '$lead.country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }],
                  monthly: [
                    {
                      $group: {
                        _id: {
                          year: { $year: '$createdAt' },
                          month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                      },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                    { $limit: 6 },
                  ],
                },
              },
            ])
            .toArray(),

          // Follow-up priority queue (top 10 records matching hot urgency or follow-up)
          col
            .find(
              buildRlsQuery(
                {
                  status: { $nin: ['won', 'lost'] },
                  $or: [
                    { 'classification.leadQuality': 'hot' },
                    { 'requirement.urgency': 'high' },
                    { followUpAt: { $ne: null } },
                  ],
                },
                options.scope,
                primaryStore.tenantId
              ),
              { projection: DASHBOARD_RECORD_PROJECTION }
            )
            .sort({ followUpAt: 1, updatedAt: -1 })
            .limit(10)
            .toArray(),
        ])

        const facet = facetResult[0]
        if (facet) {
          const kpi = facet.kpis[0]
          if (kpi) {
            callsWithLead = kpi.callsWithLead ?? 0
            hotLeads = kpi.hotLeads ?? 0
            qualifiedPipeline = kpi.qualifiedPipeline ?? 0
            emailSent = kpi.emailSent ?? 0
            emailFailures = kpi.emailFailures ?? 0
            const totalMsgs = kpi.totalMessages ?? 0
            averageMessages = filteredRecordsCount ? Math.round((totalMsgs / filteredRecordsCount) * 10) / 10 : 0
          }

          statusCounts = facet.statuses.map((s) => ({ label: s._id || 'unknown', count: s.count }))
          leadQualityCounts = facet.qualities.map((q) => ({ label: q._id || 'unknown', count: q.count }))
          intentCounts = facet.intents.map((i) => ({ label: i._id || 'unknown', count: i.count }))
          urgencyCounts = facet.urgencies.map((u) => ({ label: u._id || 'unknown', count: u.count }))
          sentimentCounts = facet.sentiments.map((s) => ({ label: s._id || 'neutral', count: s.count }))
          categoryCounts = facet.categories.map((c) => ({ label: c._id || 'other', count: c.count }))
          serviceCounts = facet.services.map((s) => ({ label: s._id || 'other', count: s.count }))
          topCountries = facet.countries.filter((c) => c._id).map((c) => ({ label: c._id, count: c.count }))

          // Month names
          monthlyCallVolume = facet.monthly.map((m) => {
            const date = new Date(m._id.year, (m._id.month || 1) - 1, 1)
            const label = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date)
            return { label, count: m.count }
          })
        }

        followUpQueue = followUpDocs.map(toDashboardCall)

        // Count open and overdue follow-ups directly on indexed queries
        const [openCount, overdueCount] = await Promise.all([
          col.countDocuments(
            buildRlsQuery(
              { followUpAt: { $ne: null }, status: { $nin: ['won', 'lost'] } },
              options.scope,
              primaryStore.tenantId
            )
          ),
          col.countDocuments(
            buildRlsQuery(
              { followUpAt: { $lt: new Date() }, status: { $nin: ['won', 'lost'] } },
              options.scope,
              primaryStore.tenantId
            )
          ),
        ])
        openFollowUps = openCount
        overdueFollowUps = overdueCount
      }
    } catch (aggErr) {
      console.warn('[dashboard:analytics] Aggregation fallback to recent items', aggErr)
      // Safe fallback if aggregation is not supported
      callsWithLead = recentCalls.filter((c) => hasLead(c.lead)).length
      hotLeads = recentCalls.filter((c) => c.leadQuality === 'hot').length
      qualifiedPipeline = recentCalls.filter((c) => ['qualified', 'proposal', 'won'].includes(c.status)).length
      followUpQueue = recentCalls.slice(0, 5)
    }

    const conversionReadiness = filteredRecordsCount
      ? Math.min(100, Math.round(((hotLeads * 2 + qualifiedPipeline + callsWithLead) / (filteredRecordsCount * 4)) * 100))
      : 0

    const partialAnalytics = {
      totalCalls: filteredRecordsCount,
      callsWithLead,
      hotLeads,
      emailFailures,
      averageMessages,
    }

    return {
      configured: true,
      generatedAt: new Date().toISOString(),
      totalCalls: totalRecordsCount,
      filteredCalls: filteredRecordsCount,
      pagination,
      callsWithLead,
      hotLeads,
      qualifiedPipeline,
      emailSent,
      emailFailures,
      averageMessages,
      conversionReadiness,
      openFollowUps,
      overdueFollowUps,
      selectedCall,
      recentCalls,
      statusCounts,
      leadQualityCounts,
      monthlyCallVolume,
      intentCounts,
      urgencyCounts,
      sentimentCounts,
      categoryCounts,
      serviceCounts,
      topCountries,
      aiRecommendations: buildRecommendations(recentCalls, partialAnalytics),
      riskSignals: buildRiskSignals(recentCalls),
      followUpQueue,
    }
  } catch (err) {
    console.error('[dashboard:analytics] Error in getDashboardAnalytics', err)
    return {
      ...EMPTY_ANALYTICS,
      generatedAt: new Date().toISOString(),
    }
  }
}
