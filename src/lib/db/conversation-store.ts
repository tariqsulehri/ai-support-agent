import { createHash } from 'crypto'
import { MongoClient, type Collection, type Db, type Document } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb, isMongoConfigured } from './mongodb'
import { getTenantById } from '@/lib/tenants/registry'
import { getDecryptedTenantSecret } from '@/lib/tenants/secrets'
import { DATABASE_STRING_NOT_CONFIGURED } from '@/lib/tenants/runtime-configuration'
import type { DashboardAccessScope } from '@/lib/auth/types'
import type { TenantConfig } from '@/lib/tenants/types'

type ConversationStoreSource = 'internal' | 'tenant'

export type ConversationStore = {
  tenantId?: string
  db: Db
  source: ConversationStoreSource
}

type TenantMongoGlobal = typeof globalThis & {
  __voiceAgentTenantMongoClients?: Map<string, Promise<MongoClient>>
  __voiceAgentConversationIndexes?: Map<string, Promise<void>>
}

const globalForTenantMongo = globalThis as TenantMongoGlobal

function cacheKey(tenantId: string, uri: string): string {
  const uriHash = createHash('sha256').update(uri).digest('hex').slice(0, 16)
  return `${tenantId}:${uriHash}`
}

function tenantDbName(uri: string, tenantId: string): string {
  try {
    const parsed = new URL(uri)
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '').trim()
    return dbName || `tenant_${tenantId.replace(/[^a-z0-9]+/g, '_')}`
  } catch {
    return `tenant_${tenantId.replace(/[^a-z0-9]+/g, '_')}`
  }
}

async function getTenantConversationDb(tenantId: string): Promise<Db | null> {
  const uri = await getDecryptedTenantSecret(tenantId, 'database_url')
  if (!uri?.trim()) return null

  const key = cacheKey(tenantId, uri)
  const clients = globalForTenantMongo.__voiceAgentTenantMongoClients ??= new Map<string, Promise<MongoClient>>()
  let clientPromise = clients.get(key)
  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri, {
      appName: `voiceagent-tenant-${tenantId}`,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      maxPoolSize: 5,
    }).catch((err) => {
      clients.delete(key) // allow a retry on the next request
      throw err
    })
    clients.set(key, clientPromise)
  }

  const client = await clientPromise
  return client.db(tenantDbName(uri, tenantId))
}

async function getInternalConversationStore(): Promise<ConversationStore | null> {
  if (!isMongoConfigured()) return null
  try {
    const db = await getMongoDb()
    return db ? { db, source: 'internal' } : null
  } catch (err) {
    console.warn('[conversation-store] internal platform store unavailable', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Index definitions for the conversations collection. Every tenant-scoped index
 * starts with tenant.id so row-level-security filters are always index-backed.
 */
const CONVERSATION_INDEXES: Array<{ key: Record<string, 1 | -1>; name: string }> = [
  // Default list sort + date-range filter
  { key: { 'tenant.id': 1, updatedAt: -1 }, name: 'tenant_updated' },
  { key: { 'tenant.id': 1, createdAt: -1 }, name: 'tenant_created' },
  // Filter + sort combinations used by the dashboard filter bar
  { key: { 'tenant.id': 1, status: 1, updatedAt: -1 }, name: 'tenant_status_updated' },
  { key: { 'tenant.id': 1, 'classification.leadQuality': 1, updatedAt: -1 }, name: 'tenant_quality_updated' },
  { key: { 'tenant.id': 1, 'requirement.urgency': 1, updatedAt: -1 }, name: 'tenant_urgency_updated' },
  { key: { 'tenant.id': 1, maturityScore: -1, updatedAt: -1 }, name: 'tenant_maturity_updated' },
  // Upserts by conversation id (live snapshots + finalize)
  { key: { 'tenant.id': 1, conversationId: 1 }, name: 'tenant_conversation' },
  // Follow-up queue / overdue counters
  { key: { 'tenant.id': 1, followUpAt: 1, status: 1 }, name: 'tenant_followup_status' },
  // Platform-admin (cross-tenant) views
  { key: { updatedAt: -1 }, name: 'updated' },
  { key: { status: 1, updatedAt: -1 }, name: 'status_updated' },
  { key: { maturityScore: -1, updatedAt: -1 }, name: 'maturity_updated' },
  { key: { followUpAt: 1, status: 1 }, name: 'followup_status' },
]

async function createConversationIndexes(store: ConversationStore): Promise<void> {
  const collection = store.db.collection(env.MONGODB_CALLS_COLLECTION)
  const ttlDays = env.CALL_RECORDS_TTL_DAYS

  const results = await Promise.allSettled([
    ...CONVERSATION_INDEXES.map(({ key, name }) => collection.createIndex(key, { name })),
    ttlDays && ttlDays > 0
      ? collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: ttlDays * 24 * 60 * 60, name: 'call_records_ttl' }
        )
      : Promise.resolve('skipped'),
  ])

  for (const result of results) {
    // An existing index with the same keys but a different name (from older deployments)
    // raises IndexOptionsConflict / IndexKeySpecsConflict; that index already serves the query.
    if (result.status === 'rejected') {
      const code = (result.reason as { code?: number })?.code
      if (code !== 85 && code !== 86) {
        console.warn('[conversation-store] index creation failed', {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    }
  }
}

/**
 * Ensures indexes once per physical collection (not per tenant) per process. The
 * in-flight promise is cached so concurrent first requests share a single build,
 * and evicted on failure so a later request can retry. Callers never wait on it:
 * index builds run in the background and must not add latency to user requests.
 */
function ensureConversationIndexes(store: ConversationStore): void {
  const cache = (globalForTenantMongo.__voiceAgentConversationIndexes ??= new Map())
  const key = `${store.db.databaseName}:${env.MONGODB_CALLS_COLLECTION}`
  if (cache.has(key)) return

  const pending = createConversationIndexes(store).catch((err) => {
    cache.delete(key)
    console.warn('[conversation-store] index setup failed', err)
  })
  cache.set(key, pending)
}

export function conversationCollection<T extends Document = Document>(
  store: ConversationStore
): Collection<T> {
  return store.db.collection<T>(env.MONGODB_CALLS_COLLECTION)
}

export async function getConversationStoreForTenant(
  tenant: TenantConfig
): Promise<ConversationStore | null> {
  // Store all tenant data in our platform database with strict row-level security
  const internal = await getInternalConversationStore()
  if (internal) {
    const store: ConversationStore = {
      tenantId: tenant.id,
      db: internal.db,
      source: 'internal',
    }
    ensureConversationIndexes(store)
    return store
  }

  // Fallback to tenant-configured database if platform store is not configured
  try {
    const tenantDb = await getTenantConversationDb(tenant.id)
    if (tenantDb) {
      const store = { tenantId: tenant.id, db: tenantDb, source: 'tenant' as const }
      ensureConversationIndexes(store)
      return store
    }
  } catch (error) {
    console.warn('[conversation-store] tenant database unavailable', {
      tenantId: tenant.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  console.warn('[conversation-store] conversation database unavailable', {
    tenantId: tenant.id,
    error: DATABASE_STRING_NOT_CONFIGURED,
  })
  return null
}

export async function getConversationStoresForScope(
  scope?: DashboardAccessScope
): Promise<ConversationStore[]> {
  const internal = await getInternalConversationStore()
  if (internal) {
    ensureConversationIndexes(internal)
    if (scope?.kind === 'tenant') {
      return [{ tenantId: scope.tenantId, db: internal.db, source: 'internal' }]
    }
    return [internal]
  }

  // Fallback for standalone tenant stores if platform DB is not configured
  if (scope?.kind === 'tenant') {
    const tenant = await getTenantById(scope.tenantId)
    if (!tenant) return []
    const store = await getConversationStoreForTenant(tenant)
    return store ? [store] : []
  }

  return []
}
