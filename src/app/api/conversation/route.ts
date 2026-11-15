import { NextRequest, NextResponse } from 'next/server'
import { saveConversationSnapshot } from '@/lib/db/call-records'
import { emptyLead } from '@/lib/ai/analyze-conversation'
import { recordUsageEvent } from '@/lib/observability/usage'
import { enforceIpRateLimit, requireTenantRuntime } from '@/lib/api/tenant-runtime'
import {
  background,
  bodyErrorResponse,
  readJsonBody,
  sanitizeChatHistory,
  sanitizeConversationId,
  sanitizeLead,
} from '@/lib/api/request-guards'
import type { ChatHistory, LeadData } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1024 * 1024
const MAX_MESSAGES = 300
const MAX_MESSAGE_CHARS = 4000

export async function POST(req: NextRequest) {
  const limited = enforceIpRateLimit(req, 'conversation')
  if (limited) return limited

  const runtime = await requireTenantRuntime(req, 'summarize', { requireDatabase: false }, { skipIpRateLimit: true })
  if (runtime.response) return runtime.response
  const { tenant } = runtime

  let conversationId: string
  let messages: ChatHistory
  let lead: LeadData = emptyLead()

  try {
    const body = await readJsonBody<{ conversationId?: unknown; messages?: unknown; lead?: unknown }>(req, MAX_BODY_BYTES)
    const id = sanitizeConversationId(body?.conversationId)
    const sanitized = sanitizeChatHistory(body?.messages, {
      maxMessages: MAX_MESSAGES,
      maxContentChars: MAX_MESSAGE_CHARS,
    })
    if (!id || !sanitized) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    conversationId = id
    messages = sanitized
    lead = { ...emptyLead(), ...sanitizeLead(body?.lead) }
  } catch (err) {
    return bodyErrorResponse(err)
  }

  const database = await saveConversationSnapshot({
    tenant,
    conversationId,
    lead,
    messages,
  })

  background(recordUsageEvent({
    tenantId: tenant.id,
    type: 'conversation.snapshot',
    metadata: {
      messages: messages.length,
      dbSaved: database.saved,
    },
  }), 'conversation usage')

  // Never echo internal database error details to the (public) embed client.
  return NextResponse.json({
    database: database.saved
      ? { saved: true, id: database.id }
      : { saved: false, error: 'Conversation snapshot was not saved.' },
  })
}
