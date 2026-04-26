import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/client'
import { requireEmbedApiAuth } from '@/lib/security/embed-auth'
import type { ChatHistory } from '@/types'
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

  let messages: ChatHistory
  try {
    const body = await req.json()
    messages = body.messages
    if (!Array.isArray(messages)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Filter out the system bootstrap message and greet triggers
  const conversation = messages.filter((m) => m.content !== '__GREET__')

  if (conversation.length < 2) {
    return NextResponse.json({
      summary:   'The call was too brief to summarize.',
      keyPoints: [],
    })
  }

  const transcript = conversation
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Tariq'}: ${m.content}`)
    .join('\n')

  const openai = getOpenAIClient()

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      max_tokens:  500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a call summarizer. Given a conversation transcript between a visitor and Tariq (a Support Agent sales agent), return a JSON object with:
- "summary": a 2-3 sentence narrative recap of the discussion
- "keyPoints": an array of 3-5 concise bullet-point strings capturing the most important topics, decisions, or interests expressed

Return only valid JSON matching this shape: { "summary": "...", "keyPoints": ["...", "..."] }`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json({
      summary:   parsed.summary   ?? '',
      keyPoints: parsed.keyPoints ?? [],
    })
  } catch (err) {
    console.error('[summarize]', err)
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 })
  }
}
