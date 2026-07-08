import type { Collection, Db } from 'mongodb'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { hashTenantCredential, safeCompareTenantCredential } from './hash'
import { tenantBundleToConfig } from './mapper'
import { isActiveTenantStatus, normalizeOrigin, normalizeTenantId } from './normalize'
import type { TenantConfig } from './types'
import type {
  TenantAgentSettingsRecord,
  TenantBundle,
  TenantDomainRecord,
  TenantEmbedKeyRecord,
  TenantLookupResult,
  TenantRecord,
} from './db-types'
import { TENANT_COLLECTIONS } from './db-types'
import { ensureTenantSecretIndexes, getDecryptedTenantSecretFromDb } from './secrets'

let indexesReady: Promise<void> | null = null

type TenantDbCollections = {
  tenants: Collection<TenantRecord>
  settings: Collection<TenantAgentSettingsRecord>
  domains: Collection<TenantDomainRecord>
  embedKeys: Collection<TenantEmbedKeyRecord>
}

function collections(db: Db): TenantDbCollections {
  return {
    tenants: db.collection<TenantRecord>(TENANT_COLLECTIONS.tenants),
    settings: db.collection<TenantAgentSettingsRecord>(TENANT_COLLECTIONS.settings),
    domains: db.collection<TenantDomainRecord>(TENANT_COLLECTIONS.domains),
    embedKeys: db.collection<TenantEmbedKeyRecord>(TENANT_COLLECTIONS.embedKeys),
  }
}

export async function ensureTenantRegistryIndexes(db: Db): Promise<void> {
  indexesReady ??= (async () => {
    const c = collections(db)

    await Promise.all([
      c.tenants.createIndex({ tenantId: 1 }, { unique: true }),
      c.tenants.createIndex({ publicId: 1 }, { unique: true }),
      c.tenants.createIndex({ slug: 1 }, { unique: true }),
      c.tenants.createIndex({ status: 1 }),
      c.settings.createIndex({ tenantId: 1 }, { unique: true }),
      c.domains.createIndex({ tenantId: 1, origin: 1 }, { unique: true }),
      c.domains.createIndex({ origin: 1 }),
      c.domains.createIndex({ status: 1 }),
      c.domains.createIndex({ verificationStatus: 1 }),
      c.embedKeys.createIndex({ tenantId: 1 }),
      c.embedKeys.createIndex({ tokenHash: 1 }),
      c.embedKeys.createIndex({ apiKeyHashes: 1 }),
      c.embedKeys.createIndex({ status: 1 }),
      ensureTenantSecretIndexes(db),
    ])
  })()

  return indexesReady
}

async function getTenantDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null

  try {
    const db = await getMongoDb()
    if (db) await ensureTenantRegistryIndexes(db)
    return db
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[tenants:db] unavailable, falling back to json registry', { error: message })
    return null
  }
}

async function buildTenantBundle(db: Db, tenant: TenantRecord): Promise<TenantBundle | null> {
  const c = collections(db)
  const [settings, domains, embedKeys] = await Promise.all([
    c.settings.findOne({ tenantId: tenant.tenantId }),
    c.domains.find({
      tenantId: tenant.tenantId,
      status: 'active',
      verificationStatus: 'verified',
    }).toArray(),
    c.embedKeys.find({ tenantId: tenant.tenantId, status: 'active' }).toArray(),
  ])

  if (!settings) {
    console.warn('[tenants:db] tenant is missing agent settings', { tenantId: tenant.tenantId })
    return null
  }

  let openaiApiKey: string | undefined
  let smtpPassword: string | undefined
  try {
    openaiApiKey = await getDecryptedTenantSecretFromDb(db, tenant.tenantId, 'openai_api_key') ?? undefined
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[tenants:db] tenant OpenAI secret could not be decrypted', {
      tenantId: tenant.tenantId,
      error: message,
    })
  }
  try {
    smtpPassword = await getDecryptedTenantSecretFromDb(db, tenant.tenantId, 'smtp_password') ?? undefined
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[tenants:db] tenant SMTP secret could not be decrypted', {
      tenantId: tenant.tenantId,
      error: message,
    })
  }

  return {
    tenant,
    settings,
    domains,
    embedKeys,
    runtimeSecrets: {
      ...(openaiApiKey ? { openaiApiKey } : {}),
      ...(smtpPassword ? { smtpPassword } : {}),
    },
  }
}

function resultFromBundle(bundle: TenantBundle | null, source: TenantLookupResult['source']): TenantLookupResult {
  if (!bundle) return { tenant: null, blocked: false, source: 'none' }
  return {
    tenant: tenantBundleToConfig(bundle),
    blocked: false,
    source,
  }
}

async function resultForTenant(db: Db, tenant: TenantRecord): Promise<TenantLookupResult> {
  if (!isActiveTenantStatus(tenant.status)) {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant is ${tenant.status}.`,
    }
  }

  return resultFromBundle(await buildTenantBundle(db, tenant), 'database')
}

export async function getDbTenantById(id: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { tenant: null, blocked: false, source: 'none', reason: 'MongoDB is not configured.' }

  const tenantId = normalizeTenantId(id)
  const tenant = await collections(db).tenants.findOne({ tenantId })
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }

  return resultForTenant(db, tenant)
}

export async function getDbTenantByPublicId(publicId: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { tenant: null, blocked: false, source: 'none', reason: 'MongoDB is not configured.' }

  const tenant = await collections(db).tenants.findOne({ publicId: publicId.trim() })
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }

  return resultForTenant(db, tenant)
}

export async function getDbTenantByDomain(url: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { tenant: null, blocked: false, source: 'none', reason: 'MongoDB is not configured.' }

  const origin = normalizeOrigin(url)
  if (!origin) return { tenant: null, blocked: false, source: 'none' }

  const domain = await collections(db).domains.findOne({ origin })
  if (!domain) return { tenant: null, blocked: false, source: 'none' }
  if (!isActiveTenantStatus(domain.status)) {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant domain is ${domain.status}.`,
    }
  }
  if (domain.verificationStatus !== 'verified') {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant domain is ${domain.verificationStatus ?? 'pending'} verification.`,
    }
  }

  const tenant = await collections(db).tenants.findOne({ tenantId: domain.tenantId })
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }

  return resultForTenant(db, tenant)
}

export async function getDbTenantByApiKey(apiKey: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { tenant: null, blocked: false, source: 'none', reason: 'MongoDB is not configured.' }

  const apiKeyHash = hashTenantCredential(apiKey)
  const embedKey = await collections(db).embedKeys.findOne({
    apiKeyHashes: apiKeyHash,
  })
  if (!embedKey) return { tenant: null, blocked: false, source: 'none' }
  if (!isActiveTenantStatus(embedKey.status)) {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant embed key is ${embedKey.status}.`,
    }
  }

  const tenant = await collections(db).tenants.findOne({ tenantId: embedKey.tenantId })
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }

  return resultForTenant(db, tenant)
}

export async function getDbDefaultTenant(defaultTenantId: string): Promise<TenantConfig | null> {
  const byId = await getDbTenantById(defaultTenantId)
  if (byId.tenant || byId.blocked) return byId.tenant

  const db = await getTenantDb()
  if (!db) return null

  const tenant = await collections(db).tenants.findOne({ status: 'active' }, { sort: { createdAt: 1 } })
  if (!tenant) return null

  return resultFromBundle(await buildTenantBundle(db, tenant), 'database').tenant
}

export async function getDbAllTenants(): Promise<TenantConfig[]> {
  const db = await getTenantDb()
  if (!db) return []

  const activeTenants = await collections(db)
    .tenants
    .find({ status: 'active' })
    .sort({ createdAt: 1 })
    .toArray()

  const configs = await Promise.all(
    activeTenants.map(async (tenant) => resultFromBundle(await buildTenantBundle(db, tenant), 'database').tenant)
  )

  return configs.filter((tenant): tenant is TenantConfig => Boolean(tenant))
}

export async function validateDbTenantToken(tenantId: string, token: string | undefined): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { tenant: null, blocked: false, source: 'none', reason: 'MongoDB is not configured.' }

  const tenant = await collections(db).tenants.findOne({ tenantId: normalizeTenantId(tenantId) })
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }
  if (!isActiveTenantStatus(tenant.status)) {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant is ${tenant.status}.`,
    }
  }

  const bundle = await buildTenantBundle(db, tenant)
  const tenantResult = resultFromBundle(bundle, 'database')
  if (!tenantResult.tenant || tenantResult.blocked) return tenantResult

  if (!token) {
    return { tenant: null, blocked: false, source: 'database', reason: 'Missing tenant token.' }
  }

  const hasMatchingToken = bundle?.embedKeys.some((embedKey) =>
    safeCompareTenantCredential(token, embedKey.tokenHash)
  )

  if (!hasMatchingToken) {
    return { tenant: null, blocked: false, source: 'database', reason: 'Invalid tenant token.' }
  }

  return tenantResult
}

export async function getDbTenantPresenceById(id: string): Promise<{ exists: boolean; blocked: boolean }> {
  const db = await getTenantDb()
  if (!db) return { exists: false, blocked: false }

  const tenant = await collections(db).tenants.findOne({ tenantId: normalizeTenantId(id) })
  if (!tenant) return { exists: false, blocked: false }

  return { exists: true, blocked: !isActiveTenantStatus(tenant.status) }
}
