import { NextRequest } from 'next/server'
import { streamChatReply, extractSentences } from '@/lib/ai/chat'
import { evaluateCustomerMessage } from '@/lib/ai/conversation-policy'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import {
  assistantClosed,
  displayText,
  extractLead,
  hasRequiredLead,
  stripLead,
  userWantsToEnd,
} from '@/lib/ai/lead-tokens'
import type { ChatMessage } from '@/lib/ai/chat'
import type { LeadData } from '@/types'
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
  const runtime = await requireTenantRuntime(req, 'chat')
  if (runtime.response) return runtime.response
  const { tenant } = runtime

  await recordUsageEvent({ tenantId: tenant.id, type: 'chat.request' })

  let messages: ChatMessage[]
  let existingLead: Partial<LeadData> = {}
  try {
    const body = await req.json()
    messages = body.messages
    if (body.lead && typeof body.lead === 'object') {
      existingLead = body.lead
    }
    if (!Array.isArray(messages)) throw new Error('messages must be an array')
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const encoder = new TextEncoder()

  function send(payload: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
  }

  function lastUserMessage(): string {
    return [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  }

  function policyResponse(reply: string): Response {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(send({ token: reply }))
        controller.enqueue(send({ sentence: reply }))
        controller.enqueue(send({ done: true, fullText: reply, endCall: false }))
        controller.close()
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

  const policy = evaluateCustomerMessage(lastUserMessage(), tenant)
  if (policy.type === 'out_of_scope') {
    return policyResponse(policy.reply)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await streamChatReply(messages, tenant)

        let accumulated        = ''
        let visibleAccumulated = ''
        let sentenceBuffer     = ''

        for await (const chunk of completion) {
          const token       = chunk.choices[0]?.delta?.content ?? ''
          const finishReason = chunk.choices[0]?.finish_reason

          if (token) {
            accumulated    += token
            const nextVisible = displayText(accumulated)
            const visibleToken = nextVisible.slice(visibleAccumulated.length)
            visibleAccumulated = nextVisible

            if (visibleToken) {
              sentenceBuffer += visibleToken
              controller.enqueue(send({ token: visibleToken }))
            }

            const { sentences, remainder } = extractSentences(sentenceBuffer)
            sentenceBuffer = remainder
            for (const sentence of sentences) {
              const clean = displayText(sentence)
              if (clean) controller.enqueue(send({ sentence: clean }))
            }
          }

          if (finishReason === 'stop') {
            const tail = displayText(sentenceBuffer.trim())
            if (tail.length > 0) controller.enqueue(send({ sentence: tail }))

            const lead     = extractLead(accumulated)
            const mergedLead = { ...existingLead, ...(lead ?? {}) }
            const cleaned  = stripLead(accumulated)
            const explicitEndCall = cleaned.includes('[END_CALL]')
            const inferredEndCall = hasRequiredLead(mergedLead) &&
              (userWantsToEnd(lastUserMessage()) || assistantClosed(cleaned))
            const endCall  = explicitEndCall || inferredEndCall
            const fullText = displayText(accumulated)

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
