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
import { ensureTenantSecretIndexes, getDecryptedTenantSecretsFromDb } from './secrets'
import { cachedTenantLookup } from './tenant-cache'

export { invalidateTenantCache as invalidateTenantRegistryCache } from './tenant-cache'

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

// ── Index management ──────────────────────────────────────────────────────────
// Created once per process. On failure the cached promise is dropped (so a later
// call retries) but retries are throttled so a persistent failure — e.g. an
// existing conflicting index — does not add round trips to every request.
const INDEX_RETRY_BACKOFF_MS = 60_000
let indexesReady: Promise<void> | null = null
let indexesFailedAt = 0

export async function ensureTenantRegistryIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    const pending = (async () => {
      const c = collections(db)

      await Promise.all([
        c.tenants.createIndex({ tenantId: 1 }, { unique: true }),
        c.tenants.createIndex({ publicId: 1 }, { unique: true }),
        c.tenants.createIndex({ slug: 1 }, { unique: true }),
        c.tenants.createIndex({ status: 1 }),
        // Default-tenant lookup and admin listing: find({status}).sort({createdAt})
        c.tenants.createIndex({ status: 1, createdAt: 1 }),
        c.tenants.createIndex({ createdAt: 1 }),
        c.settings.createIndex({ tenantId: 1 }, { unique: true }),
        c.domains.createIndex({ tenantId: 1, origin: 1 }, { unique: true }),
        c.domains.createIndex({ origin: 1 }),
        // Domain resolution: findOne({origin, status: 'active', verificationStatus: 'verified'})
        c.domains.createIndex({ origin: 1, status: 1, verificationStatus: 1 }),
        c.domains.createIndex({ status: 1 }),
        c.domains.createIndex({ verificationStatus: 1 }),
        c.embedKeys.createIndex({ tenantId: 1 }),
        c.embedKeys.createIndex({ tokenHash: 1 }),
        c.embedKeys.createIndex({ apiKeyHashes: 1 }),
        c.embedKeys.createIndex({ status: 1 }),
        ensureTenantSecretIndexes(db),
      ])
    })()
    indexesReady = pending
    pending.catch(() => {
      if (indexesReady === pending) {
        indexesReady = null
        indexesFailedAt = Date.now()
      }
    })
  }

  return indexesReady
}

async function ensureIndexesBestEffort(db: Db): Promise<void> {
  if (!indexesReady && indexesFailedAt && Date.now() - indexesFailedAt < INDEX_RETRY_BACKOFF_MS) {
    return
  }
  try {
    await ensureTenantRegistryIndexes(db)
  } catch (err) {
    // Index creation failures must not take tenant reads down (or silently
    // force the JSON fallback); queries still work without the indexes.
    console.warn('[tenants:db] index creation failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function getTenantDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null

  try {
    const db = await getMongoDb()
    if (db) await ensureIndexesBestEffort(db)
    return db
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[tenants:db] unavailable, falling back to json registry', { error: message })
    return null
  }
}

// ── Bundle loading ────────────────────────────────────────────────────────────
async function buildTenantBundle(db: Db, tenant: TenantRecord): Promise<TenantBundle | null> {
  const c = collections(db)
  const lookupIds = Array.from(new Set([tenant.tenantId, tenant.slug].filter(Boolean)))

  // All four reads are independent: run them concurrently, with projections
  // limited to the fields the runtime actually consumes.
  const [settings, domains, embedKeys, secrets] = await Promise.all([
    c.settings.findOne({ tenantId: { $in: lookupIds } }),
    c.domains.find(
      {
        tenantId: { $in: lookupIds },
        status: 'active',
        verificationStatus: 'verified',
      },
      { projection: { tenantId: 1, origin: 1, status: 1, verificationStatus: 1 } }
    ).toArray(),
    c.embedKeys.find(
      { tenantId: { $in: lookupIds }, status: 'active' },
      { projection: { tenantId: 1, tokenHash: 1, status: 1 } }
    ).toArray(),
    getDecryptedTenantSecretsFromDb(db, lookupIds, ['openai_api_key', 'smtp_password']).catch((err) => {
      console.warn('[tenants:db] tenant secrets could not be loaded', {
        tenantId: tenant.tenantId,
        error: err instanceof Error ? err.message : String(err),
      })
      return {} as Awaited<ReturnType<typeof getDecryptedTenantSecretsFromDb>>
    }),
  ])

  if (!settings) {
    console.warn('[tenants:db] tenant is missing agent settings', { tenantId: tenant.tenantId })
    return null
  }

  const openaiApiKey = secrets.openai_api_key
  const smtpPassword = secrets.smtp_password

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

type LoadedTenant = {
  result: TenantLookupResult
  bundle: TenantBundle | null
}

async function loadTenantRecord(db: Db, tenant: TenantRecord): Promise<LoadedTenant> {
  if (!isActiveTenantStatus(tenant.status)) {
    return {
      result: {
        tenant: null,
        blocked: true,
        source: 'database',
        reason: `Tenant is ${tenant.status}.`,
      },
      bundle: null,
    }
  }

  const bundle = await buildTenantBundle(db, tenant)
  return { result: resultFromBundle(bundle, 'database'), bundle }
}

/**
 * Loads (and briefly caches) the full tenant bundle keyed by stored tenantId.
 * Shared by every lookup path so auth + handler resolution in one request, and
 * bursts of requests for the same tenant, hit MongoDB once per TTL window.
 */
function loadTenantByStoredId(db: Db, tenantId: string): Promise<LoadedTenant> {
  return cachedTenantLookup(`tenant:${tenantId}`, async () => {
    const tenant = await collections(db).tenants.findOne({ tenantId })
    if (!tenant) {
      return { result: { tenant: null, blocked: false, source: 'none' }, bundle: null }
    }
    return loadTenantRecord(db, tenant)
  })
}

const MONGO_NOT_CONFIGURED: TenantLookupResult = {
  tenant: null,
  blocked: false,
  source: 'none',
  reason: 'MongoDB is not configured.',
}

// ── Lookups ───────────────────────────────────────────────────────────────────
export async function getDbTenantById(id: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { ...MONGO_NOT_CONFIGURED }

  const tenantId = normalizeTenantId(id)
  if (!tenantId) return { tenant: null, blocked: false, source: 'none' }
  return (await loadTenantByStoredId(db, tenantId)).result
}

export async function getDbTenantByPublicId(publicId: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { ...MONGO_NOT_CONFIGURED }

  const tenant = await collections(db).tenants.findOne(
    { publicId: publicId.trim() },
    { projection: { tenantId: 1 } }
  )
  if (!tenant) return { tenant: null, blocked: false, source: 'none' }

  return (await loadTenantByStoredId(db, tenant.tenantId)).result
}

export async function getDbTenantByDomain(url: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { ...MONGO_NOT_CONFIGURED }

  const origin = normalizeOrigin(url)
  if (!origin) return { tenant: null, blocked: false, source: 'none' }

  const c = collections(db)
  // Prefer an active + verified claim. Several tenants may list the same origin
  // (only one can verify it); an arbitrary findOne({origin}) could pick a
  // pending/disabled claim and wrongly block the verified owner.
  const verified = await c.domains.findOne(
    { origin, status: 'active', verificationStatus: 'verified' },
    { projection: { tenantId: 1 } }
  )

  if (!verified) {
    const domain = await c.domains.findOne(
      { origin },
      { projection: { status: 1, verificationStatus: 1 } }
    )
    if (!domain) return { tenant: null, blocked: false, source: 'none' }
    if (!isActiveTenantStatus(domain.status)) {
      return {
        tenant: null,
        blocked: true,
        source: 'database',
        reason: `Tenant domain is ${domain.status}.`,
      }
    }
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant domain is ${domain.verificationStatus ?? 'pending'} verification.`,
    }
  }

  return (await loadTenantByStoredId(db, verified.tenantId)).result
}

export async function getDbTenantByApiKey(apiKey: string): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { ...MONGO_NOT_CONFIGURED }

  const apiKeyHash = hashTenantCredential(apiKey)
  const embedKey = await collections(db).embedKeys.findOne(
    { apiKeyHashes: apiKeyHash },
    { projection: { tenantId: 1, status: 1 } }
  )
  if (!embedKey) return { tenant: null, blocked: false, source: 'none' }
  if (!isActiveTenantStatus(embedKey.status)) {
    return {
      tenant: null,
      blocked: true,
      source: 'database',
      reason: `Tenant embed key is ${embedKey.status}.`,
    }
  }

  return (await loadTenantByStoredId(db, embedKey.tenantId)).result
}

export async function getDbDefaultTenant(defaultTenantId: string): Promise<TenantConfig | null> {
  const byId = await getDbTenantById(defaultTenantId)
  if (byId.tenant || byId.blocked) return byId.tenant

  const db = await getTenantDb()
  if (!db) return null

  const first = await cachedTenantLookup('default:first-active', async () =>
    collections(db).tenants.findOne(
      { status: 'active' },
      { sort: { createdAt: 1 }, projection: { tenantId: 1 } }
    )
  )
  if (!first) return null

  return (await loadTenantByStoredId(db, first.tenantId)).result.tenant
}

export async function getDbAllTenants(): Promise<TenantConfig[]> {
  const db = await getTenantDb()
  if (!db) return []

  const activeTenants = await collections(db)
    .tenants
    .find({ status: 'active' }, { projection: { tenantId: 1 } })
    .sort({ createdAt: 1 })
    .toArray()

  const configs = await Promise.allSettled(
    activeTenants.map(async (tenant) => {
      try {
        return (await loadTenantByStoredId(db, tenant.tenantId)).result.tenant
      } catch (err) {
        console.warn('[tenants:db] Failed to build tenant bundle, skipping tenant', {
          tenantId: tenant.tenantId,
          error: err instanceof Error ? err.message : String(err),
        })
        return null
      }
    })
  )

  return configs
    .filter((r): r is PromiseFulfilledResult<TenantConfig | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((tenant): tenant is TenantConfig => Boolean(tenant))
}

export async function validateDbTenantToken(tenantId: string, token: string | undefined): Promise<TenantLookupResult> {
  const db = await getTenantDb()
  if (!db) return { ...MONGO_NOT_CONFIGURED }

  const normalizedTenantId = normalizeTenantId(tenantId)
  if (!normalizedTenantId) return { tenant: null, blocked: false, source: 'none' }

  const { result: tenantResult, bundle } = await loadTenantByStoredId(db, normalizedTenantId)
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

  const tenant = await collections(db).tenants.findOne(
    { tenantId: normalizeTenantId(id) },
    { projection: { status: 1 } }
  )
  if (!tenant) return { exists: false, blocked: false }

  return { exists: true, blocked: !isActiveTenantStatus(tenant.status) }
}
