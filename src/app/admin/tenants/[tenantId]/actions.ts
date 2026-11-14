'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getVerifiedSession, canMutateDashboard } from '@/lib/auth/session'
import type { AuthSession } from '@/lib/auth/types'
import {
  createManagedTenantUser,
  parseDomains,
  parseKnowledgeBase,
  parseLines,
  parseRecipients,
  renewManagedTenantClientApiKey,
  updateManagedTenantDatabaseUrl,
  updateManagedTenantDomains,
  updateManagedTenantEmailNotifications,
  updateManagedTenantEmbedToken,
  updateManagedTenantOpenAiKey,
  updateManagedTenantSettings,
  verifyManagedTenantDomain,
  type DomainVerificationMethod,
} from '@/lib/tenants/management'
import { recordAuditLog } from '@/lib/observability/audit'
import { formText as text, safeErrorMessage as safeMessage } from '@/lib/admin/forms'

function canManageTenant(session: AuthSession, tenantId: string): boolean {
  return session.role === 'platform_admin' ||
    (session.tenantId === tenantId && canMutateDashboard(session))
}

function canManageTenantSecrets(session: AuthSession, tenantId: string): boolean {
  return session.role === 'platform_admin' ||
    (session.tenantId === tenantId &&
    (session.role === 'tenant_owner' || session.role === 'tenant_admin'))
}

async function requireTenantManager(tenantId: string): Promise<AuthSession> {
  const session = await getVerifiedSession()
  if (!session) redirect(`/tenant/login?next=/admin/tenants/${tenantId}`)
  if (!canManageTenant(session, tenantId)) redirect('/dashboard')
  return session
}

async function requireTenantSecretManager(tenantId: string): Promise<AuthSession> {
  const session = await getVerifiedSession()
  if (!session) redirect(`/tenant/login?next=/admin/tenants/${tenantId}`)
  if (!canManageTenantSecrets(session, tenantId)) redirect('/dashboard')
  return session
}

export async function saveSettingsAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantManager(tenantId)

  try {
    await updateManagedTenantSettings({
      tenantId,
      companyName: text(formData, 'companyName'),
      agentName: text(formData, 'agentName'),
      greeting: text(formData, 'greeting') || undefined,
      tone: text(formData, 'tone'),
      services: parseLines(text(formData, 'services')),
      customInstructions: text(formData, 'customInstructions') || undefined,
      knowledgeBase: parseKnowledgeBase(text(formData, 'knowledgeBase')),
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.settings_updated',
      actor: session,
      metadata: {
        agentName: text(formData, 'agentName'),
        tone: text(formData, 'tone'),
        servicesCount: parseLines(text(formData, 'services')).length,
        knowledgeBaseCount: parseKnowledgeBase(text(formData, 'knowledgeBase')).length,
      },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=agent&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=agent&saved=settings`)
}

export async function saveDomainsAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await getVerifiedSession()
  if (!session || session.role !== 'platform_admin') redirect('/dashboard')

  const domains = parseDomains(text(formData, 'domains'))

  try {
    await updateManagedTenantDomains(tenantId, domains)
    await recordAuditLog({
      tenantId,
      action: 'tenant.domains_updated',
      actor: session,
      metadata: { domainCount: domains.length },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=embed&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=embed&saved=domains`)
}

export async function verifyDomainAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantSecretManager(tenantId)
  const origin = text(formData, 'origin')
  const method = text(formData, 'method') as DomainVerificationMethod

  try {
    await verifyManagedTenantDomain({ tenantId, origin, method })
    await recordAuditLog({
      tenantId,
      action: 'tenant.domain_verified',
      actor: session,
      target: origin,
      metadata: { method },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=embed&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=embed&saved=verification`)
}

export async function saveOpenAiKeyAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantSecretManager(tenantId)

  try {
    await updateManagedTenantOpenAiKey(tenantId, text(formData, 'openaiApiKey'))
    await recordAuditLog({
      tenantId,
      action: 'tenant.secret_updated',
      actor: session,
      target: 'openai_api_key',
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=integrations&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=integrations&saved=openai`)
}

export async function saveDatabaseUrlAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantSecretManager(tenantId)

  try {
    await updateManagedTenantDatabaseUrl(tenantId, text(formData, 'databaseUrl'))
    await recordAuditLog({
      tenantId,
      action: 'tenant.secret_updated',
      actor: session,
      target: 'database_url',
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=integrations&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=integrations&saved=database`)
}

export async function saveEmailNotificationsAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantSecretManager(tenantId)

  try {
    await updateManagedTenantEmailNotifications({
      tenantId,
      enabled: formData.get('enabled') === 'on',
      service: text(formData, 'service'),
      host: text(formData, 'host'),
      port: text(formData, 'port'),
      secure: formData.get('secure') === 'on',
      user: text(formData, 'user'),
      password: text(formData, 'password'),
      fromName: text(formData, 'fromName'),
      fromEmail: text(formData, 'fromEmail'),
      recipients: parseRecipients(text(formData, 'recipients')),
      sendToLeadEmail: formData.get('sendToLeadEmail') === 'on',
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.secret_updated',
      actor: session,
      target: 'smtp_password',
      metadata: {
        enabled: formData.get('enabled') === 'on',
        service: text(formData, 'service') || undefined,
        host: text(formData, 'host') || undefined,
        port: text(formData, 'port') || undefined,
        recipientCount: parseRecipients(text(formData, 'recipients')).length,
        sendToLeadEmail: formData.get('sendToLeadEmail') === 'on',
      },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=integrations&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=integrations&saved=email`)
}

export async function saveEmbedTokenAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantManager(tenantId)

  try {
    await updateManagedTenantEmbedToken(tenantId, text(formData, 'embedToken'))
    await recordAuditLog({
      tenantId,
      action: 'tenant.embed_token_rotated',
      actor: session,
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=embed&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=embed&saved=embed`)
}

export async function renewClientApiKeyAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantManager(tenantId)

  try {
    await renewManagedTenantClientApiKey(tenantId)
    await recordAuditLog({
      tenantId,
      action: 'tenant.client_api_key_renewed',
      actor: session,
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=embed&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=embed&saved=client_key`)
}

export async function createTenantUserAction(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantManager(tenantId)
  const email = text(formData, 'email')
  const role = text(formData, 'role') === 'tenant_owner' && session.role === 'platform_admin'
    ? 'tenant_owner'
    : 'tenant_admin'

  try {
    await createManagedTenantUser({
      tenantId,
      email,
      password: text(formData, 'password'),
      name: text(formData, 'name'),
      role,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.user_created',
      actor: session,
      target: email,
      metadata: { role },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?tab=team&error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?tab=team&saved=user`)
}

