import { NextRequest, NextResponse } from 'next/server'
import { saveConversationSnapshot } from '@/lib/db/call-records'
import { emptyLead } from '@/lib/ai/analyze-conversation'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import type { ChatHistory, LeadData } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const runtime = await requireTenantRuntime(req, 'summarize', { requireDatabase: false })
  if (runtime.response) return runtime.response
  const { tenant } = runtime

  let conversationId: string
  let messages: ChatHistory
  let lead: LeadData = emptyLead()

  try {
    const body = await req.json()
    conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
    messages = body.messages
    if (body.lead && typeof body.lead === 'object') {
      lead = { ...emptyLead(), ...body.lead }
    }
    if (!conversationId || !Array.isArray(messages)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const database = await saveConversationSnapshot({
    tenant,
    conversationId,
    lead,
    messages,
  })

  await recordUsageEvent({
    tenantId: tenant.id,
    type: 'conversation.snapshot',
    metadata: {
      messages: messages.length,
      dbSaved: database.saved,
    },
  })

  return NextResponse.json({ database })
}
