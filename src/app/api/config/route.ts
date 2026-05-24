import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { assertOpenAIKeyConfigured } from '@/lib/ai/client'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authError = requireEmbedApiAuth(req)
    if (authError) return authError

    const tenant = getTenantFromRequest(req)
    const lang   = getLangConfig(tenant.languageMode)
    assertOpenAIKeyConfigured(tenant)

    return NextResponse.json({
      language:    lang.name,
      ttsProvider: tenant.ttsProvider,
      voice:       resolveTenantTtsVoice(tenant),
      voiceGender: tenant.voiceProfile?.gender ?? null,
      agentName:   tenant.agentName,
      companyName: tenant.companyName,
      greeting:    tenant.greeting ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[config]', message)
    return NextResponse.json({ error: 'Configuration failed', detail: message }, { status: 500 })
  }
}
