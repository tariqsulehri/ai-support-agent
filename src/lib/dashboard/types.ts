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
  /** Full transcript for the selected record, a short preview for list rows. */
  transcript: ChatHistory
  /** Total number of stored transcript messages (independent of the preview size). */
  messageCount: number
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

export type DashboardSort = 'recent' | 'created_desc' | 'created_asc' | 'maturity_desc'

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

/**
 * Which parts of the dashboard payload to compute. Each section maps to one or more
 * MongoDB round-trips, so callers should only request what the active view renders.
 */
export type DashboardSections = {
  /** Paginated records (with a short transcript preview). */
  list?: boolean
  /** KPI counters, distributions, monthly volume, insights. */
  aggregates?: boolean
  /** Open/overdue follow-up counters (two indexed counts; cheap). */
  followUps?: boolean
  /** Priority follow-up queue records. */
  followUpQueue?: boolean
  /** Full selected record for the lead workspace. */
  selected?: boolean
}

export type DashboardAnalyticsOptions = {
  scope?: DashboardAccessScope
  sections?: DashboardSections
}

export type DashboardAnalytics = {
  configured: boolean
  generatedAt: string
  /** Every record visible to the caller, ignoring filters. */
  totalCalls: number
  /** Records matching the current filters. All KPI percentages use this as denominator. */
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

/** Shape of a conversation document as stored in MongoDB. */
export type RawRecord = Document & {
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
  messageCount?: number
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

/** Aggregated counters used to build KPI cards and AI insight copy. */
export type DashboardSignalCounts = {
  filteredCalls: number
  callsWithLead: number
  hotLeads: number
  hotOpen: number
  highUrgencyOpen: number
  qualifiedPipeline: number
  emailSent: number
  emailFailures: number
  negativeSentiment: number
  complaints: number
  staleNew: number
  averageMessages: number
}
