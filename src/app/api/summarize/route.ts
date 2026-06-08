import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/client'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { sendCallSummaryEmail } from '@/lib/email/call-summary'
// import { saveCallRecord } from '@/lib/db/call-records'
import { analyzeConversation, emptyLead, fallbackAnalysis } from '@/lib/ai/analyze-conversation'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/summarize
 * Body: { messages: ChatHistory }
 * Returns: { summary: string, keyPoints: string[] }
 *
 * Called once at the end of a call to produce a structured recap.
 */
export async function POST(req: NextRequest) {
  const authError = requireEmbedApiAuth(req)
  if (authError) return authError

  const tenant = getTenantFromRequest(req)

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

  if (conversation.length < 2) {
    const briefSummary: CallSummary = {
      summary:   'The call was too brief to summarize.',
      keyPoints: [],
    }
    const analysis = fallbackAnalysis(lead, briefSummary.summary)
    const email = await sendCallSummaryEmail({ tenant, lead, summary: briefSummary, messages })
    // Temporarily disabled MongoDB persistence.
    // const database = await saveCallRecord({ tenant, lead: analysis.user, summary: briefSummary, messages, email, analysis })
    const database = { saved: false, error: 'MongoDB persistence temporarily disabled.' }
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
    const email = await sendCallSummaryEmail({ tenant, lead: analysis.user, summary: enrichedSummary, messages })
    // Temporarily disabled MongoDB persistence.
    // const database = await saveCallRecord({ tenant, lead: analysis.user, summary: enrichedSummary, messages, email, analysis })
    const database = { saved: false, error: 'MongoDB persistence temporarily disabled.' }

    return NextResponse.json({ ...summary, analysis, email, database })
  } catch (err) {
    console.error('[summarize]', err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
