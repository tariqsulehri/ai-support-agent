import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { env } from '@/lib/config/env'
import { requireEmbedApiAuth } from '@/lib/security/embed-auth'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireEmbedApiAuth(req)
  if (authError) return authError

  const lang = getLangConfig()

  return NextResponse.json({
    language:    lang.name,
    ttsProvider: env.TTS_PROVIDER,
    voice:       env.TTS_VOICE,
  })
}
