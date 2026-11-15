import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { canMutateDashboard, getVerifiedSession } from '@/lib/auth/session'
import { embedSnippet, generateEmbedToken, getManagedTenantDetail } from '@/lib/tenants/management'
import { maskClientApiKey } from '@/lib/security/client-keys'
import type { AuthSession } from '@/lib/auth/types'
import { TenantDetailView } from './tenant-detail-view'
import { toTabKey, toTenantDetailData, toViewerInfo, type TenantPermissions } from './_components/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>
  searchParams?: Promise<{ created?: string; tab?: string }>
}

const normalize = (value: string) => value.toLowerCase().trim()

function canAccessTenant(session: AuthSession, requestedId: string, resolvedTenantId?: string): boolean {
  if (session.role === 'platform_admin') return true
  if (!session.tenantId) return false
  const own = normalize(session.tenantId)
  return own === normalize(requestedId) || (resolvedTenantId ? own === normalize(resolvedTenantId) : false)
}

function permissionsFor(session: AuthSession, tenantId: string): TenantPermissions {
  const isPlatformAdmin = session.role === 'platform_admin'
  const ownsTenant = Boolean(session.tenantId) && normalize(session.tenantId ?? '') === normalize(tenantId)
  return {
    canManage: isPlatformAdmin || (ownsTenant && canMutateDashboard(session)),
    canSetDomains: isPlatformAdmin,
  }
}

export default async function TenantDetailPage({ params, searchParams }: TenantDetailPageProps) {
  const [{ tenantId }, pageParams, headerStore, session] = await Promise.all([
    params,
    searchParams,
    headers(),
    getVerifiedSession(),
  ])
  if (!session) redirect(`/tenant/login?next=${encodeURIComponent(`/admin/tenants/${tenantId}`)}`)

  // Reject cross-tenant requests before touching tenant data (a tenant user
  // may only open their own tenant id/slug).
  if (session.role !== 'platform_admin' && !session.tenantId) {
    redirect('/dashboard?tab=overview&error=access_denied')
  }

  let detail: Awaited<ReturnType<typeof getManagedTenantDetail>>
  try {
    detail = await getManagedTenantDetail(tenantId)
  } catch {
    // assertTenantId throws on malformed ids.
    detail = null
  }

  if (!detail || !canAccessTenant(session, tenantId, detail.tenant.tenantId)) {
    if (session.role === 'platform_admin') redirect('/admin/tenants')
    redirect(`/dashboard?tab=overview&error=${detail ? 'access_denied' : 'tenant_not_found'}`)
  }

  const resolvedId = detail.tenant.tenantId
  const permissions = permissionsFor(session, resolvedId)

  const baseUrl =
    process.env.AGENT_BASE_URL?.trim() ||
    `${headerStore.get('x-forwarded-proto') ?? 'http'}://${headerStore.get('host') ?? 'localhost:3000'}`

  // getManagedTenantDetail always persists a client key when missing.
  const clientApiKey = detail.tenant.clientApiKey ?? ''
  const maskedClientApiKey = clientApiKey ? maskClientApiKey(clientApiKey) : 'Not issued'

  return (
    <TenantDetailView
      data={toTenantDetailData(detail, permissions)}
      viewer={toViewerInfo(session)}
      permissions={permissions}
      voiceUrl={`${baseUrl}/voice?tenant=${encodeURIComponent(resolvedId)}`}
      initialTab={toTabKey(pageParams?.tab)}
      created={Boolean(pageParams?.created)}
      embed={{
        clientApiKey,
        maskedClientApiKey,
        snippet: embedSnippet({ baseUrl, tenantId: resolvedId, clientKey: clientApiKey || undefined }),
        maskedSnippet: embedSnippet({ baseUrl, tenantId: resolvedId, clientKey: clientApiKey ? maskedClientApiKey : undefined }),
        legacySnippet: embedSnippet({ baseUrl, tenantId: resolvedId }),
        // A signed embed token is a live credential: only mint it for managers.
        suggestedEmbedToken: permissions.canManage ? generateEmbedToken(resolvedId) : null,
      }}
    />
  )
}
