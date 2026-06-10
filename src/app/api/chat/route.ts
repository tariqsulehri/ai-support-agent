import { NextRequest } from 'next/server'
import { streamChatReply, extractSentences } from '@/lib/ai/chat'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import type { ChatMessage } from '@/lib/ai/chat'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

/**
 * Streaming chat endpoint — emits Server-Sent Events.
 *
 * Event shapes:
 *   { token: string }                                    — incremental token for live display
 *   { sentence: string }                                 — complete sentence ready for TTS
 *   { done: true, fullText: string, endCall: boolean }   — stream finished
 *   { lead: LeadData }                                   — lead capture update
 *   { error: string }                                    — something went wrong
 */
export async function POST(req: NextRequest) {
  const authError = requireEmbedApiAuth(req)
  if (authError) return authError

  const tenant = getTenantFromRequest(req)

  let messages: ChatMessage[]
  try {
    const body = await req.json()
    messages = body.messages
    if (!Array.isArray(messages)) throw new Error('messages must be an array')
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const encoder = new TextEncoder()

  function send(payload: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const LEAD_RE = /\[LEAD:\{[^}]*(?:\{[^}]*\}[^}]*)?\}\]/g
  function stripLead(text: string): string {
    return text.replace(LEAD_RE, '').trim()
  }
  function extractLead(text: string): Record<string, string | null> | null {
    const m = text.match(/\[LEAD:(\{[\s\S]*?\})\]/)
    if (!m) return null
    try {
      const parsed = JSON.parse(m[1]) as Record<string, unknown>
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => {
          if (typeof value !== 'string') return [key, value ?? null]
          const trimmed = value.trim()
          return [key, !trimmed || trimmed.toLowerCase() === 'null' ? null : trimmed]
        })
      ) as Record<string, string | null>
    } catch { return null }
  }

  function hasRequiredLead(lead: Record<string, string | null> | null): boolean {
    return Boolean(lead?.name && lead.email && lead.phone && lead.country)
  }

  function lastUserMessage(): string {
    return [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  }

  function userWantsToEnd(text: string): boolean {
    const normalized = text.toLowerCase().trim()
    return [
      'bye',
      'goodbye',
      'thank you',
      'thanks',
      'no thank you',
      'no. thank you',
      "that's all",
      'that is all',
      'nothing else',
      'no more',
    ].some((phrase) => normalized.includes(phrase))
  }

  function assistantClosed(text: string): boolean {
    const normalized = text.toLowerCase()
    return [
      'have a great day',
      'have a nice day',
      'reach out to you soon',
      'will reach out',
      "we'll reach out",
      'thank you for providing your details',
      "you're welcome",
    ].some((phrase) => normalized.includes(phrase))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await streamChatReply(messages, tenant)

        let accumulated    = ''
        let sentenceBuffer = ''

        for await (const chunk of completion) {
          const token       = chunk.choices[0]?.delta?.content ?? ''
          const finishReason = chunk.choices[0]?.finish_reason

          if (token) {
            accumulated    += token
            sentenceBuffer += token
            controller.enqueue(send({ token }))

            const { sentences, remainder } = extractSentences(sentenceBuffer)
            sentenceBuffer = remainder
            for (const sentence of sentences) {
              const clean = stripLead(sentence)
              if (clean) controller.enqueue(send({ sentence: clean }))
            }
          }

          if (finishReason === 'stop') {
            const tail = stripLead(sentenceBuffer.trim())
            if (tail.length > 0) controller.enqueue(send({ sentence: tail }))

            const lead     = extractLead(accumulated)
            const cleaned  = stripLead(accumulated)
            const explicitEndCall = cleaned.trimStart().startsWith('[END_CALL]')
            const inferredEndCall = hasRequiredLead(lead) &&
              (userWantsToEnd(lastUserMessage()) || assistantClosed(cleaned))
            const endCall  = explicitEndCall || inferredEndCall
            const fullText = cleaned.replace('[END_CALL]', '').trim()

            if (inferredEndCall && !explicitEndCall) {
              console.info('[chat] inferred end call', {
                tenantId: tenant.id,
                hasLead: true,
              })
            }

            if (lead) controller.enqueue(send({ lead }))
            controller.enqueue(send({ done: true, fullText, endCall }))
            controller.close()
          }
        }
      } catch (err) {
        console.error('[chat]', err)
        controller.enqueue(send({ error: 'Chat failed' }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
