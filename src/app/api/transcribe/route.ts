import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { getLangConfig } from '@/lib/config/language'
import { requireEmbedApiAuth } from '@/lib/security/embed-auth'
import { normalizeSpeechTranscript } from '@/lib/utils/normalize-speech'
import { recordUsageEvent } from '@/lib/observability/usage'
import { enforceIpRateLimit, requireTenantRuntime } from '@/lib/api/tenant-runtime'
import { background, contentLengthExceeds } from '@/lib/api/request-guards'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

/** Whisper rejects files above 25 MB; refuse them before buffering the upload. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024
/** Multipart framing overhead allowance on top of the audio payload. */
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 64 * 1024

/**
 * POST /api/transcribe
 * Transcribes audio file to text using configured language settings.
 * Requires valid embed API authentication and FormData with 'audio' file.
 * @param {NextRequest} req - HTTP request containing audio file as multipart form data
 * @returns {Promise<NextResponse>} JSON response with transcribed text or error message
 */
export async function POST(req: NextRequest) {
  const limited = enforceIpRateLimit(req, 'transcribe')
  if (limited) return limited

  const authError = await requireEmbedApiAuth(req)
  if (authError) return authError

  if (contentLengthExceeds(req, MAX_REQUEST_BYTES)) {
    return NextResponse.json({ error: 'Audio file too large' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audio = formData.get('audio')
  if (!audio || typeof audio === 'string' || audio.size === 0) {
    return NextResponse.json({ error: 'No audio file received' }, { status: 400 })
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file too large' }, { status: 413 })
  }

  if (audio.size < 4000) {
    return NextResponse.json({ text: '' })
  }

  try {
    const runtime = await requireTenantRuntime(
      req,
      'transcribe',
      { requireDatabase: false },
      { skipAuth: true, skipIpRateLimit: true }
    )
    if (runtime.response) return runtime.response
    const { tenant } = runtime

    background(recordUsageEvent({
      tenantId: tenant.id,
      type: 'transcription.request',
      metadata: { audioBytes: audio.size },
    }), 'transcribe usage')
    const lang   = getLangConfig(tenant.languageMode)
    const raw    = await transcribeAudio(audio, lang.whisperCode, tenant)
    const text   = normalizeSpeechTranscript(raw)
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[transcribe]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
