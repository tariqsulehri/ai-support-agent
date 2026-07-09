import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/client'
import { sendCallSummaryEmail } from '@/lib/email/call-summary'
import { saveCallRecord } from '@/lib/db/call-records'
import { analyzeConversation, emptyLead, fallbackAnalysis } from '@/lib/ai/analyze-conversation'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
import type { TenantConfig } from '@/lib/tenants/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function hasEmail(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

async function finishCall({
  tenant,
  lead,
  summary,
  messages,
}: {
  tenant: TenantConfig
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
}) {
  const email = await sendCallSummaryEmail({ tenant, lead, summary, messages })
  const database = await saveCallRecord({
    tenant,
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

  await recordUsageEvent({
    tenantId: tenant.id,
    type: 'conversation.completed',
    metadata: {
      messages: messages.length,
      emailSent: email.sent,
      dbSaved: database.saved,
    },
  })

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
  let lead: LeadData = emptyLead()
  try {
    const body = await req.json()
    messages = body.messages
    if (body.lead && typeof body.lead === 'object') {
      lead = { ...emptyLead(), ...body.lead }
    }
    if (!Array.isArray(messages)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
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
    const { email, database } = await finishCall({
      tenant,
      lead: analysis.user,
      summary: enrichedSummary,
      messages,
    })
    return NextResponse.json({ ...briefSummary, analysis, email, database })
  }

  const agentLabel = tenant.agentName
  const transcript = conversation
    .map((m) => `${m.role === 'user' ? 'Visitor' : agentLabel}: ${m.content}`)
    .join('\n')

  const openai = getOpenAIClient(tenant)

  try {
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

    const raw    = completion.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)

    const summary: CallSummary = {
      summary:   parsed.summary   ?? '',
      keyPoints: parsed.keyPoints ?? [],
    }
    const analysis = await analyzeConversation({ tenant, lead, messages, summary: summary.summary })
    const enrichedSummary: CallSummary = { ...summary, analysis }
    const { email, database } = await finishCall({
      tenant,
      lead: analysis.user,
      summary: enrichedSummary,
      messages,
    })

    return NextResponse.json({ ...summary, analysis, email, database })
  } catch (err) {
    console.error('[summarize]', err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
