import { NextRequest, NextResponse } from 'next/server'
import { synthesizeSpeech } from '@/lib/ai/tts'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { requireEmbedApiAuth } from '@/lib/security/embed-auth'
import { recordUsageEvent } from '@/lib/observability/usage'
import { enforceIpRateLimit, requireTenantRuntime } from '@/lib/api/tenant-runtime'
import { background, bodyErrorResponse, readJsonBody } from '@/lib/api/request-guards'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

const TTS_TIMEOUT_MS = 30_000
const MAX_TEXT_CHARS = 2000
const MAX_BODY_BYTES = 16 * 1024

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TTS timed out'))
    }, timeoutMs)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout))
  })
}

export async function POST(req: NextRequest) {
  const limited = enforceIpRateLimit(req, 'speak')
  if (limited) return limited

  const authError = await requireEmbedApiAuth(req)
  if (authError) return authError

  let text: string
  try {
    const body = await readJsonBody<{ text?: unknown }>(req, MAX_BODY_BYTES)
    text = typeof body?.text === 'string' ? body.text : ''
  } catch (err) {
    return bodyErrorResponse(err)
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: 'Text exceeds maximum synthesizable character limit (2,000 characters)' },
      { status: 400 }
    )
  }

  try {
    const runtime = await requireTenantRuntime(req, 'speak', (tenant) => ({
      requireDatabase: false,
      requireOpenAI: tenant.ttsProvider === 'openai',
    }), { skipAuth: true, skipIpRateLimit: true })
    if (runtime.response) return runtime.response
    const { tenant } = runtime

    background(recordUsageEvent({
      tenantId: tenant.id,
      type: 'tts.request',
      metadata: { textChars: text.length },
    }), 'speak usage')
    const resolvedVoice    = resolveTenantTtsVoice(tenant)
    const resolvedProvider = tenant.ttsProvider

    const audioBuffer = await withTimeout(
      synthesizeSpeech(text, resolvedVoice, resolvedProvider, tenant),
      TTS_TIMEOUT_MS
    )

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type':   'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control':  'no-store',
        'X-TTS-Provider': resolvedProvider,
        'X-TTS-Voice':    resolvedVoice,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[speak]', message)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
