import { NextRequest, NextResponse } from 'next/server'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import {
  getTenantRuntimeConfigurationMessages,
  type TenantRuntimeConfigurationCheck,
} from '@/lib/tenants/runtime-configuration'
import type { TenantConfig } from '@/lib/tenants/types'
import { checkIpRateLimit, getClientIp, tooManyRequests } from './request-guards'

type RuntimeAction = Parameters<typeof requireTenantRuntimeAccess>[1]

type RuntimeConfigurationCheckFactory = (tenant: TenantConfig) => TenantRuntimeConfigurationCheck

export type TenantRuntimeGuardResult =
  | { tenant: TenantConfig; response?: never }
  | { tenant?: never; response: NextResponse }

const IP_WINDOW_MS = 60_000

/**
 * Per-client-IP request budget per minute for each runtime action. This sits in
 * front of the per-tenant plan limit so a single visitor cannot exhaust a
 * tenant's quota (or run up OpenAI cost) on its own.
 */
type IpRateLimitedAction = RuntimeAction | 'conversation'

const IP_LIMITS_PER_MINUTE: Record<IpRateLimitedAction, number> = {
  config: 60,
  chat: 40,
  transcribe: 40,
  speak: 120,
  summarize: 10,
  embed_session: 30,
  conversation: 60,
}

/** Applies the per-IP limiter for an action. Returns a 429 response when exceeded. */
export function enforceIpRateLimit(req: NextRequest, action: IpRateLimitedAction): NextResponse | null {
  const retryAfter = checkIpRateLimit(
    `${action}:${getClientIp(req)}`,
    IP_LIMITS_PER_MINUTE[action],
    IP_WINDOW_MS
  )
  return retryAfter === null ? null : tooManyRequests(retryAfter)
}

export async function requireTenantRuntime(
  req: NextRequest,
  action: RuntimeAction,
  configurationCheck: TenantRuntimeConfigurationCheck | RuntimeConfigurationCheckFactory = {},
  options: { skipAuth?: boolean; skipIpRateLimit?: boolean } = {}
): Promise<TenantRuntimeGuardResult> {
  if (!options.skipIpRateLimit) {
    const limited = enforceIpRateLimit(req, action)
    if (limited) return { response: limited }
  }

  if (!options.skipAuth) {
    const authError = await requireEmbedApiAuth(req)
    if (authError) return { response: authError }
  }

  let tenant: TenantConfig
  try {
    tenant = await getTenantFromRequest(req)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Cross-tenant violation')) {
      return { response: NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 }) }
    }
    console.error('[tenant-runtime] tenant resolution failed', { action, error: message })
    return { response: NextResponse.json({ error: 'Tenant could not be resolved' }, { status: 500 }) }
  }

  const accessError = requireTenantRuntimeAccess(tenant, action)
  if (accessError) return { response: accessError }

  const check = typeof configurationCheck === 'function'
    ? configurationCheck(tenant)
    : configurationCheck
  const configurationMessages = await getTenantRuntimeConfigurationMessages(tenant, check)

  if (configurationMessages.length > 0) {
    return {
      response: NextResponse.json({
        error: 'Tenant configuration incomplete',
        detail: configurationMessages.join(' '),
        messages: configurationMessages,
      }, { status: 422 }),
    }
  }

  return { tenant }
}
