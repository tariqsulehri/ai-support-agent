import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = requireEmbedApiAuth(req)
  if (authError) return authError

  const tenant = getTenantFromRequest(req)
  const lang   = getLangConfig(tenant.language)

  return NextResponse.json({
    language:    lang.name,
    ttsProvider: tenant.ttsProvider,
    voice:       tenant.ttsVoice,
    agentName:   tenant.agentName,
    companyName: tenant.companyName,
    greeting:    tenant.greeting ?? null,
  })
}
