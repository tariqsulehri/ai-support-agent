import { ObjectId, type InsertOneResult, type Document } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb, isMongoConfigured } from './mongodb'
import type { TenantConfig } from '@/lib/tenants/types'
import type { CallSummary, ChatHistory, ConversationAnalysis, LeadData } from '@/types'
import type { SendCallSummaryEmailResult } from '@/lib/email/call-summary'

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
}

function hasLeadData(lead: LeadData): boolean {
  return Object.values(lead).some((value) => Boolean(value?.trim()))
}

export async function saveCallRecord(input: SaveCallRecordInput): Promise<SaveCallRecordResult> {
  if (!isMongoConfigured()) return { saved: false }

  try {
    const db = await getMongoDb()
    if (!db) return { saved: false }

    const now = new Date()
    const result: InsertOneResult<Document> = await db
      .collection(env.MONGODB_CALLS_COLLECTION)
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

export async function updateCallRecordStatus(id: string, status: LeadStatus): Promise<SaveCallRecordResult> {
  if (!isMongoConfigured()) return { saved: false, error: 'MongoDB is not configured.' }
  if (!ObjectId.isValid(id)) return { saved: false, error: 'Invalid call record id.' }

  try {
    const db = await getMongoDb()
    if (!db) return { saved: false, error: 'MongoDB is not configured.' }

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
    const result = await db.collection(env.MONGODB_CALLS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      update
    )

    return {
      saved: result.matchedCount > 0,
      id,
      error: result.matchedCount > 0 ? undefined : 'Call record was not found.',
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
  if (!isMongoConfigured()) return { saved: false, error: 'MongoDB is not configured.' }
  if (!ObjectId.isValid(input.id)) return { saved: false, error: 'Invalid call record id.' }

  try {
    const db = await getMongoDb()
    if (!db) return { saved: false, error: 'MongoDB is not configured.' }

    const followUpAt = input.followUpAt?.trim() ? new Date(input.followUpAt) : null
    const result = await db.collection(env.MONGODB_CALLS_COLLECTION).updateOne(
      { _id: new ObjectId(input.id) },
      {
        $set: {
          owner: input.owner?.trim() || null,
          followUpAt: followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null,
          notes: input.notes?.trim() || null,
          updatedAt: new Date(),
        },
      }
    )

    return {
      saved: result.matchedCount > 0,
      id: input.id,
      error: result.matchedCount > 0 ? undefined : 'Call record was not found.',
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[mongodb]', error)
    return { saved: false, error }
  }
}
