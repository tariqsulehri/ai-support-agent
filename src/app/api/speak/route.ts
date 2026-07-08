import { NextRequest, NextResponse } from 'next/server'
import { synthesizeSpeech } from '@/lib/ai/tts'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import { getTenantRuntimeConfigurationMessages } from '@/lib/tenants/runtime-configuration'
import type { SpeakRequest } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

const TTS_TIMEOUT_MS = 12_000

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
  const authError = await requireEmbedApiAuth(req)
  if (authError) return authError

  let body: SpeakRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { text } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const tenant           = await getTenantFromRequest(req)
    const accessError = requireTenantRuntimeAccess(tenant, 'speak')
    if (accessError) return accessError

    const configurationMessages = await getTenantRuntimeConfigurationMessages(tenant, {
      requireOpenAI: tenant.ttsProvider === 'openai',
    })
    if (configurationMessages.length > 0) {
      return NextResponse.json({
        error: 'Tenant configuration incomplete',
        detail: configurationMessages.join(' '),
        messages: configurationMessages,
      }, { status: 422 })
    }

    await recordUsageEvent({
      tenantId: tenant.id,
      type: 'tts.request',
      metadata: { textChars: text.length },
    })
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
    return NextResponse.json({ error: 'TTS failed', detail: message }, { status: 500 })
  }
}
