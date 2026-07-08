import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { assertOpenAIKeyConfigured } from '@/lib/ai/client'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import { getTenantRuntimeConfigurationMessages } from '@/lib/tenants/runtime-configuration'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authError = await requireEmbedApiAuth(req)
    if (authError) return authError

    const tenant = await getTenantFromRequest(req)
    const accessError = requireTenantRuntimeAccess(tenant, 'config')
    if (accessError) return accessError

    const configurationMessages = await getTenantRuntimeConfigurationMessages(tenant)
    if (configurationMessages.length > 0) {
      return NextResponse.json({
        error: 'Tenant configuration incomplete',
        detail: configurationMessages.join(' '),
        messages: configurationMessages,
      }, { status: 422 })
    }

    await recordUsageEvent({ tenantId: tenant.id, type: 'config.request' })
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
