import { createHash } from 'crypto'
import { MongoClient, type Collection, type Db, type Document } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb, isMongoConfigured } from './mongodb'
import { getAllTenants, getTenantById } from '@/lib/tenants/registry'
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

function tenantDbName(uri: string): string {
  try {
    const parsed = new URL(uri)
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '').trim()
    return dbName || env.MONGODB_DB_NAME
  } catch {
    return env.MONGODB_DB_NAME
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
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    clients.set(key, clientPromise)
  }

  const client = await clientPromise
  return client.db(tenantDbName(uri))
}

async function getInternalConversationStore(): Promise<ConversationStore | null> {
  if (!isMongoConfigured()) return null
  const db = await getMongoDb()
  return db ? { db, source: 'internal' } : null
}

async function ensureConversationIndexes(store: ConversationStore): Promise<void> {
  const indexKeys = globalForTenantMongo.__voiceAgentConversationIndexKeys ??= new Set<string>()
  const key = `${store.source}:${store.tenantId ?? 'platform'}:${store.db.databaseName}:${env.MONGODB_CALLS_COLLECTION}`
  if (indexKeys.has(key)) return

  const collection = store.db.collection(env.MONGODB_CALLS_COLLECTION)
  await Promise.all([
    collection.createIndex({ 'tenant.id': 1, createdAt: -1 }),
    collection.createIndex({ status: 1, updatedAt: -1 }),
    collection.createIndex({ createdAt: -1 }),
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
    return null
  }

  console.warn('[conversation-store] tenant database string missing', {
    tenantId: tenant.id,
    error: DATABASE_STRING_NOT_CONFIGURED,
  })
  return null
}

export async function getConversationStoresForScope(
  scope?: DashboardAccessScope
): Promise<ConversationStore[]> {
  if (scope?.kind === 'tenant') {
    const tenant = await getTenantById(scope.tenantId)
    if (!tenant) return []
    const store = await getConversationStoreForTenant(tenant)
    return store ? [store] : []
  }

  const stores: ConversationStore[] = []
  const internal = await getInternalConversationStore()
  if (internal) {
    await ensureConversationIndexes(internal)
    stores.push(internal)
  }

  const tenants = await getAllTenants()
  const tenantStores = await Promise.all(tenants.map(async (tenant) => {
    try {
      const tenantDb = await getTenantConversationDb(tenant.id)
      if (!tenantDb) return null
      const store = { tenantId: tenant.id, db: tenantDb, source: 'tenant' as const }
      await ensureConversationIndexes(store)
      return store
    } catch (error) {
      console.warn('[conversation-store] tenant database skipped for platform dashboard', {
        tenantId: tenant.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }))

  for (const store of tenantStores) {
    if (store) stores.push(store)
  }

  return stores
}
