import { randomBytes } from 'crypto'
import type { Collection, Db } from 'mongodb'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { getAuthUserByEmail, listAuthUsersForTenant, upsertAuthUser } from '@/lib/auth/users'
import type { AuthRole, AuthUserRecord } from '@/lib/auth/types'
import { hashTenantCredential } from './hash'
import { normalizeOrigin, normalizeTenantId } from './normalize'
import { ensureTenantRegistryIndexes } from './db-registry'
import { getTenantSecretMetadata, upsertTenantSecretInDb, type TenantSecretPublicMetadata } from './secrets'
import {
  TENANT_COLLECTIONS,
  type TenantAgentSettingsRecord,
  type TenantBillingCycle,
  type TenantDomainRecord,
  type TenantEmbedKeyRecord,
  type TenantRecord,
  type TenantSubscriptionStatus,
  type TenantSubscriptionType,
  type TenantStatus,
} from './db-types'
import type { EmailNotificationConfig, KBEntry } from './types'

const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/

type TenantCollections = {
  tenants: Collection<TenantRecord>
  settings: Collection<TenantAgentSettingsRecord>
  domains: Collection<TenantDomainRecord>
  embedKeys: Collection<TenantEmbedKeyRecord>
}

export type DomainVerificationMethod = 'well-known' | 'meta-tag'

export type ManagedTenantSummary = {
  tenantId: string
  companyName: string
  status: TenantStatus
  subscriptionStatus: TenantSubscriptionStatus
  subscriptionType: TenantSubscriptionType
  billingCycle: TenantBillingCycle
  domains: string[]
  updatedAt: Date
  hasOpenAiKey: boolean
}

export type ManagedTenantDetail = {
  tenant: TenantRecord
  settings: TenantAgentSettingsRecord
  domains: TenantDomainRecord[]
  users: AuthUserRecord[]
  openAiSecret: TenantSecretPublicMetadata | null
  databaseUrlSecret: TenantSecretPublicMetadata | null
  smtpPasswordSecret: TenantSecretPublicMetadata | null
}

export type CreateManagedTenantInput = {
  tenantId: string
  companyName: string
  agentName?: string
  greeting?: string
  tone?: string
  services?: string[]
  domains?: string[]
  embedToken: string
  adminEmail?: string
  adminPassword?: string
  adminName?: string
  subscriptionStatus?: string
  subscriptionType?: string
  billingCycle?: string
}

export type UpdateManagedTenantSettingsInput = {
  tenantId: string
  companyName: string
  agentName: string
  greeting?: string
  tone: string
  services: string[]
  customInstructions?: string
  knowledgeBase: KBEntry[]
}

export type UpdateManagedTenantEmailInput = {
  tenantId: string
  enabled: boolean
  service?: string
  host?: string
  port?: string
  secure: boolean
  user?: string
  password?: string
  fromName?: string
  fromEmail?: string
  recipients: string[]
  sendToLeadEmail: boolean
}

function collections(db: Db): TenantCollections {
  return {
    tenants: db.collection<TenantRecord>(TENANT_COLLECTIONS.tenants),
    settings: db.collection<TenantAgentSettingsRecord>(TENANT_COLLECTIONS.settings),
    domains: db.collection<TenantDomainRecord>(TENANT_COLLECTIONS.domains),
    embedKeys: db.collection<TenantEmbedKeyRecord>(TENANT_COLLECTIONS.embedKeys),
  }
}

async function getManagementDb(): Promise<Db> {
  if (!isMongoConfigured()) throw new Error('MongoDB is required for tenant management.')
  const db = await getMongoDb()
  if (!db) throw new Error('MongoDB is required for tenant management.')
  await ensureTenantRegistryIndexes(db)
  return db
}

export function generateEmbedToken(): string {
  return randomBytes(24).toString('base64url')
}

export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseDomains(value: string): string[] {
  const domains = parseLines(value)
    .map((domain) => normalizeOrigin(domain))
    .filter((domain): domain is string => Boolean(domain))

  return Array.from(new Set(domains))
}

export function parseKnowledgeBase(value: string): KBEntry[] {
  return parseLines(value).flatMap((line) => {
    const separatorIndex = line.indexOf('|')
    if (separatorIndex <= 0) return []

    const topic = line.slice(0, separatorIndex).trim()
    const content = line.slice(separatorIndex + 1).trim()
    if (!topic || !content) return []

    return [{ topic, content }]
  })
}

export function parseRecipients(value: string): string[] {
  return Array.from(new Set(
    parseLines(value).flatMap((line) =>
      line
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)
    )
  ))
}

export function formatKnowledgeBase(entries: KBEntry[] | undefined): string {
  return (entries ?? []).map((entry) => `${entry.topic} | ${entry.content}`).join('\n')
}

export function assertTenantId(value: string): string {
  const tenantId = normalizeTenantId(value)
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error('Tenant ID must be 3-63 characters, lowercase letters/numbers/hyphens only.')
  }
  return tenantId
}

function requireText(value: string | undefined, label: string): string {
  const trimmed = value?.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  return trimmed
}

function generateDomainVerificationToken(): string {
  return `va-verify-${randomBytes(18).toString('base64url')}`
}

const subscriptionStatuses: TenantSubscriptionStatus[] = ['trial', 'active', 'past_due', 'canceled', 'expired']
const subscriptionTypes: TenantSubscriptionType[] = ['free', 'starter', 'growth', 'enterprise', 'custom']
const billingCycles: TenantBillingCycle[] = ['monthly', 'yearly', 'one_time', 'custom']

function normalizeSubscriptionStatus(value: string | undefined): TenantSubscriptionStatus {
  return subscriptionStatuses.includes(value as TenantSubscriptionStatus)
    ? value as TenantSubscriptionStatus
    : 'trial'
}

function normalizeSubscriptionType(value: string | undefined): TenantSubscriptionType {
  return subscriptionTypes.includes(value as TenantSubscriptionType)
    ? value as TenantSubscriptionType
    : 'free'
}

function normalizeBillingCycle(value: string | undefined): TenantBillingCycle {
  return billingCycles.includes(value as TenantBillingCycle)
    ? value as TenantBillingCycle
    : 'monthly'
}

function defaultSettings(input: CreateManagedTenantInput, now: Date): TenantAgentSettingsRecord {
  return {
    tenantId: assertTenantId(input.tenantId),
    agentName: input.agentName?.trim() || 'Support Agent',
    companyName: requireText(input.companyName, 'Company name'),
    languageMode: 'english',
    supportedLanguages: ['english'],
    tone: input.tone?.trim() || 'friendly, professional, and helpful',
    ttsProvider: 'openai',
    ttsVoice: 'nova',
    services: input.services?.length ? input.services : ['Customer Support'],
    customInstructions: undefined,
    knowledgeBase: [],
    greeting: input.greeting?.trim() || `Hi, I am ${input.agentName?.trim() || 'Support Agent'}. How can I help you today?`,
    createdAt: now,
    updatedAt: now,
  }
}

async function replaceTenantDomains(db: Db, tenantId: string, domains: string[], now = new Date()): Promise<void> {
  const c = collections(db)
  const normalizedTenantId = assertTenantId(tenantId)
  const uniqueDomains = Array.from(new Set(domains))

  await c.domains.updateMany(
    { tenantId: normalizedTenantId },
    { $set: { status: 'disabled', updatedAt: now } }
  )

  if (!uniqueDomains.length) return

  await Promise.all(uniqueDomains.map(async (origin) => {
    const existing = await c.domains.findOne({ tenantId: normalizedTenantId, origin })
    if (existing) {
      await c.domains.updateOne(
        { tenantId: normalizedTenantId, origin },
        {
          $set: {
            status: 'active',
            updatedAt: now,
            verificationStatus: existing.verificationStatus ?? 'pending',
            verificationToken: existing.verificationToken ?? generateDomainVerificationToken(),
          },
        }
      )
      return
    }

    await c.domains.insertOne({
      tenantId: normalizedTenantId,
      origin,
      status: 'active',
      verificationStatus: 'pending',
      verificationToken: generateDomainVerificationToken(),
      createdAt: now,
      updatedAt: now,
    })
  }))
}

export async function listManagedTenants(): Promise<ManagedTenantSummary[]> {
  const db = await getManagementDb()
  const c = collections(db)
  const tenants = await c.tenants.find({}).sort({ createdAt: 1 }).toArray()

  return Promise.all(tenants.map(async (tenant) => {
    const [domains, openAiSecret] = await Promise.all([
      c.domains.find({ tenantId: tenant.tenantId, status: 'active' }).sort({ origin: 1 }).toArray(),
      getTenantSecretMetadata(tenant.tenantId, 'openai_api_key'),
    ])

    const subscription = tenant.subscription

    return {
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      status: tenant.status,
      subscriptionStatus: subscription?.status ?? 'trial',
      subscriptionType: subscription?.type ?? 'free',
      billingCycle: subscription?.billingCycle ?? 'monthly',
      domains: domains.map((domain) => domain.origin),
      updatedAt: tenant.updatedAt,
      hasOpenAiKey: Boolean(openAiSecret),
    }
  }))
}

export async function getManagedTenantDetail(tenantId: string): Promise<ManagedTenantDetail | null> {
  const db = await getManagementDb()
  const c = collections(db)
  const normalizedTenantId = assertTenantId(tenantId)
  const tenant = await c.tenants.findOne({ tenantId: normalizedTenantId })
  if (!tenant) return null

  const [settings, domains, users, openAiSecret, databaseUrlSecret, smtpPasswordSecret] = await Promise.all([
    c.settings.findOne({ tenantId: normalizedTenantId }),
    c.domains.find({ tenantId: normalizedTenantId, status: 'active' }).sort({ origin: 1 }).toArray(),
    listAuthUsersForTenant(normalizedTenantId),
    getTenantSecretMetadata(normalizedTenantId, 'openai_api_key'),
    getTenantSecretMetadata(normalizedTenantId, 'database_url'),
    getTenantSecretMetadata(normalizedTenantId, 'smtp_password'),
  ])

  if (!settings) throw new Error(`Tenant ${normalizedTenantId} is missing agent settings.`)

  return { tenant, settings, domains, users, openAiSecret, databaseUrlSecret, smtpPasswordSecret }
}

export async function createManagedTenant(input: CreateManagedTenantInput): Promise<TenantRecord> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()
  const tenantId = assertTenantId(input.tenantId)
  const companyName = requireText(input.companyName, 'Company name')
  const embedToken = requireText(input.embedToken, 'Embed token')

  const existing = await c.tenants.findOne({ tenantId })
  if (existing) throw new Error(`Tenant ${tenantId} already exists.`)

  const tenant: TenantRecord = {
    tenantId,
    publicId: `tenant_${tenantId}`,
    slug: tenantId,
    companyName,
    status: 'active',
    subscription: {
      status: normalizeSubscriptionStatus(input.subscriptionStatus),
      type: normalizeSubscriptionType(input.subscriptionType),
      billingCycle: normalizeBillingCycle(input.billingCycle),
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }

  const settings = defaultSettings({ ...input, tenantId, companyName }, now)

  await c.tenants.insertOne(tenant)
  await c.settings.insertOne(settings)
  await replaceTenantDomains(db, tenantId, input.domains ?? [], now)
  await c.embedKeys.insertOne({
    tenantId,
    tokenHash: hashTenantCredential(embedToken),
    apiKeyHashes: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  if (input.adminEmail?.trim() && input.adminPassword?.trim()) {
    await createManagedTenantUser({
      email: input.adminEmail,
      password: input.adminPassword,
      name: input.adminName,
      role: 'tenant_admin',
      tenantId,
    })
  }

  return tenant
}

export async function updateManagedTenantSettings(input: UpdateManagedTenantSettingsInput): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()
  const tenantId = assertTenantId(input.tenantId)
  const companyName = requireText(input.companyName, 'Company name')

  await Promise.all([
    c.tenants.updateOne(
      { tenantId },
      { $set: { companyName, updatedAt: now } }
    ),
    c.settings.updateOne(
      { tenantId },
      {
        $set: {
          companyName,
          agentName: requireText(input.agentName, 'Agent name'),
          greeting: input.greeting?.trim() || undefined,
          tone: requireText(input.tone, 'Tone'),
          services: input.services.length ? input.services : ['Customer Support'],
          customInstructions: input.customInstructions?.trim() || undefined,
          knowledgeBase: input.knowledgeBase,
          updatedAt: now,
        } satisfies Partial<TenantAgentSettingsRecord>,
      }
    ),
  ])
}

export async function updateManagedTenantDomains(tenantId: string, domains: string[]): Promise<void> {
  const db = await getManagementDb()
  await replaceTenantDomains(db, tenantId, domains)
}

export async function verifyManagedTenantDomain(input: {
  tenantId: string
  origin: string
  method: DomainVerificationMethod
}): Promise<TenantDomainRecord> {
  const db = await getManagementDb()
  const c = collections(db)
  const tenantId = assertTenantId(input.tenantId)
  const normalizedOrigin = normalizeOrigin(input.origin)
  if (!normalizedOrigin) throw new Error('Domain origin is invalid.')

  const origin = normalizedOrigin
  const domain = await c.domains.findOne({ tenantId, origin, status: 'active' })
  if (!domain) throw new Error('Domain is not active for this tenant.')

  const token = domain.verificationToken ?? generateDomainVerificationToken()
  const now = new Date()

  async function fail(message: string): Promise<never> {
    await c.domains.updateOne(
      { tenantId, origin },
      {
        $set: {
          verificationToken: token,
          verificationStatus: 'failed',
          lastVerificationError: message,
          updatedAt: now,
        },
      }
    )
    throw new Error(message)
  }

  try {
    if (input.method === 'well-known') {
      const res = await fetch(`${origin}/.well-known/voice-agent-verification.txt`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      const body = await res.text()
      if (!res.ok || !body.includes(token)) {
        await fail('Verification file was not found or did not contain the expected token.')
      }
    } else {
      const res = await fetch(origin, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      const body = await res.text()
      if (!res.ok || !body.includes(token)) {
        await fail('Homepage meta tag was not found or did not contain the expected token.')
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('expected token')) throw error
    await fail(error instanceof Error ? error.message : 'Domain verification failed.')
  }

  await c.domains.updateOne(
    { tenantId, origin },
    {
      $set: {
        verificationToken: token,
        verificationStatus: 'verified',
        verifiedAt: now,
        lastVerificationError: undefined,
        updatedAt: now,
      },
    }
  )

  const verified = await c.domains.findOne({ tenantId, origin })
  if (!verified) throw new Error('Verified domain could not be loaded.')
  return verified
}

export async function archiveManagedTenant(tenantId: string): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()
  const normalizedTenantId = assertTenantId(tenantId)

  await Promise.all([
    c.tenants.updateOne(
      { tenantId: normalizedTenantId },
      { $set: { status: 'archived', archivedAt: now, updatedAt: now } }
    ),
    c.domains.updateMany(
      { tenantId: normalizedTenantId },
      { $set: { status: 'disabled', updatedAt: now } }
    ),
    c.embedKeys.updateMany(
      { tenantId: normalizedTenantId },
      { $set: { status: 'disabled', updatedAt: now } }
    ),
  ])
}

export async function disableManagedTenant(tenantId: string): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()

  await c.tenants.updateOne(
    { tenantId: assertTenantId(tenantId) },
    { $set: { status: 'disabled', updatedAt: now } }
  )
}

export async function enableManagedTenant(tenantId: string): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()

  await c.tenants.updateOne(
    { tenantId: assertTenantId(tenantId) },
    {
      $set: { status: 'active', updatedAt: now },
      $unset: { archivedAt: '' },
    }
  )
}

export async function activateManagedTenant(tenantId: string): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()

  await c.tenants.updateOne(
    { tenantId: assertTenantId(tenantId) },
    {
      $set: { status: 'active', updatedAt: now },
      $unset: { archivedAt: '' },
    }
  )
}

export async function updateManagedTenantSubscription(input: {
  tenantId: string
  status: string
  type: string
  billingCycle: string
  seats?: string
  expiresAt?: string
}): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()
  const seats = Number(input.seats)
  const expiresAt = input.expiresAt?.trim() ? new Date(input.expiresAt) : undefined

  await c.tenants.updateOne(
    { tenantId: assertTenantId(input.tenantId) },
    {
      $set: {
        subscription: {
          status: normalizeSubscriptionStatus(input.status),
          type: normalizeSubscriptionType(input.type),
          billingCycle: normalizeBillingCycle(input.billingCycle),
          seats: Number.isFinite(seats) && seats > 0 ? seats : undefined,
          expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
          updatedAt: now,
        },
        updatedAt: now,
      } satisfies Partial<TenantRecord>,
    }
  )
}

export async function updateManagedTenantOpenAiKey(tenantId: string, openaiApiKey: string): Promise<TenantSecretPublicMetadata> {
  const db = await getManagementDb()
  return upsertTenantSecretInDb(db, {
    tenantId: assertTenantId(tenantId),
    kind: 'openai_api_key',
    value: requireText(openaiApiKey, 'OpenAI API key'),
  })
}

export async function updateManagedTenantDatabaseUrl(tenantId: string, databaseUrl: string): Promise<TenantSecretPublicMetadata> {
  const db = await getManagementDb()
  const value = requireText(databaseUrl, 'Database URL')

  try {
    new URL(value)
  } catch {
    throw new Error('Database URL must be a valid URL.')
  }

  return upsertTenantSecretInDb(db, {
    tenantId: assertTenantId(tenantId),
    kind: 'database_url',
    value,
  })
}

function normalizeEmailAddress(value: string | undefined, label: string): string {
  const email = requireText(value, label).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error(`${label} must be a valid email address.`)
  }
  return email
}

function normalizeSmtpPort(value: string | undefined): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP port must be between 1 and 65535.')
  }
  return port
}

export async function updateManagedTenantEmailNotifications(input: UpdateManagedTenantEmailInput): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const tenantId = assertTenantId(input.tenantId)
  const service = input.service?.trim().toLowerCase()
  const host = input.host?.trim().toLowerCase()
  const port = normalizeSmtpPort(input.port || '465')
  const user = input.enabled ? normalizeEmailAddress(input.user, 'SMTP user') : input.user?.trim().toLowerCase()
  const fromEmail = input.enabled ? normalizeEmailAddress(input.fromEmail, 'From email') : input.fromEmail?.trim().toLowerCase()
  const fromName = input.enabled
    ? requireText(input.fromName, 'From name')
    : input.fromName?.trim() || 'Voice Agent'

  if (input.enabled && !service && !host) {
    throw new Error('SMTP service or host is required.')
  }

  const emailNotifications: EmailNotificationConfig = {
    enabled: input.enabled,
    smtp: {
      service: service || undefined,
      host: host || undefined,
      port,
      secure: input.secure,
      user: user || undefined,
    },
    fromName,
    fromEmail: fromEmail || user || 'noreply@example.com',
    recipients: input.recipients,
    sendToLeadEmail: input.sendToLeadEmail,
  }

  await c.settings.updateOne(
    { tenantId },
    {
      $set: {
        emailNotifications,
        updatedAt: new Date(),
      } satisfies Partial<TenantAgentSettingsRecord>,
    }
  )

  if (input.password?.trim()) {
    await upsertTenantSecretInDb(db, {
      tenantId,
      kind: 'smtp_password',
      value: input.password,
    })
  }
}

export async function updateManagedTenantEmbedToken(tenantId: string, embedToken: string): Promise<void> {
  const db = await getManagementDb()
  const c = collections(db)
  const now = new Date()
  const normalizedTenantId = assertTenantId(tenantId)

  await c.embedKeys.updateMany(
    { tenantId: normalizedTenantId },
    { $set: { status: 'disabled', updatedAt: now } }
  )
  await c.embedKeys.insertOne({
    tenantId: normalizedTenantId,
    tokenHash: hashTenantCredential(requireText(embedToken, 'Embed token')),
    apiKeyHashes: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })
}

export async function createManagedTenantUser(input: {
  tenantId: string
  email: string
  password: string
  name?: string
  role: Exclude<AuthRole, 'platform_admin'>
}): Promise<AuthUserRecord> {
  const tenantId = assertTenantId(input.tenantId)
  const email = requireText(input.email, 'Email')
  const existing = await getAuthUserByEmail(email)

  if (existing && (existing.role === 'platform_admin' || existing.tenantId !== tenantId)) {
    throw new Error('This email already belongs to another admin account.')
  }

  return upsertAuthUser({
    tenantId,
    email,
    password: requireText(input.password, 'Password'),
    name: input.name,
    role: input.role,
  })
}

export function embedSnippet(input: { baseUrl: string; tenantId: string; tokenPlaceholder?: string }): string {
  const tokenAttribute = input.tokenPlaceholder ? ` data-token="${input.tokenPlaceholder}"` : ''
  return `<script src="${input.baseUrl.replace(/\/$/, '')}/agent.js" data-tenant="${input.tenantId}"${tokenAttribute}></script>`
}
