import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { assertOpenAIKeyConfigured } from '@/lib/ai/client'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const runtime = await requireTenantRuntime(req, 'config')
    if (runtime.response) return runtime.response
    const { tenant } = runtime

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
