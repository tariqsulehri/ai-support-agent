import { NextRequest } from 'next/server'
import { streamChatReply, extractSentences } from '@/lib/ai/chat'
import { evaluateCustomerMessage } from '@/lib/ai/conversation-policy'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import {
  background,
  bodyErrorResponse,
  readJsonBody,
  sanitizeChatHistory,
  sanitizeLead,
} from '@/lib/api/request-guards'
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

const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 2000
const MAX_BODY_BYTES = 256 * 1024

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
  const runtime = await requireTenantRuntime(req, 'chat', { requireDatabase: false })
  if (runtime.response) return runtime.response
  const { tenant } = runtime

  let messages: ChatMessage[]
  let existingLead: Partial<LeadData> = {}
  try {
    const body = await readJsonBody<{ messages?: unknown; lead?: unknown }>(req, MAX_BODY_BYTES)
    const sanitized = sanitizeChatHistory(body?.messages, {
      maxMessages: MAX_HISTORY_MESSAGES,
      maxContentChars: MAX_MESSAGE_CHARS,
    })
    if (!sanitized || sanitized.length === 0) {
      return new Response('Invalid request body', { status: 400 })
    }
    messages = sanitized
    existingLead = sanitizeLead(body?.lead)
  } catch (err) {
    return bodyErrorResponse(err)
  }

  background(recordUsageEvent({ tenantId: tenant.id, type: 'chat.request' }), 'chat usage')

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

  let cancelled = false
  const stream = new ReadableStream({
    cancel() {
      // Client went away: stop consuming (and paying for) the upstream completion.
      cancelled = true
    },
    async start(controller) {
      let closed = false
      const safeEnqueue = (payload: object) => {
        if (closed) return
        try {
          controller.enqueue(send(payload))
        } catch {
          // Client disconnected; the controller is already closed.
          closed = true
        }
      }
      const safeClose = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      let accumulated        = ''
      let visibleAccumulated = ''
      let sentenceBuffer     = ''

      const finalize = () => {
        const tail = displayText(sentenceBuffer.trim())
        if (tail.length > 0) safeEnqueue({ sentence: tail })

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

        if (lead) safeEnqueue({ lead })
        safeEnqueue({ done: true, fullText, endCall })
        safeClose()
      }

      try {
        const completion = await streamChatReply(messages, tenant)

        for await (const chunk of completion) {
          if (cancelled || closed) {
            completion.controller?.abort()
            closed = true
            break
          }
          const token       = chunk.choices[0]?.delta?.content ?? ''
          const finishReason = chunk.choices[0]?.finish_reason

          if (token) {
            accumulated    += token
            const nextVisible = displayText(accumulated)
            const visibleToken = nextVisible.slice(visibleAccumulated.length)
            visibleAccumulated = nextVisible

            if (visibleToken) {
              sentenceBuffer += visibleToken
              safeEnqueue({ token: visibleToken })
            }

            const { sentences, remainder } = extractSentences(sentenceBuffer)
            sentenceBuffer = remainder
            for (const sentence of sentences) {
              const clean = displayText(sentence)
              if (clean) safeEnqueue({ sentence: clean })
            }
          }

          // Any finish reason ('stop', 'length', 'content_filter', ...) ends the turn.
          if (finishReason) {
            finalize()
            break
          }
        }

        // Stream ended without an explicit finish reason: still close cleanly.
        if (!closed) finalize()
      } catch (err) {
        console.error('[chat]', err instanceof Error ? err.message : err)
        safeEnqueue({ error: 'Chat failed' })
        safeClose()
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
