import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { assertOpenAIKeyConfigured } from '@/lib/ai/client'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'

interface CachedConfig {
  data: {
    tenantId: string
    language: string
    ttsProvider: string
    voice: string
    voiceGender: string | null
    agentName: string
    companyName: string
    greeting: string | null
  }
  expiresAt: number
}

const configCache = new Map<string, CachedConfig>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET(req: NextRequest) {
  try {
    const runtime = await requireTenantRuntime(req, 'config', { requireDatabase: false })
    if (runtime.response) return runtime.response
    const { tenant } = runtime

    await recordUsageEvent({ tenantId: tenant.id, type: 'config.request' })

    const cacheKey = tenant.id
    const now = Date.now()
    const cached = configCache.get(cacheKey)

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
          'X-Cache': 'HIT',
        },
      })
    }

    const lang   = getLangConfig(tenant.languageMode)
    assertOpenAIKeyConfigured(tenant)

    const payload = {
      tenantId:    tenant.id,
      language:    lang.name,
      ttsProvider: tenant.ttsProvider,
      voice:       resolveTenantTtsVoice(tenant),
      voiceGender: tenant.voiceProfile?.gender ?? null,
      agentName:   tenant.agentName,
      companyName: tenant.companyName,
      greeting:    tenant.greeting ?? null,
    }

    configCache.set(cacheKey, { data: payload, expiresAt: now + CACHE_TTL_MS })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[config]', message)
    return NextResponse.json({ error: 'Configuration failed', detail: message }, { status: 500 })
  }
}
