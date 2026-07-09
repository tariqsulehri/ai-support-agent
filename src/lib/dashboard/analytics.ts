import { conversationCollection, getConversationStoresForScope, type ConversationStore } from '@/lib/db/conversation-store'
import type { Document } from 'mongodb'
import type { DashboardAccessScope } from '@/lib/auth/types'
import type {
  ChatHistory,
  ConversationIntent,
  ConversationSentiment,
  ConversationUrgency,
  LeadData,
  LeadQuality,
} from '@/types'

type CountItem = {
  label: string
  count: number
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
  owner: string | null
  followUpAt: string | null
  notes: string | null
  statusHistory: Array<{ status: string; changedAt: string }>
  createdAt: string
  updatedAt: string
}

export type DashboardFilters = {
  q?: string
  status?: string
  quality?: string
  urgency?: string
  range?: string
  selectedId?: string
}

export type DashboardAnalyticsOptions = {
  scope?: DashboardAccessScope
}

export type DashboardAnalytics = {
  configured: boolean
  generatedAt: string
  totalCalls: number
  callsWithLead: number
  hotLeads: number
  qualifiedPipeline: number
  emailSent: number
  emailFailures: number
  averageMessages: number
  conversionReadiness: number
  openFollowUps: number
  overdueFollowUps: number
  filteredCalls: number
  selectedCall: DashboardCall | null
  recentCalls: DashboardCall[]
  statusCounts: CountItem[]
  leadQualityCounts: CountItem[]
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
}

const EMPTY_ANALYTICS: DashboardAnalytics = {
  configured: false,
  generatedAt: new Date().toISOString(),
  totalCalls: 0,
  callsWithLead: 0,
  hotLeads: 0,
  qualifiedPipeline: 0,
  emailSent: 0,
  emailFailures: 0,
  averageMessages: 0,
  conversionReadiness: 0,
  openFollowUps: 0,
  overdueFollowUps: 0,
  filteredCalls: 0,
  selectedCall: null,
  recentCalls: [],
  statusCounts: [],
  leadQualityCounts: [],
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

function dateString(value: Date | undefined): string {
  return (value ?? new Date(0)).toISOString()
}

function optionalDateString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function increment(map: Map<string, number>, label: string | null | undefined): void {
  const key = label?.trim() || 'unknown'
  map.set(key, (map.get(key) ?? 0) + 1)
}

function rankedItems(map: Map<string, number>, limit = 8): CountItem[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function toDashboardCall(record: RawRecord): DashboardCall {
  const lead = normalizeLead(record.lead ?? record.user)
  const classification = record.classification
  const requirement = record.requirement

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
    owner: record.owner?.trim() || null,
    followUpAt: optionalDateString(record.followUpAt),
    notes: record.notes?.trim() || null,
    statusHistory: (record.statusHistory ?? []).map((item) => ({
      status: item.status ?? 'unknown',
      changedAt: dateString(item.changedAt),
    })),
    createdAt: dateString(record.createdAt),
    updatedAt: dateString(record.updatedAt),
  }
}

function withinRange(call: DashboardCall, range: string | undefined): boolean {
  if (!range || range === 'all') return true

  const createdAt = new Date(call.createdAt).getTime()
  const now = Date.now()
  const days = range === 'today' ? 1 : Number(range)
  if (!Number.isFinite(days)) return true

  return createdAt >= now - days * 24 * 60 * 60 * 1000
}

function matchesSearch(call: DashboardCall, query: string | undefined): boolean {
  const normalized = query?.trim().toLowerCase()
  if (!normalized) return true

  return [
    call.lead.name,
    call.lead.email,
    call.lead.phone,
    call.lead.company,
    call.lead.country,
    call.lead.purpose,
    call.companyName,
    call.category,
    call.intent,
    call.summary,
    call.owner,
    call.notes,
    ...call.servicesInterested,
    ...call.keyPoints,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized))
}

function applyFilters(calls: DashboardCall[], filters: DashboardFilters): DashboardCall[] {
  return calls.filter((call) =>
    matchesSearch(call, filters.q) &&
    withinRange(call, filters.range) &&
    (!filters.status || filters.status === 'all' || call.status === filters.status) &&
    (!filters.quality || filters.quality === 'all' || call.leadQuality === filters.quality) &&
    (!filters.urgency || filters.urgency === 'all' || call.urgency === filters.urgency)
  )
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
  const query: Document = store.tenantId
    ? { 'tenant.id': store.tenantId }
    : scope?.kind === 'tenant'
      ? { 'tenant.id': scope.tenantId }
      : {}
  const createdAfter = rangeStartDate(filters.range)

  if (createdAfter) query.createdAt = { $gte: createdAfter }
  if (filters.status && filters.status !== 'all') query.status = filters.status
  if (filters.quality && filters.quality !== 'all') query['classification.leadQuality'] = filters.quality
  if (filters.urgency && filters.urgency !== 'all') query['requirement.urgency'] = filters.urgency

  return query
}

const DASHBOARD_RECORD_PROJECTION = {
  tenant: 1,
  lead: 1,
  user: 1,
  hasLead: 1,
  requirement: 1,
  classification: 1,
  summary: 1,
  callSummary: 1,
  transcript: 1,
  status: 1,
  email: 1,
  owner: 1,
  followUpAt: 1,
  notes: 1,
  statusHistory: 1,
  createdAt: 1,
  updatedAt: 1,
} as const

function buildRecommendations(calls: DashboardCall[], analytics: Pick<DashboardAnalytics,
  'totalCalls' | 'callsWithLead' | 'hotLeads' | 'emailFailures' | 'averageMessages'
>): string[] {
  if (calls.length === 0) {
    return ['No completed communications are available yet. Start by validating call capture, MongoDB persistence, and email notifications end to end.']
  }

  const recommendations: string[] = []
  const hotOpen = calls.filter((call) =>
    call.leadQuality === 'hot' && !['won', 'lost'].includes(call.status)
  )
  const highUrgency = calls.filter((call) => call.urgency === 'high' && !['won', 'lost'].includes(call.status))
  const leadCaptureRate = Math.round((analytics.callsWithLead / analytics.totalCalls) * 100)

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

export async function getDashboardAnalytics(
  filters: DashboardFilters = {},
  options: DashboardAnalyticsOptions = {}
): Promise<DashboardAnalytics> {
  try {
    const stores = await getConversationStoresForScope(options.scope)
    if (stores.length === 0) return EMPTY_ANALYTICS

    const recordsByStore = await Promise.all(stores.map(async (store) => {
      const query = buildStoreQuery(store, filters, options.scope)

      return conversationCollection<RawRecord>(store)
        .find(query, { projection: DASHBOARD_RECORD_PROJECTION })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray()
    }))

    const records = recordsByStore
      .flat()
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 500)

    const allCalls = records.map(toDashboardCall)
    const calls = applyFilters(allCalls, filters)
    const totalCalls = calls.length
    const statusMap = new Map<string, number>()
    const qualityMap = new Map<string, number>()
    const intentMap = new Map<string, number>()
    const urgencyMap = new Map<string, number>()
    const sentimentMap = new Map<string, number>()
    const categoryMap = new Map<string, number>()
    const serviceMap = new Map<string, number>()
    const countryMap = new Map<string, number>()

    let messageCount = 0
    for (const call of calls) {
      increment(statusMap, call.status)
      increment(qualityMap, call.leadQuality)
      increment(intentMap, call.intent)
      increment(urgencyMap, call.urgency)
      increment(sentimentMap, call.sentiment)
      increment(categoryMap, call.category)
      increment(countryMap, call.lead.country)
      for (const service of call.servicesInterested) increment(serviceMap, service)
      messageCount += call.transcript.length
    }

    const callsWithLead = calls.filter((call) => hasLead(call.lead)).length
    const hotLeads = calls.filter((call) => call.leadQuality === 'hot').length
    const qualifiedPipeline = calls.filter((call) =>
      ['qualified', 'proposal', 'won'].includes(call.status)
    ).length
    const emailSent = calls.filter((call) => call.emailSent).length
    const emailFailures = calls.filter((call) => call.emailError).length
    const openFollowUps = calls.filter((call) => call.followUpAt && !['won', 'lost'].includes(call.status)).length
    const overdueFollowUps = calls.filter((call) =>
      call.followUpAt &&
      new Date(call.followUpAt).getTime() < Date.now() &&
      !['won', 'lost'].includes(call.status)
    ).length
    const averageMessages = totalCalls ? Math.round((messageCount / totalCalls) * 10) / 10 : 0
    const conversionReadiness = totalCalls
      ? Math.round(((hotLeads * 2 + qualifiedPipeline + callsWithLead) / (totalCalls * 4)) * 100)
      : 0
    const partialAnalytics = { totalCalls, callsWithLead, hotLeads, emailFailures, averageMessages }

    return {
      configured: true,
      generatedAt: new Date().toISOString(),
      totalCalls,
      callsWithLead,
      hotLeads,
      qualifiedPipeline,
      emailSent,
      emailFailures,
      averageMessages,
      conversionReadiness,
      openFollowUps,
      overdueFollowUps,
      filteredCalls: totalCalls,
      selectedCall: calls.find((call) => call.id === filters.selectedId) ?? calls[0] ?? null,
      recentCalls: calls.slice(0, 30),
      statusCounts: rankedItems(statusMap),
      leadQualityCounts: rankedItems(qualityMap),
      intentCounts: rankedItems(intentMap),
      urgencyCounts: rankedItems(urgencyMap),
      sentimentCounts: rankedItems(sentimentMap),
      categoryCounts: rankedItems(categoryMap),
      serviceCounts: rankedItems(serviceMap),
      topCountries: rankedItems(countryMap, 6),
      aiRecommendations: buildRecommendations(calls, partialAnalytics),
      riskSignals: buildRiskSignals(calls),
      followUpQueue: calls
        .filter((call) =>
          !['won', 'lost'].includes(call.status) &&
          (call.leadQuality === 'hot' || call.urgency === 'high' || call.intent === 'meeting_request')
        )
        .slice(0, 10),
    }
  } catch (err) {
    console.error('[dashboard]', err)
    return {
      ...EMPTY_ANALYTICS,
      generatedAt: new Date().toISOString(),
    }
  }
}
