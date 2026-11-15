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
  __voiceAgentConversationIndexKeys?: Set<string>
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

async function ensureConversationIndexes(store: ConversationStore): Promise<void> {
  const indexKeys = globalForTenantMongo.__voiceAgentConversationIndexKeys ??= new Set<string>()
  const key = `${store.source}:${store.tenantId ?? 'platform'}:${store.db.databaseName}:${env.MONGODB_CALLS_COLLECTION}`
  if (indexKeys.has(key)) return

  const collection = store.db.collection(env.MONGODB_CALLS_COLLECTION)
  const ttlDays = env.CALL_RECORDS_TTL_DAYS

  await Promise.all([
    // Primary compound sort indexes for high-throughput pagination (tenant-scoped)
    collection.createIndex({ 'tenant.id': 1, updatedAt: -1, createdAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, createdAt: -1 }),

    // Compound filter + sort indexes (prevents in-memory sort on filtered queries)
    collection.createIndex({ 'tenant.id': 1, status: 1, updatedAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, status: 1, createdAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, 'classification.leadQuality': 1, updatedAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, 'classification.leadQuality': 1, createdAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, 'requirement.urgency': 1, updatedAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, 'requirement.urgency': 1, createdAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, hasLead: 1, updatedAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, maturityScore: -1, updatedAt: -1 }),
    collection.createIndex({ 'tenant.id': 1, conversationId: 1 }),

    // Follow-up queue optimization (eliminates full scans for overdue / scheduled followups)
    collection.createIndex({ 'tenant.id': 1, followUpAt: 1, status: 1 }),

    // Cross-tenant / Platform Admin indexes
    collection.createIndex({ status: 1, updatedAt: -1 }),
    collection.createIndex({ updatedAt: -1, createdAt: -1 }),
    collection.createIndex({ createdAt: -1 }),
    ttlDays && ttlDays > 0
      ? collection
          .createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: ttlDays * 24 * 60 * 60, name: 'call_records_ttl' }
          )
          .catch(() => {})
      : Promise.resolve(),
  ])
  indexKeys.add(key)
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
    await ensureConversationIndexes(store)
    return store
  }

  // Fallback to tenant-configured database if platform store is not configured
  try {
    const tenantDb = await getTenantConversationDb(tenant.id)
    if (tenantDb) {
      const store = { tenantId: tenant.id, db: tenantDb, source: 'tenant' as const }
      await ensureConversationIndexes(store)
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
    await ensureConversationIndexes(internal)
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
