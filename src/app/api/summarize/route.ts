import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/client'
import { sendCallSummaryEmail } from '@/lib/email/call-summary'
import { saveCallRecord } from '@/lib/db/call-records'
import { analyzeConversation, emptyLead, fallbackAnalysis } from '@/lib/ai/analyze-conversation'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import {
  background,
  bodyErrorResponse,
  readJsonBody,
  sanitizeChatHistory,
  sanitizeConversationId,
  sanitizeLead,
} from '@/lib/api/request-guards'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
import type { TenantConfig } from '@/lib/tenants/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1024 * 1024
const MAX_MESSAGES = 300
const MAX_MESSAGE_CHARS = 4000
/** Upper bound on transcript characters sent to the summarizer model. */
const MAX_TRANSCRIPT_CHARS = 60_000

type FinishResult = Awaited<ReturnType<typeof finishCall>>

/**
 * The summarize endpoint is called by the public embed client. Strip internal
 * details (tenant recipient addresses, SMTP / database error messages) from
 * the delivery status before returning it.
 */
function publicDeliveryStatus({ email, database }: FinishResult): Pick<CallSummary, 'email' | 'database'> {
  return {
    email: email.sent
      ? { sent: true }
      : { sent: false, ...(email.error ? { error: 'Summary email was not sent.' } : {}) },
    database: database.saved
      ? { saved: true, id: database.id }
      : { saved: false, error: 'Call record was not saved.' },
  }
}

function sanitizeKeyPoints(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((point): point is string => typeof point === 'string' && point.trim().length > 0)
    .map((point) => point.trim().slice(0, 500))
    .slice(0, 10)
}

function hasEmail(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

async function finishCall({
  tenant,
  conversationId,
  lead,
  summary,
  messages,
}: {
  tenant: TenantConfig
  conversationId?: string
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
}) {
  const email = await sendCallSummaryEmail({ tenant, lead, summary, messages })
  const database = await saveCallRecord({
    tenant,
    conversationId,
    lead,
    summary,
    messages,
    email,
    analysis: summary.analysis,
  })

  console.info('[call-end] completed', {
    tenantId: tenant.id,
    emailSent: email.sent,
    emailRecipients: email.recipients?.length ?? 0,
    emailError: email.error,
    dbSaved: database.saved,
    dbId: database.id,
    dbError: database.error,
  })

  background(recordUsageEvent({
    tenantId: tenant.id,
    type: 'conversation.completed',
    metadata: {
      messages: messages.length,
      emailSent: email.sent,
      dbSaved: database.saved,
    },
  }), 'summarize usage')

  return { email, database }
}

/**
 * POST /api/summarize
 * Body: { messages: ChatHistory }
 * Returns: { summary: string, keyPoints: string[] }
 *
 * Called once at the end of a call to produce a structured recap.
 */
export async function POST(req: NextRequest) {
  const runtime = await requireTenantRuntime(req, 'summarize', { requireDatabase: false })
  if (runtime.response) return runtime.response
  const { tenant } = runtime

  let messages: ChatHistory
  let conversationId: string | undefined
  let lead: LeadData = emptyLead()
  try {
    const body = await readJsonBody<{ conversationId?: unknown; messages?: unknown; lead?: unknown }>(req, MAX_BODY_BYTES)
    conversationId = sanitizeConversationId(body?.conversationId)
    const sanitized = sanitizeChatHistory(body?.messages, {
      maxMessages: MAX_MESSAGES,
      maxContentChars: MAX_MESSAGE_CHARS,
    })
    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    messages = sanitized
    lead = { ...emptyLead(), ...sanitizeLead(body?.lead) }
  } catch (err) {
    return bodyErrorResponse(err)
  }

  const conversation = messages.filter((m) => m.content !== '__GREET__')

  console.info('[call-end] started', {
    tenantId: tenant.id,
    messages: conversation.length,
    leadEmailCaptured: hasEmail(lead.email),
  })

  if (conversation.length < 2) {
    const briefSummary: CallSummary = {
      summary:   'The call was too brief to summarize.',
      keyPoints: [],
    }
    const analysis = fallbackAnalysis(lead, briefSummary.summary)
    const enrichedSummary: CallSummary = { ...briefSummary, analysis }
    const delivery = await finishCall({
      tenant,
      conversationId,
      lead: analysis.user,
      summary: enrichedSummary,
      messages,
    })
    return NextResponse.json({ ...briefSummary, analysis, ...publicDeliveryStatus(delivery) })
  }

  const agentLabel = tenant.agentName
  let transcript = conversation
    .map((m) => `${m.role === 'user' ? 'Visitor' : agentLabel}: ${m.content}`)
    .join('\n')
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    // Keep the most recent part of very long calls.
    transcript = transcript.slice(-MAX_TRANSCRIPT_CHARS)
  }

  try {
    const openai = getOpenAIClient(tenant)
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      max_tokens:      500,
      temperature:     0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role:    'system',
          content: `You are a call summarizer. Given a conversation transcript between a visitor and ${agentLabel} (an AI support agent for ${tenant.companyName}), return a JSON object with:
- "summary": a 2-3 sentence narrative recap of the discussion
- "keyPoints": an array of 3-5 concise bullet-point strings capturing the most important topics, decisions, or interests expressed

Return only valid JSON matching this shape: { "summary": "...", "keyPoints": ["...", "..."] }`,
        },
        {
          role:    'user',
          content: transcript,
        },
      ],
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    let parsed: { summary?: unknown; keyPoints?: unknown } = {}
    try {
      parsed = JSON.parse(raw) ?? {}
    } catch {
      parsed = {}
    }

    const summary: CallSummary = {
      summary:   typeof parsed.summary === 'string' ? parsed.summary : '',
      keyPoints: sanitizeKeyPoints(parsed.keyPoints),
    }
    const analysis = await analyzeConversation({ tenant, lead, messages, summary: summary.summary })
    const enrichedSummary: CallSummary = { ...summary, analysis }
    const delivery = await finishCall({
      tenant,
      conversationId,
      lead: analysis.user,
      summary: enrichedSummary,
      messages,
    })

    return NextResponse.json({ ...summary, analysis, ...publicDeliveryStatus(delivery) })
  } catch (err) {
    console.error('[summarize]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
