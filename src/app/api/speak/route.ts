import { NextRequest, NextResponse } from 'next/server'
import { synthesizeSpeech } from '@/lib/ai/tts'
import { requireEmbedApiAuth } from '@/lib/security/embed-auth'
import type { SpeakRequest } from '@/types'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = requireEmbedApiAuth(req)
  if (authError) return authError

  let body: SpeakRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { text, voice } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const audioBuffer = await synthesizeSpeech(text, voice)

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type':   'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control':  'no-store',
      },
    })
  } catch (err) {
    console.error('[speak]', err)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
