import { NextRequest, NextResponse } from 'next/server'
import { requireEmbedApiAuth, getTenantFromRequest } from '@/lib/security/embed-auth'
import { requireTenantRuntimeAccess } from '@/lib/tenants/runtime-access'
import {
  getTenantRuntimeConfigurationMessages,
  type TenantRuntimeConfigurationCheck,
} from '@/lib/tenants/runtime-configuration'
import type { TenantConfig } from '@/lib/tenants/types'

type RuntimeAction = Parameters<typeof requireTenantRuntimeAccess>[1]

type RuntimeConfigurationCheckFactory = (tenant: TenantConfig) => TenantRuntimeConfigurationCheck

export type TenantRuntimeGuardResult =
  | { tenant: TenantConfig; response?: never }
  | { tenant?: never; response: NextResponse }

export async function requireTenantRuntime(
  req: NextRequest,
  action: RuntimeAction,
  configurationCheck: TenantRuntimeConfigurationCheck | RuntimeConfigurationCheckFactory = {},
  options: { skipAuth?: boolean } = {}
): Promise<TenantRuntimeGuardResult> {
  if (!options.skipAuth) {
    const authError = await requireEmbedApiAuth(req)
    if (authError) return { response: authError }
  }

  const tenant = await getTenantFromRequest(req)
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
