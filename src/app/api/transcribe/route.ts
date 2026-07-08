import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { getLangConfig } from '@/lib/config/language'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { normalizeSpeechTranscript } from '@/lib/utils/normalize-speech'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import { getTenantRuntimeConfigurationMessages } from '@/lib/tenants/runtime-configuration'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/transcribe
 * Transcribes audio file to text using configured language settings.
 * Requires valid embed API authentication and FormData with 'audio' file.
 * @param {NextRequest} req - HTTP request containing audio file as multipart form data
 * @returns {Promise<NextResponse>} JSON response with transcribed text or error message
 */
export async function POST(req: NextRequest) {
  const authError = await requireEmbedApiAuth(req)
  if (authError) return authError

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audio = formData.get('audio') as File | null
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'No audio file received' }, { status: 400 })
  }

  if (audio.size < 4000) {
    return NextResponse.json({ text: '' })
  }

  try {
    const tenant = await getTenantFromRequest(req)
    const accessError = requireTenantRuntimeAccess(tenant, 'transcribe')
    if (accessError) return accessError

    const configurationMessages = await getTenantRuntimeConfigurationMessages(tenant)
    if (configurationMessages.length > 0) {
      return NextResponse.json({
        error: 'Tenant configuration incomplete',
        detail: configurationMessages.join(' '),
        messages: configurationMessages,
      }, { status: 422 })
    }

    await recordUsageEvent({
      tenantId: tenant.id,
      type: 'transcription.request',
      metadata: { audioBytes: audio.size },
    })
    const lang   = getLangConfig(tenant.languageMode)
    const raw    = await transcribeAudio(audio, lang.whisperCode, tenant)
    const text   = normalizeSpeechTranscript(raw)
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
