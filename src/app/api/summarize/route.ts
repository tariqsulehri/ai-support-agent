import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/client'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { sendCallSummaryEmail } from '@/lib/email/call-summary'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

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
  let lead: LeadData = { name: null, email: null, phone: null, company: null, purpose: null }
  try {
    const body = await req.json()
    messages = body.messages
    if (body.lead && typeof body.lead === 'object') lead = body.lead
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
    const email = await sendCallSummaryEmail({ tenant, lead, summary: briefSummary, messages })
    return NextResponse.json({ ...briefSummary, email })
  }

  const agentLabel = tenant.agentName
  const transcript = conversation
    .map((m) => `${m.role === 'user' ? 'Visitor' : agentLabel}: ${m.content}`)
    .join('\n')

  const openai = getOpenAIClient(tenant.openaiApiKey)

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
    const email = await sendCallSummaryEmail({ tenant, lead, summary, messages })

    return NextResponse.json({ ...summary, email })
  } catch (err) {
    console.error('[summarize]', err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
