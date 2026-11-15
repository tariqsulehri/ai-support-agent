import { NextRequest, NextResponse } from 'next/server'
import { getLangConfig } from '@/lib/config/language'
import { resolveTenantTtsVoice } from '@/lib/config/voice'
import { assertOpenAIKeyConfigured } from '@/lib/ai/client'
import { recordUsageEvent } from '@/lib/observability/usage'
import { requireTenantRuntime } from '@/lib/api/tenant-runtime'
import { background } from '@/lib/api/request-guards'
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
// The tenant is resolved from request headers (not the URL), so shared caches
// must never store this response: a CDN keyed on URL could serve one tenant's
// config to another. Browsers may still cache it privately.
const CACHE_CONTROL = 'private, max-age=60'

export async function GET(req: NextRequest) {
  try {
    const runtime = await requireTenantRuntime(req, 'config', { requireDatabase: false })
    if (runtime.response) return runtime.response
    const { tenant } = runtime

    background(recordUsageEvent({ tenantId: tenant.id, type: 'config.request' }), 'config usage')

    const cacheKey = tenant.id
    const now = Date.now()
    const cached = configCache.get(cacheKey)

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': CACHE_CONTROL,
          Vary: 'x-embed-tenant, x-embed-token, x-embed-session, x-api-key',
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

    if (configCache.size > 1000) {
      for (const [key, entry] of configCache) {
        if (entry.expiresAt <= now) configCache.delete(key)
      }
    }
    configCache.set(cacheKey, { data: payload, expiresAt: now + CACHE_TTL_MS })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': CACHE_CONTROL,
        Vary: 'x-embed-tenant, x-embed-token, x-embed-session, x-api-key',
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[config]', message)
    return NextResponse.json({ error: 'Configuration failed' }, { status: 500 })
  }
}
