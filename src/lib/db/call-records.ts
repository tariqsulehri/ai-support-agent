import { ObjectId, type InsertOneResult, type Document } from 'mongodb'
import { conversationCollection, getConversationStoreForTenant, getConversationStoresForScope } from './conversation-store'
import { DATABASE_STRING_NOT_CONFIGURED } from '@/lib/tenants/runtime-configuration'
import { scopedRecordQuery, assertTenantAccess } from '@/lib/security/row-level-security'
import { calculateMaturityScore } from '@/lib/ai/maturity-score'
import type { TenantConfig } from '@/lib/tenants/types'
import type { CallSummary, ChatHistory, ConversationAnalysis, LeadData } from '@/types'
import type { SendCallSummaryEmailResult } from '@/lib/email/call-summary'
import type { DashboardAccessScope } from '@/lib/auth/types'

export interface SaveCallRecordInput {
  tenant: TenantConfig
  conversationId?: string
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
  email?: SendCallSummaryEmailResult
  analysis?: ConversationAnalysis
}

export interface SaveConversationSnapshotInput {
  tenant: TenantConfig
  conversationId: string
  lead: LeadData
  messages: ChatHistory
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

function conversationRecord(input: SaveCallRecordInput, now: Date): Document {
  const maturity = calculateMaturityScore({
    status: 'new',
    leadQuality: input.analysis?.classification?.leadQuality,
    urgency: input.analysis?.requirement?.urgency,
    sentiment: input.analysis?.classification?.sentiment,
    lead: input.lead,
    messageCount: input.messages.length,
    hasLead: hasLeadData(input.lead),
  })

  return {
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
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
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
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
    finalizedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export async function saveCallRecord(input: SaveCallRecordInput): Promise<SaveCallRecordResult> {
  try {
    const store = await getConversationStoreForTenant(input.tenant)
    if (!store) return { saved: false, error: DATABASE_STRING_NOT_CONFIGURED }

    const now = new Date()
    const doc = conversationRecord(input, now)

    if (input.conversationId) {
      await conversationCollection(store).updateOne(
        { 'tenant.id': input.tenant.id, conversationId: input.conversationId },
        { $set: doc },
        { upsert: true }
      )
      const saved = await conversationCollection(store).findOne(
        { 'tenant.id': input.tenant.id, conversationId: input.conversationId },
        { projection: { _id: 1 } }
      )
      return { saved: true, id: saved?._id?.toString() }
    }

    const result: InsertOneResult<Document> = await conversationCollection(store).insertOne(doc)

    return { saved: true, id: result.insertedId.toString() }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}

export async function saveConversationSnapshot(input: SaveConversationSnapshotInput): Promise<SaveCallRecordResult> {
  if (!input.conversationId.trim()) return { saved: false, error: 'Conversation id is required.' }

  try {
    const store = await getConversationStoreForTenant(input.tenant)
    if (!store) return { saved: false, error: DATABASE_STRING_NOT_CONFIGURED }

    const now = new Date()
    const transcript = input.messages.filter((message) => message.content !== '__GREET__')
    const maturity = calculateMaturityScore({
      status: 'new',
      lead: input.lead,
      messageCount: transcript.length,
      hasLead: hasLeadData(input.lead),
    })

    await conversationCollection(store).updateOne(
      {
        'tenant.id': input.tenant.id,
        conversationId: input.conversationId,
        finalizedAt: { $exists: false },
      },
      {
        $setOnInsert: {
          conversationId: input.conversationId,
          tenant: {
            id: input.tenant.id,
            companyName: input.tenant.companyName,
            agentName: input.tenant.agentName,
          },
          status: 'new',
          statusHistory: [{ status: 'new', changedAt: now }],
          owner: null,
          followUpAt: null,
          notes: null,
          email: null,
          summary: {
            text: 'Conversation in progress.',
            keyPoints: [],
          },
          callSummary: {
            summary: 'Conversation in progress.',
            keyPoints: [],
            nextSteps: [],
          },
          createdAt: now,
        },
        $set: {
          user: input.lead,
          lead: input.lead,
          hasLead: hasLeadData(input.lead),
          maturityScore: maturity.score,
          maturityLabel: maturity.label,
          transcript,
          source: {
            mode: transcript.some((message) => message.role === 'user') ? 'conversation' : 'unknown',
            language: input.tenant.languageMode,
          },
          updatedAt: now,
        },
      },
      { upsert: true }
    )
    const saved = await conversationCollection(store).findOne(
      { 'tenant.id': input.tenant.id, conversationId: input.conversationId },
      { projection: { _id: 1 } }
    )
    return { saved: Boolean(saved), id: saved?._id?.toString() }
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

    const existing = await getCallRecordById(id, scope)
    const maturity = calculateMaturityScore({
      status,
      leadQuality: existing?.classification?.leadQuality,
      urgency: existing?.requirement?.urgency,
      sentiment: existing?.classification?.sentiment,
      lead: existing?.lead ?? existing?.user,
      messageCount: Array.isArray(existing?.transcript) ? existing.transcript.length : 0,
      hasLead: existing?.hasLead,
    })

    const update: Document = {
      $set: {
        status,
        maturityScore: maturity.score,
        maturityLabel: maturity.label,
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
      error: 'Call record was not found or access denied.',
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
      error: 'Call record was not found or access denied.',
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}

export async function getCallRecordById(
  id: string,
  scope?: DashboardAccessScope
): Promise<Document | null> {
  if (!ObjectId.isValid(id)) return null

  try {
    const stores = await getConversationStoresForScope(scope)
    if (stores.length === 0) return null

    const query = scopedRecordQuery(id, scope)
    for (const store of stores) {
      const record = await conversationCollection(store).findOne(query)
      if (record) {
        assertTenantAccess(record.tenant?.id, scope)
        return record
      }
    }
    return null
  } catch (err) {
    console.error('[mongodb] getCallRecordById error', err)
    return null
  }
}
