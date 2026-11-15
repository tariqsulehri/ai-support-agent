'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getVerifiedSession } from '@/lib/auth/session'
import type { AuthSession } from '@/lib/auth/types'
import {
  activateManagedTenant,
  archiveManagedTenant,
  createManagedTenant,
  disableManagedTenant,
  enableManagedTenant,
  parseDomains,
  parseLines,
  updateManagedTenantSubscription,
} from '@/lib/tenants/management'
import { recordAuditLog, type AuditAction } from '@/lib/observability/audit'
import {
  TENANT_BILLING_CYCLES,
  TENANT_SUBSCRIPTION_STATUSES,
  TENANT_SUBSCRIPTION_TYPES,
} from '@/lib/tenants/options'
import {
  actionError,
  actionSuccess,
  firstIssueMessage,
  formText as text,
  safeErrorMessage,
  type ActionResult,
} from '@/lib/admin/forms'

const TENANTS_PATH = '/admin/tenants'

/** Re-verifies the session on every call; all actions here are platform-admin only. */
async function requirePlatformAdmin(): Promise<AuthSession> {
  const session = await getVerifiedSession()
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(TENANTS_PATH)}`)
  if (session.role !== 'platform_admin') redirect('/dashboard')
  return session
}

const tenantIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, 'Tenant ID must be 3-63 characters: lowercase letters, numbers, hyphens.')

const enumOf = <T extends string>(values: readonly T[], label: string) =>
  z.string().refine((v): v is T => (values as readonly string[]).includes(v), `Unknown ${label}.`)

const createTenantSchema = z
  .object({
    tenantId: tenantIdSchema,
    companyName: z.string().trim().min(1, 'Company name is required.').max(120),
    agentName: z.string().trim().max(80),
    greeting: z.string().trim().max(500),
    tone: z.string().trim().max(200),
    services: z.string().max(4000),
    domains: z.string().max(20000),
    embedToken: z.string().trim().min(16, 'Embed token is too short.').max(2000),
    adminName: z.string().trim().max(120),
    adminEmail: z.union([z.literal(''), z.string().trim().toLowerCase().email('Admin email is invalid.').max(254)]),
    adminPassword: z.string().max(200),
    subscriptionStatus: enumOf(TENANT_SUBSCRIPTION_STATUSES, 'subscription status'),
    subscriptionType: enumOf(TENANT_SUBSCRIPTION_TYPES, 'plan type'),
    billingCycle: enumOf(TENANT_BILLING_CYCLES, 'billing cycle'),
  })
  .superRefine((value, ctx) => {
    if (value.adminEmail && value.adminPassword.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'Admin password must be at least 8 characters.' })
    }
    if (!value.adminEmail && value.adminPassword) {
      ctx.addIssue({ code: 'custom', message: 'Admin email is required when a password is set.' })
    }
  })

export async function createTenantAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requirePlatformAdmin()

  const parsed = createTenantSchema.safeParse({
    tenantId: text(formData, 'tenantId'),
    companyName: text(formData, 'companyName'),
    agentName: text(formData, 'agentName'),
    greeting: text(formData, 'greeting'),
    tone: text(formData, 'tone'),
    services: text(formData, 'services'),
    domains: text(formData, 'domains'),
    embedToken: text(formData, 'embedToken'),
    adminName: text(formData, 'adminName'),
    adminEmail: text(formData, 'adminEmail'),
    adminPassword: String(formData.get('adminPassword') ?? ''),
    subscriptionStatus: text(formData, 'subscriptionStatus'),
    subscriptionType: text(formData, 'subscriptionType'),
    billingCycle: text(formData, 'billingCycle'),
  })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const input = parsed.data
  const domains = parseDomains(input.domains)

  try {
    await createManagedTenant({
      tenantId: input.tenantId,
      companyName: input.companyName,
      agentName: input.agentName,
      greeting: input.greeting,
      tone: input.tone,
      services: parseLines(input.services),
      domains,
      embedToken: input.embedToken,
      adminEmail: input.adminEmail,
      adminPassword: input.adminPassword,
      adminName: input.adminName,
      subscriptionStatus: input.subscriptionStatus,
      subscriptionType: input.subscriptionType,
      billingCycle: input.billingCycle,
    })
    await recordAuditLog({
      tenantId: input.tenantId,
      action: 'tenant.created',
      actor: session,
      metadata: {
        companyName: input.companyName,
        domainCount: domains.length,
        subscriptionStatus: input.subscriptionStatus,
        subscriptionType: input.subscriptionType,
        billingCycle: input.billingCycle,
        adminEmail: input.adminEmail || undefined,
      },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }

  revalidatePath(TENANTS_PATH)
  // Navigating to the new tenant is the expected outcome here.
  redirect(`${TENANTS_PATH}/${input.tenantId}?created=1`)
}

type LifecycleOp = 'archive' | 'disable' | 'enable' | 'activate'

const lifecycle: Record<
  LifecycleOp,
  { run: (tenantId: string) => Promise<void>; audit: AuditAction; message: string }
> = {
  archive: { run: archiveManagedTenant, audit: 'tenant.archived', message: 'archived' },
  disable: { run: disableManagedTenant, audit: 'tenant.disabled', message: 'disabled' },
  enable: { run: enableManagedTenant, audit: 'tenant.enabled', message: 'enabled' },
  activate: { run: activateManagedTenant, audit: 'tenant.activated', message: 'reactivated' },
}

const lifecycleSchema = z.object({
  tenantId: tenantIdSchema,
  op: z.enum(['archive', 'disable', 'enable', 'activate']),
})

/** Single entry point for tenant status changes (archive/disable/enable/activate). */
export async function tenantLifecycleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requirePlatformAdmin()
  const parsed = lifecycleSchema.safeParse({ tenantId: text(formData, 'tenantId'), op: text(formData, 'op') })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const { tenantId, op } = parsed.data
  const config = lifecycle[op]

  try {
    await config.run(tenantId)
    await recordAuditLog({ tenantId, action: config.audit, actor: session })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }

  revalidatePath(TENANTS_PATH)
  revalidatePath(`${TENANTS_PATH}/${tenantId}`)
  return actionSuccess(`Tenant ${tenantId} ${config.message}.`)
}

const subscriptionSchema = z.object({
  tenantId: tenantIdSchema,
  status: enumOf(TENANT_SUBSCRIPTION_STATUSES, 'subscription status'),
  type: enumOf(TENANT_SUBSCRIPTION_TYPES, 'plan type'),
  billingCycle: enumOf(TENANT_BILLING_CYCLES, 'billing cycle'),
  seats: z
    .string()
    .trim()
    .regex(/^\d{0,6}$/, 'Seats must be a whole number.'),
  expiresAt: z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(new Date(v).getTime()), 'Expiry date is invalid.'),
})

export async function updateSubscriptionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requirePlatformAdmin()
  const parsed = subscriptionSchema.safeParse({
    tenantId: text(formData, 'tenantId'),
    status: text(formData, 'subscriptionStatus'),
    type: text(formData, 'subscriptionType'),
    billingCycle: text(formData, 'billingCycle'),
    seats: text(formData, 'seats'),
    expiresAt: text(formData, 'expiresAt'),
  })
  if (!parsed.success) return actionError(firstIssueMessage(parsed.error.issues))
  const input = parsed.data

  try {
    await updateManagedTenantSubscription(input)
    await recordAuditLog({
      tenantId: input.tenantId,
      action: 'tenant.subscription_updated',
      actor: session,
      metadata: {
        status: input.status,
        type: input.type,
        billingCycle: input.billingCycle,
        seats: input.seats,
        expiresAt: input.expiresAt,
      },
    })
  } catch (error) {
    return actionError(safeErrorMessage(error))
  }

  revalidatePath(TENANTS_PATH)
  return actionSuccess('Subscription saved.')
}
