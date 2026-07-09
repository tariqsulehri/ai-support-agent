import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canMutateDashboard, getVerifiedSession } from '@/lib/auth/session'
import {
  createManagedTenantUser,
  embedSnippet,
  formatKnowledgeBase,
  generateEmbedToken,
  getManagedTenantDetail,
  parseDomains,
  parseKnowledgeBase,
  parseLines,
  parseRecipients,
  updateManagedTenantDomains,
  updateManagedTenantDatabaseUrl,
  updateManagedTenantEmailNotifications,
  updateManagedTenantEmbedToken,
  updateManagedTenantOpenAiKey,
  updateManagedTenantSettings,
  verifyManagedTenantDomain,
  type DomainVerificationMethod,
} from '@/lib/tenants/management'
import type { AuthSession } from '@/lib/auth/types'
import { recordAuditLog } from '@/lib/observability/audit'
import { OPENAI_KEY_NOT_CONFIGURED } from '@/lib/tenants/runtime-configuration'
import { CheckboxField, Field, TextArea } from '@/components/admin/form-fields'
import { AdminPanel as Panel } from '@/components/admin/panel'
import { StatusBadge } from '@/components/admin/status-badge'
import { formText as text, formatLabel, safeErrorMessage as safeMessage } from '@/lib/admin/forms'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>
  searchParams?: Promise<{ error?: string; saved?: string; created?: string }>
}

function canAccessTenant(session: AuthSession, tenantId: string): boolean {
  return session.role === 'platform_admin' || session.tenantId === tenantId
}

function canManageTenant(session: AuthSession, tenantId: string): boolean {
  return session.role === 'platform_admin' ||
    (session.tenantId === tenantId && canMutateDashboard(session))
}

function canManageTenantSecrets(session: AuthSession, tenantId: string): boolean {
  return session.tenantId === tenantId &&
    (session.role === 'tenant_owner' || session.role === 'tenant_admin')
}

async function requireTenantManager(tenantId: string): Promise<AuthSession> {
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=/admin/tenants/${tenantId}`)
  if (!canManageTenant(session, tenantId)) redirect('/dashboard')
  return session
}

async function requireTenantSecretManager(tenantId: string): Promise<AuthSession> {
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=/admin/tenants/${tenantId}`)
  if (!canManageTenantSecrets(session, tenantId)) redirect('/dashboard')
  return session
}

async function saveSettingsAction(formData: FormData) {
  'use server'

  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantManager(tenantId)
  const services = parseLines(text(formData, 'services'))
  const knowledgeBase = parseKnowledgeBase(text(formData, 'knowledgeBase'))

  try {
    await updateManagedTenantSettings({
      tenantId,
      companyName: text(formData, 'companyName'),
      agentName: text(formData, 'agentName'),
      greeting: text(formData, 'greeting'),
      tone: text(formData, 'tone'),
      services,
      customInstructions: text(formData, 'customInstructions'),
      knowledgeBase,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.settings_updated',
      actor: session,
      metadata: {
        companyName: text(formData, 'companyName'),
        agentName: text(formData, 'agentName'),
        serviceCount: services.length,
        knowledgeBaseCount: knowledgeBase.length,
        hasCustomInstructions: Boolean(text(formData, 'customInstructions')),
      },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=settings`)
}

async function saveDomainsAction(formData: FormData) {
  'use server'

  const tenantId = text(formData, 'tenantId')
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=/admin/tenants/${tenantId}`)
  if (session.role !== 'platform_admin') redirect('/dashboard')

  const domains = parseDomains(text(formData, 'domains'))
  try {
    await updateManagedTenantDomains(tenantId, domains)
    await recordAuditLog({
      tenantId,
      action: 'tenant.domains_updated',
      actor: session,
      metadata: { domainCount: domains.length, domains },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=domains`)
}

async function verifyDomainAction(formData: FormData) {
  'use server'

  const tenantId = text(formData, 'tenantId')
  const session = await requireTenantSecretManager(tenantId)
  const origin = text(formData, 'origin')
  const method = text(formData, 'method') === 'meta-tag' ? 'meta-tag' : 'well-known' as DomainVerificationMethod

  try {
    await verifyManagedTenantDomain({
      tenantId,
      origin,
      method,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.domain_verified',
      actor: session,
      target: origin,
      metadata: { method },
    })
  } catch (error) {
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=domain`)
}

async function saveOpenAiKeyAction(formData: FormData) {
  'use server'

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
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=openai`)
}

async function saveDatabaseUrlAction(formData: FormData) {
  'use server'

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
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=database`)
}

async function saveEmailNotificationsAction(formData: FormData) {
  'use server'

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
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=email`)
}

async function saveEmbedTokenAction(formData: FormData) {
  'use server'

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
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=embed`)
}

async function createTenantUserAction(formData: FormData) {
  'use server'

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
    redirect(`/admin/tenants/${tenantId}?error=${encodeURIComponent(safeMessage(error))}`)
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
  redirect(`/admin/tenants/${tenantId}?saved=user`)
}

function ChecklistItem({
  label,
  detail,
  complete,
}: {
  label: string
  detail: string
  complete: boolean
}) {
  return (
    <div className="flex gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800'}`}>
        {complete ? 'OK' : '!'}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  )
}

export default async function TenantDetailPage({ params, searchParams }: TenantDetailPageProps) {
  const { tenantId } = await params
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=/admin/tenants/${tenantId}`)
  if (!canAccessTenant(session, tenantId)) redirect('/dashboard')

  const [detail, pageParams, headerStore] = await Promise.all([
    getManagedTenantDetail(tenantId),
    searchParams,
    headers(),
  ])

  if (!detail) redirect('/admin/tenants')

  const baseUrl = process.env.AGENT_BASE_URL?.trim() ||
    `${headerStore.get('x-forwarded-proto') ?? 'http'}://${headerStore.get('host') ?? 'localhost:3000'}`
  const snippet = embedSnippet({ baseUrl, tenantId: detail.tenant.tenantId })
  const suggestedEmbedToken = generateEmbedToken()
  const mutable = canManageTenant(session, detail.tenant.tenantId)
  const canEditSecrets = canManageTenantSecrets(session, detail.tenant.tenantId)
  const canSetDomains = session.role === 'platform_admin'
  const verifiedDomains = detail.domains.filter((domain) => domain.verificationStatus === 'verified')
  const subscriptionStatus = detail.tenant.subscription?.status ?? 'trial'
  const subscriptionReady = subscriptionStatus === 'trial' || subscriptionStatus === 'active'
  const emailConfig = detail.settings.emailNotifications
  const embedReady = detail.tenant.status === 'active' &&
    subscriptionReady &&
    Boolean(detail.openAiSecret) &&
    verifiedDomains.length > 0
  const missingRuntimeMessages = [
    ...(!detail.openAiSecret ? [OPENAI_KEY_NOT_CONFIGURED] : []),
  ]

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 rounded-lg bg-slate-950 px-6 py-5 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Tenant Settings</p>
              <h1 className="mt-1 text-3xl font-semibold">{detail.tenant.companyName}</h1>
              <p className="mt-1 font-mono text-sm text-slate-300">{detail.tenant.tenantId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.role === 'platform_admin' && (
                <Link href="/admin/tenants" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  Tenants
                </Link>
              )}
              <Link href="/dashboard" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Dashboard
              </Link>
              <form action="/api/admin/auth/logout" method="post">
                <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {pageParams?.error && (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {pageParams.error}
          </div>
        )}
        {pageParams?.saved && (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Saved {pageParams.saved}.
          </div>
        )}
        {pageParams?.created && (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Tenant created successfully.
          </div>
        )}
        {missingRuntimeMessages.length > 0 && (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {missingRuntimeMessages.join(' ')}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Panel title="Setup Checklist">
              <div className="grid gap-3 md:grid-cols-2">
                <ChecklistItem
                  label="Domain Added"
                  detail={detail.domains.length ? `${detail.domains.length} domain(s) assigned.` : 'Platform admin must add at least one domain.'}
                  complete={detail.domains.length > 0}
                />
                <ChecklistItem
                  label="Domain Verified"
                  detail={verifiedDomains.length ? `${verifiedDomains.length} domain(s) verified.` : 'Tenant admin must verify domain ownership.'}
                  complete={verifiedDomains.length > 0}
                />
                <ChecklistItem
                  label="OpenAI Key"
                  detail={detail.openAiSecret ? `Stored as ${detail.openAiSecret.maskedValue}.` : OPENAI_KEY_NOT_CONFIGURED}
                  complete={Boolean(detail.openAiSecret)}
                />
                <ChecklistItem
                  label="Subscription"
                  detail={`Current status is ${formatLabel(subscriptionStatus)}.`}
                  complete={subscriptionReady}
                />
                <ChecklistItem
                  label="Lead Database"
                  detail={detail.databaseUrlSecret ? `Stored as ${detail.databaseUrlSecret.maskedValue}.` : 'Optional. Call summaries will skip database saves until a URL is stored.'}
                  complete={true}
                />
                <ChecklistItem
                  label="SMTP Email"
                  detail={emailConfig?.enabled
                    ? detail.smtpPasswordSecret
                      ? `Enabled as ${detail.smtpPasswordSecret.maskedValue}.`
                      : 'Enabled, but SMTP password is not stored yet.'
                    : 'Optional. Tenant can configure SMTP for call summaries.'}
                  complete={!emailConfig?.enabled || Boolean(detail.smtpPasswordSecret)}
                />
                <ChecklistItem
                  label="Embed Ready"
                  detail={embedReady ? 'This tenant can use the verified-domain embed flow.' : 'Complete required items before installing the bot.'}
                  complete={embedReady}
                />
              </div>
            </Panel>

            <Panel title="Agent Profile">
              <form action={saveSettingsAction} className="space-y-4">
                <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company Name" name="companyName" defaultValue={detail.settings.companyName} required />
                  <Field label="Agent Name" name="agentName" defaultValue={detail.settings.agentName} required />
                </div>
                <TextArea label="Greeting" name="greeting" rows={3} defaultValue={detail.settings.greeting ?? ''} />
                <Field label="Tone" name="tone" defaultValue={detail.settings.tone} required />
                <TextArea label="Services" name="services" defaultValue={detail.settings.services.join('\n')} />
                <TextArea label="Custom Instructions" name="customInstructions" rows={5} defaultValue={detail.settings.customInstructions ?? ''} />
                <TextArea
                  label="Knowledge Base"
                  name="knowledgeBase"
                  rows={6}
                  defaultValue={formatKnowledgeBase(detail.settings.knowledgeBase)}
                  placeholder="Pricing | Plans start from ...&#10;Refund Policy | Refunds are handled ..."
                />
                {mutable && (
                  <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                    Save Profile
                  </button>
                )}
              </form>
            </Panel>

            <Panel title="Allowed Domains">
              {canSetDomains ? (
                <form action={saveDomainsAction} className="space-y-4">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <TextArea
                    label="Whitelisted Origins"
                    name="domains"
                    rows={5}
                    defaultValue={detail.domains.map((domain) => domain.origin).join('\n')}
                    placeholder="https://example.com&#10;https://app.example.com"
                  />
                  <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                    Save Domains
                  </button>
                </form>
              ) : (
                <p className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Domains are assigned by the platform admin. Verify each domain before installing the bot.
                </p>
              )}
              <div className="mt-5 space-y-3">
                {detail.domains.length === 0 ? (
                  <p className="text-sm text-slate-500">No domains configured.</p>
                ) : detail.domains.map((domain) => {
                  const token = domain.verificationToken ?? 'Token will be generated after domains are saved again.'
                  return (
                    <div key={domain.origin} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{domain.origin}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge status={domain.verificationStatus ?? 'pending'} />
                            <StatusBadge status={domain.status} />
                          </div>
                        </div>
                        {canEditSecrets && (domain.verificationStatus ?? 'pending') !== 'verified' && (
                          <form action={verifyDomainAction} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                            <input type="hidden" name="origin" value={domain.origin} />
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</span>
                              <select name="method" className="mt-1 h-9 rounded-md border border-slate-200 bg-white px-2 text-sm">
                                <option value="well-known">Well-known file</option>
                                <option value="meta-tag">Meta tag</option>
                              </select>
                            </label>
                            <button className="h-9 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800">
                              Verify
                            </button>
                          </form>
                        )}
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p>Add this token to the domain before clicking verify:</p>
                        <pre className="overflow-x-auto rounded-md bg-white p-3 font-mono text-xs text-slate-800">{token}</pre>
                        <p>File method: publish the token at <span className="font-mono">/.well-known/voice-agent-verification.txt</span>.</p>
                        <p>Meta method: include <span className="font-mono">{`<meta name="voice-agent-verification" content="${token}">`}</span> on the homepage.</p>
                        {domain.lastVerificationError && (
                          <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700">{domain.lastVerificationError}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Tenant Status">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Runtime Status</p>
                  <div className="mt-2"><StatusBadge status={detail.tenant.status} /></div>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={detail.tenant.subscription?.status ?? 'trial'} />
                    <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                      {formatLabel(detail.tenant.subscription?.type ?? 'free')}
                    </span>
                  </div>
                </div>
              </div>
              {session.role === 'platform_admin' && (
                <Link href="/admin/tenants?tab=subscriptions" className="mt-4 inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Manage Subscription
                </Link>
              )}
            </Panel>

            <Panel title="Embed Snippet">
              <p className="mb-3 text-sm leading-6 text-slate-500">
                Use the latest embed token you created or rotated for this tenant.
              </p>
              <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-cyan-100">{snippet}</pre>
              {mutable && (
                <form action={saveEmbedTokenAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <Field label="Replace Embed Token" name="embedToken" defaultValue={suggestedEmbedToken} required autoComplete="off" />
                  <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                    Save Token
                  </button>
                </form>
              )}
            </Panel>

            <Panel title="OpenAI Key">
              <p className="text-sm text-slate-500">
                Current key: {detail.openAiSecret ? detail.openAiSecret.maskedValue : OPENAI_KEY_NOT_CONFIGURED}
              </p>
              {canEditSecrets ? (
                <form action={saveOpenAiKeyAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <Field label="New OpenAI API Key" name="openaiApiKey" type="password" required autoComplete="off" />
                  <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                    Save Key
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Tenant owner or admin must add or replace this key.
                </p>
              )}
            </Panel>

            <Panel title="Database URL">
              <p className="text-sm text-slate-500">
                Current URL: {detail.databaseUrlSecret ? detail.databaseUrlSecret.maskedValue : 'Not stored. Call summaries will skip database saves until a URL is stored.'}
              </p>
              {canEditSecrets ? (
                <form action={saveDatabaseUrlAction} className="mt-4 space-y-3">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <Field label="New Database URL" name="databaseUrl" type="password" required autoComplete="off" />
                  <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                    Save URL
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Tenant owner or admin must add or replace this URL.
                </p>
              )}
            </Panel>

            <Panel title="SMTP Email">
              <p className="text-sm text-slate-500">
                Current password: {detail.smtpPasswordSecret ? detail.smtpPasswordSecret.maskedValue : 'Not stored'}
              </p>
              {canEditSecrets ? (
                <form action={saveEmailNotificationsAction} className="mt-4 space-y-4">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CheckboxField label="Enable email notifications" name="enabled" defaultChecked={emailConfig?.enabled ?? false} />
                    <CheckboxField label="Use secure SMTP" name="secure" defaultChecked={emailConfig?.smtp.secure ?? true} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Service" name="service" defaultValue={emailConfig?.smtp.service ?? 'gmail'} autoComplete="off" />
                    <Field label="Host" name="host" defaultValue={emailConfig?.smtp.host ?? 'smtp.gmail.com'} autoComplete="off" />
                    <Field label="Port" name="port" type="number" defaultValue={String(emailConfig?.smtp.port ?? 465)} autoComplete="off" />
                    <Field label="SMTP User" name="user" type="email" defaultValue={emailConfig?.smtp.user ?? emailConfig?.fromEmail ?? ''} autoComplete="off" />
                    <Field label="SMTP Password" name="password" type="password" autoComplete="new-password" />
                    <Field label="From Email" name="fromEmail" type="email" defaultValue={emailConfig?.fromEmail ?? ''} autoComplete="off" />
                  </div>
                  <Field label="From Name" name="fromName" defaultValue={emailConfig?.fromName ?? `${detail.tenant.companyName} Voice Agent`} autoComplete="off" />
                  <TextArea
                    label="Recipients"
                    name="recipients"
                    rows={3}
                    defaultValue={(emailConfig?.recipients ?? []).join('\n')}
                    placeholder="sales@example.com&#10;support@example.com"
                  />
                  <CheckboxField label="Send summary to captured lead email" name="sendToLeadEmail" defaultChecked={emailConfig?.sendToLeadEmail ?? false} />
                  <button className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
                    Save SMTP
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Tenant owner or admin must add or replace SMTP settings.
                </p>
              )}
            </Panel>

            <Panel title="Tenant Users">
              <div className="space-y-3">
                {detail.users.length === 0 ? (
                  <p className="text-sm text-slate-500">No tenant users yet.</p>
                ) : (
                  detail.users.map((user) => (
                    <div key={user.userId} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-950">{user.name}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{user.role}</p>
                    </div>
                  ))
                )}
              </div>
              {mutable && (
                <form action={createTenantUserAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="tenantId" value={detail.tenant.tenantId} />
                  <Field label="Name" name="name" autoComplete="off" />
                  <Field label="Email" name="email" type="email" required autoComplete="off" />
                  <Field label="Password" name="password" type="password" required autoComplete="new-password" />
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">Role</span>
                    <select name="role" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm">
                      <option value="tenant_admin">Tenant Admin</option>
                      <option value="tenant_owner">Tenant Owner</option>
                    </select>
                  </label>
                  <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                    Create User
                  </button>
                </form>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  )
}
