import { ObjectId, type InsertOneResult, type Document } from 'mongodb'
import { conversationCollection, getConversationStoreForTenant, getConversationStoresForScope } from './conversation-store'
import type { TenantConfig } from '@/lib/tenants/types'
import type { CallSummary, ChatHistory, ConversationAnalysis, LeadData } from '@/types'
import type { SendCallSummaryEmailResult } from '@/lib/email/call-summary'
import type { DashboardAccessScope } from '@/lib/auth/types'

export interface SaveCallRecordInput {
  tenant: TenantConfig
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
  email?: SendCallSummaryEmailResult
  analysis?: ConversationAnalysis
}

export interface SaveCallRecordResult {
  saved: boolean
  id?: string
  error?: string
}

export type LeadStatus = 'new' | 'reviewing' | 'qualified' | 'proposal' | 'won' | 'lost'

export interface UpdateCallRecordManagementInput {
  id: string
  owner?: string | null
  followUpAt?: string | null
  notes?: string | null
  scope?: DashboardAccessScope
}

function hasLeadData(lead: LeadData): boolean {
  return Object.values(lead).some((value) => Boolean(value?.trim()))
}

function scopedRecordQuery(id: string, scope?: DashboardAccessScope): Document {
  const query: Document = { _id: new ObjectId(id) }
  if (scope?.kind === 'tenant') query['tenant.id'] = scope.tenantId
  return query
}

export async function saveCallRecord(input: SaveCallRecordInput): Promise<SaveCallRecordResult> {
  try {
    const store = await getConversationStoreForTenant(input.tenant)
    if (!store) return { saved: false, error: 'Conversation database is not configured.' }

    const now = new Date()
    const result: InsertOneResult<Document> = await conversationCollection(store)
      .insertOne({
        tenant: {
          id: input.tenant.id,
          companyName: input.tenant.companyName,
          agentName: input.tenant.agentName,
        },
        user: input.analysis?.user ?? input.lead,
        lead: input.analysis?.user ?? input.lead,
        hasLead: hasLeadData(input.lead),
        requirement: input.analysis?.requirement ?? null,
        classification: input.analysis?.classification ?? null,
        summary: {
          text: input.summary.summary,
          keyPoints: input.summary.keyPoints,
        },
        callSummary: {
          summary: input.summary.summary,
          keyPoints: input.summary.keyPoints,
          nextSteps: input.analysis?.nextSteps ?? [],
        },
        transcript: input.messages.filter((message) => message.content !== '__GREET__'),
        status: 'new',
        statusHistory: [{ status: 'new', changedAt: now }],
        owner: null,
        followUpAt: null,
        notes: null,
        source: {
          mode: input.messages.some((message) => message.role === 'user') ? 'conversation' : 'unknown',
          language: input.tenant.languageMode,
        },
        email: input.email ?? null,
        createdAt: now,
        updatedAt: now,
      })

    return { saved: true, id: result.insertedId.toString() }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}

export async function updateCallRecordStatus(
  id: string,
  status: LeadStatus,
  scope?: DashboardAccessScope
): Promise<SaveCallRecordResult> {
  if (!ObjectId.isValid(id)) return { saved: false, error: 'Invalid call record id.' }

  try {
    const stores = await getConversationStoresForScope(scope)
    if (stores.length === 0) return { saved: false, error: 'Conversation database is not configured.' }

    const update: Document = {
      $set: {
        status,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status,
          changedAt: new Date(),
        },
      },
    }
    for (const store of stores) {
      const result = await conversationCollection(store).updateOne(
        scopedRecordQuery(id, scope),
        update
      )
      if (result.matchedCount > 0) return { saved: true, id }
    }

    return {
      saved: false,
      id,
      error: 'Call record was not found.',
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}

export async function updateCallRecordManagement(
  input: UpdateCallRecordManagementInput
): Promise<SaveCallRecordResult> {
  if (!ObjectId.isValid(input.id)) return { saved: false, error: 'Invalid call record id.' }

  try {
    const stores = await getConversationStoresForScope(input.scope)
    if (stores.length === 0) return { saved: false, error: 'Conversation database is not configured.' }

    const followUpAt = input.followUpAt?.trim() ? new Date(input.followUpAt) : null
    const update: Document = {
      $set: {
        owner: input.owner?.trim() || null,
        followUpAt: followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null,
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      },
    }

    for (const store of stores) {
      const result = await conversationCollection(store).updateOne(
        scopedRecordQuery(input.id, input.scope),
        update
      )
      if (result.matchedCount > 0) return { saved: true, id: input.id }
    }

    return {
      saved: false,
      id: input.id,
      error: 'Call record was not found.',
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}
