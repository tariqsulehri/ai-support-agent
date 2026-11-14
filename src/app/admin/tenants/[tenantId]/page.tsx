import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { canMutateDashboard, getVerifiedSession } from '@/lib/auth/session'
import {
  generateClientApiKey,
  generateEmbedToken,
  getManagedTenantDetail,
  embedSnippet,
} from '@/lib/tenants/management'
import type { AuthSession } from '@/lib/auth/types'
import { TenantDetailView } from './tenant-detail-view'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>
  searchParams?: Promise<{ error?: string; saved?: string; created?: string; tab?: string }>
}

function canAccessTenant(session: AuthSession, tenantId: string): boolean {
  return session.role === 'platform_admin' || session.tenantId === tenantId
}

function canManageTenant(session: AuthSession, tenantId: string): boolean {
  return (
    session.role === 'platform_admin' ||
    (session.tenantId === tenantId && canMutateDashboard(session))
  )
}

function canManageTenantSecrets(session: AuthSession, tenantId: string): boolean {
  return (
    session.tenantId === tenantId &&
    (session.role === 'tenant_owner' || session.role === 'tenant_admin')
  )
}

export default async function TenantDetailPage({ params, searchParams }: TenantDetailPageProps) {
  const { tenantId } = await params
  const session = await getVerifiedSession()
  if (!session) redirect(`/tenant/login?next=/admin/tenants/${tenantId}`)
  if (!canAccessTenant(session, tenantId)) redirect('/dashboard')

  const [detail, pageParams, headerStore] = await Promise.all([
    getManagedTenantDetail(tenantId),
    searchParams,
    headers(),
  ])

  if (!detail) redirect('/admin/tenants')

  const baseUrl =
    process.env.AGENT_BASE_URL?.trim() ||
    `${headerStore.get('x-forwarded-proto') ?? 'http'}://${headerStore.get('host') ?? 'localhost:3000'}`

  const clientApiKey = detail.tenant.clientApiKey || generateClientApiKey(detail.tenant.tenantId)
  const clientKeySnippet = embedSnippet({
    baseUrl,
    tenantId: detail.tenant.tenantId,
    clientKey: clientApiKey,
  })
  const legacySnippet = embedSnippet({ baseUrl, tenantId: detail.tenant.tenantId })
  const suggestedEmbedToken = generateEmbedToken(detail.tenant.tenantId)

  const mutable = canManageTenant(session, detail.tenant.tenantId)
  const canEditSecrets = canManageTenantSecrets(session, detail.tenant.tenantId)
  const canSetDomains = session.role === 'platform_admin'

  return (
    <TenantDetailView
      detail={detail}
      session={session}
      baseUrl={baseUrl}
      clientApiKey={clientApiKey}
      clientKeySnippet={clientKeySnippet}
      legacySnippet={legacySnippet}
      suggestedEmbedToken={suggestedEmbedToken}
      mutable={mutable}
      canEditSecrets={canEditSecrets}
      canSetDomains={canSetDomains}
      initialTab={pageParams?.tab || 'overview'}
      errorParam={pageParams?.error}
      savedParam={pageParams?.saved}
      createdParam={pageParams?.created}
    />
  )
}
