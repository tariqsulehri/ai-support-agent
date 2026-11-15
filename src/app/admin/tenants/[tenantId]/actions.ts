'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getVerifiedSession, canMutateDashboard } from '@/lib/auth/session'
import { getAuthUserByEmail } from '@/lib/auth/users'
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
} from '@/lib/tenants/management'
import { recordAuditLog } from '@/lib/observability/audit'
import {
  actionError,
  actionSuccess,
  firstIssueMessage,
  formChecked,
  formText as text,
  safeErrorMessage,
  type ActionResult,
} from '@/lib/admin/forms'

// ── Authorization ───────────────────────────────────────────────────────────

const tenantIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, 'Invalid tenant ID.')

type Access = 'manage' | 'platform'

type Authorized = { ok: true; session: AuthSession; tenantId: string }
type Denied = { ok: false; result: ActionResult }

/**
 * Re-verifies the session on every call (never trusts the hidden tenantId
 * field): platform admins may act on any tenant; tenant users only on their
 * own tenant and only with a mutating role (owner/admin, not viewer).
 */
async function authorize(formData: FormData, access: Access): Promise<Authorized | Denied> {
  const parsedId = tenantIdSchema.safeParse(text(formData, 'tenantId'))
  const session = await getVerifiedSession()
  if (!session) {
    const next = parsedId.success ? `/admin/tenants/${parsedId.data}` : '/dashboard'
    redirect(`/tenant/login?next=${encodeURIComponent(next)}`)
  }
  if (!parsedId.success) return { ok: false, result: actionError('Invalid tenant ID.') }
  const tenantId = parsedId.data

  if (session.role === 'platform_admin') return { ok: true, session, tenantId }
  if (access === 'platform') {
    return { ok: false, result: actionError('Only platform administrators can perform this action.') }
  }
  const ownsTenant = session.tenantId?.trim().toLowerCase() === tenantId
  if (!ownsTenant || !canMutateDashboard(session)) {
    return { ok: false, result: actionError('You do not have permission to change this tenant.') }
  }
  return { ok: true, session, tenantId }
}

function done(tenantId: string, message: string): ActionResult {
  revalidatePath(`/admin/tenants/${tenantId}`)
  return actionSuccess(message)
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const optionalText = (max: number) => z.string().trim().max(max)

const settingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required.').max(120),
  agentName: z.string().trim().min(1, 'Assistant name is required.').max(80),
  greeting: optionalText(500),
  tone: z.string().trim().min(1, 'Tone is required.').max(200),
  services: optionalText(4000),
  customInstructions: optionalText(8000),
  knowledgeBase: optionalText(50000),
})

const originSchema = z.string().trim().url('Origin must be a valid URL.').max(255)

const verifySchema = z.object({
  origin: originSchema,
  method: z.enum(['well-known', 'meta-tag'], { message: 'Unknown verification method.' }),
})

const openAiKeySchema = z
  .string()
  .trim()
  .min(20, 'OpenAI key looks too short.')
  .max(300)
  .regex(/^sk-[A-Za-z0-9_\-]+$/, 'OpenAI keys start with "sk-".')

const databaseUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .regex(/^mongodb(\+srv)?:\/\//, 'Connection string must start with mongodb:// or mongodb+srv://.')

const emailSchema = z.object({
  service: optionalText(60),
  host: optionalText(255),
  port: z
    .string()
    .trim()
    .regex(/^\d{0,5}$/, 'SMTP port must be a number.')
    .refine((v) => v === '' || (Number(v) > 0 && Number(v) < 65536), 'SMTP port must be 1-65535.'),
  user: optionalText(255),
  password: optionalText(500),
  fromName: optionalText(120),
  fromEmail: z.union([z.literal(''), z.string().trim().email('From email is invalid.')]),
  recipients: optionalText(4000),
})

const embedTokenSchema = z.string().trim().min(16, 'Embed token is too short.').max(2000)

const newUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  name: optionalText(120),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
  role: z.enum(['tenant_admin', 'tenant_owner', 'tenant_viewer']).catch('tenant_admin'),
})

// ── Actions ─────────────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = settingsSchema.safeParse({
    companyName: text(formData, 'companyName'),
    agentName: text(formData, 'agentName'),
    greeting: text(formData, 'greeting'),
    tone: text(formData, 'tone'),
    services: text(formData, 'services'),
    customInstructions: text(formData, 'customInstructions'),
    knowledgeBase: text(formData, 'knowledgeBase'),
  })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const input = parsed.data
  const services = parseLines(input.services)
  const knowledgeBase = parseKnowledgeBase(input.knowledgeBase)

  try {
    await updateManagedTenantSettings({
      tenantId,
      companyName: input.companyName,
      agentName: input.agentName,
      greeting: input.greeting || undefined,
      tone: input.tone,
      services,
      customInstructions: input.customInstructions || undefined,
      knowledgeBase,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.settings_updated',
      actor: session,
      metadata: {
        agentName: input.agentName,
        tone: input.tone,
        servicesCount: services.length,
        knowledgeBaseCount: knowledgeBase.length,
      },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'Agent persona saved.')
}

export async function saveDomainsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'platform')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const domains = parseDomains(text(formData, 'domains').slice(0, 20000))
  const invalid = domains.find((d) => !originSchema.safeParse(d).success)
  if (invalid) return actionError(`"${invalid}" is not a valid origin URL.`)
  if (domains.length > 100) return actionError('A tenant can have at most 100 allowed domains.')

  try {
    await updateManagedTenantDomains(tenantId, domains)
    await recordAuditLog({
      tenantId,
      action: 'tenant.domains_updated',
      actor: session,
      metadata: { domainCount: domains.length },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, `Saved ${domains.length} allowed domain${domains.length === 1 ? '' : 's'}.`)
}

export async function verifyDomainAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = verifySchema.safeParse({ origin: text(formData, 'origin'), method: text(formData, 'method') })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const { origin, method } = parsed.data

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
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, `${origin} verified.`)
}

export async function saveOpenAiKeyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = openAiKeySchema.safeParse(text(formData, 'openaiApiKey'))
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))

  try {
    await updateManagedTenantOpenAiKey(tenantId, parsed.data)
    await recordAuditLog({ tenantId, action: 'tenant.secret_updated', actor: session, target: 'openai_api_key' })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'OpenAI key encrypted and saved.')
}

export async function saveDatabaseUrlAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = databaseUrlSchema.safeParse(text(formData, 'databaseUrl'))
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))

  try {
    await updateManagedTenantDatabaseUrl(tenantId, parsed.data)
    await recordAuditLog({ tenantId, action: 'tenant.secret_updated', actor: session, target: 'database_url' })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'Database connection string encrypted and saved.')
}

export async function saveEmailNotificationsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = emailSchema.safeParse({
    service: text(formData, 'service'),
    host: text(formData, 'host'),
    port: text(formData, 'port'),
    user: text(formData, 'user'),
    password: text(formData, 'password'),
    fromName: text(formData, 'fromName'),
    fromEmail: text(formData, 'fromEmail'),
    recipients: text(formData, 'recipients'),
  })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const input = parsed.data
  const recipients = parseRecipients(input.recipients)
  const enabled = formChecked(formData, 'enabled')
  const sendToLeadEmail = formChecked(formData, 'sendToLeadEmail')

  try {
    await updateManagedTenantEmailNotifications({
      tenantId,
      enabled,
      service: input.service,
      host: input.host,
      port: input.port,
      secure: formChecked(formData, 'secure'),
      user: input.user,
      password: input.password,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      recipients,
      sendToLeadEmail,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.secret_updated',
      actor: session,
      target: 'smtp_password',
      metadata: {
        enabled,
        service: input.service || undefined,
        host: input.host || undefined,
        port: input.port || undefined,
        recipientCount: recipients.length,
        sendToLeadEmail,
      },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'Email notification settings saved.')
}

export async function saveEmbedTokenAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = embedTokenSchema.safeParse(text(formData, 'embedToken'))
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))

  try {
    await updateManagedTenantEmbedToken(tenantId, parsed.data)
    await recordAuditLog({ tenantId, action: 'tenant.embed_token_rotated', actor: session })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'Legacy embed token saved.')
}

export async function renewClientApiKeyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  try {
    await renewManagedTenantClientApiKey(tenantId)
    await recordAuditLog({ tenantId, action: 'tenant.client_api_key_renewed', actor: session })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, 'Client API key renewed. Update the snippet on your website.')
}

export async function createTenantUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const auth = await authorize(formData, 'manage')
  if (!auth.ok) return auth.result
  const { session, tenantId } = auth

  const parsed = newUserSchema.safeParse({
    email: text(formData, 'email'),
    name: text(formData, 'name'),
    password: String(formData.get('password') ?? ''),
    role: text(formData, 'role'),
  })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const input = parsed.data

  // Only platform admins may grant the owner role.
  const role = input.role === 'tenant_owner' && session.role !== 'platform_admin' ? 'tenant_admin' : input.role

  try {
    // createManagedTenantUser upserts by email. Without this guard a tenant
    // admin could "re-add" an existing teammate (e.g. the owner) and thereby
    // reset their password or demote them.
    if (session.role !== 'platform_admin') {
      const existing = await getAuthUserByEmail(input.email)
      if (existing) return actionError('A user with this email already exists.')
    }

    await createManagedTenantUser({
      tenantId,
      email: input.email,
      password: input.password,
      name: input.name || undefined,
      role,
    })
    await recordAuditLog({
      tenantId,
      action: 'tenant.user_created',
      actor: session,
      target: input.email,
      metadata: { role },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }
  return done(tenantId, `${input.email} added as ${role.replace('tenant_', '')}.`)
}
