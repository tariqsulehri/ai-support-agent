import type { ManagedTenantDetail } from '@/lib/tenants/management'
import type { AuthRole, AuthSession } from '@/lib/auth/types'
import { formatLabel } from '@/lib/admin/forms'

export type TabKey = 'overview' | 'embed' | 'agent' | 'integrations' | 'team'

export const TAB_KEYS: readonly TabKey[] = ['overview', 'embed', 'agent', 'integrations', 'team']

export function toTabKey(value: string | undefined): TabKey {
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : 'overview'
}

export const DETAIL_TABS: ReadonlyArray<{
  id: TabKey
  label: string
  shortLabel: string
  num: number
  description: string
  badgeText: string
}> = [
  {
    id: 'overview',
    label: 'Overview & Readiness',
    shortLabel: 'Readiness Checklist',
    num: 1,
    description: 'Checklist of deployment requirements, runtime status, and platform identity.',
    badgeText: 'Readiness Gate',
  },
  {
    id: 'embed',
    label: 'Embed & Client Key',
    shortLabel: 'Embed & API Keys',
    num: 2,
    description: 'Client API key, website embed script, and domain origin verification.',
    badgeText: 'Embed Security',
  },
  {
    id: 'agent',
    label: 'Agent Persona',
    shortLabel: 'Agent Persona',
    num: 3,
    description: 'Assistant persona, opening greeting, voice tone, guardrails, and knowledge base.',
    badgeText: 'Agent Behavior',
  },
  {
    id: 'integrations',
    label: 'Integrations & Secrets',
    shortLabel: 'OpenAI & MongoDB',
    num: 4,
    description: 'Encrypted OpenAI key, dedicated tenant MongoDB URI, and SMTP alerts.',
    badgeText: 'Cloud Connectors',
  },
  {
    id: 'team',
    label: 'Team Access',
    shortLabel: 'Team Access',
    num: 5,
    description: 'Team members and their assigned tenant roles.',
    badgeText: 'Identity & Access',
  },
]

type SecretSummary = { maskedValue: string; updatedAt: string } | null

/**
 * Plain, serializable view of a tenant that is safe to hand to client
 * components. Never includes password hashes, raw secrets, env-var names,
 * or Mongo ObjectIds.
 */
export type TenantDetailData = {
  tenant: {
    tenantId: string
    publicId: string
    slug: string
    companyName: string
    status: string
    createdAt: string
    clientApiKeyCreatedAt: string | null
    subscriptionStatus: string
    subscriptionType: string
    billingCycle: string
  }
  settings: {
    companyName: string
    agentName: string
    tone: string
    languageMode: string
    greeting: string
    services: string[]
    customInstructions: string
    knowledgeBaseText: string
  }
  email: {
    enabled: boolean
    service: string
    host: string
    port: string
    secure: boolean
    user: string
    fromName: string
    fromEmail: string
    recipients: string[]
    sendToLeadEmail: boolean
  } | null
  domains: Array<{
    origin: string
    status: string
    verificationStatus: string
    /** Only populated for users who can run verification. */
    verificationToken: string | null
  }>
  users: Array<{ userId: string; name: string; email: string; role: AuthRole }>
  openAiSecret: SecretSummary
  databaseUrlSecret: SecretSummary
  smtpPasswordSecret: SecretSummary
}

export type ViewerInfo = {
  name: string
  role: AuthRole
  isPlatformAdmin: boolean
  initials: string
  roleTitle: string
}

export type TenantPermissions = {
  /** Owner/admin of this tenant, or platform admin. */
  canManage: boolean
  /** Only platform admins can change allowed domains. */
  canSetDomains: boolean
}

function iso(value: Date | string | undefined | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function secretSummary(secret: ManagedTenantDetail['openAiSecret']): SecretSummary {
  return secret ? { maskedValue: secret.maskedValue, updatedAt: iso(secret.updatedAt) ?? '' } : null
}

export function toTenantDetailData(detail: ManagedTenantDetail, permissions: TenantPermissions): TenantDetailData {
  const { tenant, settings } = detail
  const email = settings.emailNotifications
  return {
    tenant: {
      tenantId: tenant.tenantId,
      publicId: tenant.publicId,
      slug: tenant.slug,
      companyName: tenant.companyName,
      status: tenant.status,
      createdAt: iso(tenant.createdAt) ?? '',
      clientApiKeyCreatedAt: iso(tenant.clientApiKeyCreatedAt),
      subscriptionStatus: tenant.subscription?.status ?? 'trial',
      subscriptionType: tenant.subscription?.type ?? 'free',
      billingCycle: tenant.subscription?.billingCycle ?? 'monthly',
    },
    settings: {
      companyName: settings.companyName,
      agentName: settings.agentName,
      tone: settings.tone,
      languageMode: settings.languageMode ?? 'english',
      greeting: settings.greeting ?? '',
      services: settings.services ?? [],
      customInstructions: settings.customInstructions ?? '',
      knowledgeBaseText: (settings.knowledgeBase ?? []).map((kb) => `${kb.topic} | ${kb.content}`).join('\n'),
    },
    email: email
      ? {
          enabled: email.enabled,
          service: email.smtp.service ?? '',
          host: email.smtp.host ?? '',
          port: String(email.smtp.port ?? ''),
          secure: email.smtp.secure,
          user: email.smtp.user ?? '',
          fromName: email.fromName ?? '',
          fromEmail: email.fromEmail ?? '',
          recipients: email.recipients ?? [],
          sendToLeadEmail: email.sendToLeadEmail ?? false,
        }
      : null,
    domains: detail.domains.map((domain) => ({
      origin: domain.origin,
      status: domain.status,
      verificationStatus: domain.verificationStatus ?? 'pending',
      verificationToken: permissions.canManage ? domain.verificationToken ?? null : null,
    })),
    users: detail.users.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
    })),
    openAiSecret: secretSummary(detail.openAiSecret),
    databaseUrlSecret: secretSummary(detail.databaseUrlSecret),
    smtpPasswordSecret: secretSummary(detail.smtpPasswordSecret),
  }
}

export function toViewerInfo(session: AuthSession): ViewerInfo {
  const initials =
    session.name
      ?.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  const isPlatformAdmin = session.role === 'platform_admin'
  return {
    name: session.name || session.email,
    role: session.role,
    isPlatformAdmin,
    initials,
    roleTitle: formatLabel(session.role),
  }
}

/** Derived readiness data shared by the hero badge and overview checklist. */
export function readiness(data: TenantDetailData) {
  const verifiedCount = data.domains.filter((d) => d.verificationStatus === 'verified').length
  const subscriptionReady = data.tenant.subscriptionStatus === 'trial' || data.tenant.subscriptionStatus === 'active'
  const embedReady =
    data.tenant.status === 'active' && subscriptionReady && Boolean(data.openAiSecret) && verifiedCount > 0
  return { verifiedCount, subscriptionReady, embedReady }
}
