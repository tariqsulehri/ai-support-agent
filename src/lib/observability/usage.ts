import type { Collection, Db } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'

const USAGE_COLLECTION = 'tenant_usage_counters'

export type UsageEventType =
  | 'embed_session.created'
  | 'embed_session.denied'
  | 'config.request'
  | 'chat.request'
  | 'transcription.request'
  | 'tts.request'
  | 'conversation.completed'

export type TenantUsageSummary = {
  tenantId: string
  total: number
  counters: Record<string, number>
  firstEventAt?: Date
  lastEventAt?: Date
  createdAt: Date
  updatedAt: Date
}

type UsageInput = {
  tenantId: string
  type: UsageEventType
  metadata?: Record<string, unknown>
}

let indexesReady: Promise<void> | null = null

function usageEnabled(): boolean {
  return env.USAGE_EVENTS_ENABLED === 'true'
}

function collection(db: Db): Collection<TenantUsageSummary> {
  return db.collection<TenantUsageSummary>(USAGE_COLLECTION)
}

async function ensureIndexes(db: Db): Promise<void> {
  indexesReady ??= (async () => {
    await Promise.all([
      collection(db).createIndex({ tenantId: 1 }, { unique: true }),
      collection(db).createIndex({ updatedAt: -1 }),
    ])
  })()

  return indexesReady
}

function counterKey(type: UsageEventType): string {
  return type.replace(/[^a-z0-9]+/gi, '_')
}

export async function recordUsageEvent(input: UsageInput): Promise<void> {
  if (!usageEnabled() || !isMongoConfigured()) return

  try {
    const db = await getMongoDb()
    if (!db) return
    await ensureIndexes(db)

    const now = new Date()
    const key = counterKey(input.type)
    await collection(db).updateOne(
      { tenantId: input.tenantId },
      {
        $setOnInsert: {
          tenantId: input.tenantId,
          counters: {},
          total: 0,
          firstEventAt: now,
          createdAt: now,
        },
        $set: {
          lastEventAt: now,
          updatedAt: now,
        },
        $inc: {
          total: 1,
          [`counters.${key}`]: 1,
        },
      },
      { upsert: true }
    )
  } catch (error) {
    console.warn('[usage] counter write skipped', {
      type: input.type,
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function listTenantUsageSummaries(): Promise<TenantUsageSummary[]> {
  if (!usageEnabled() || !isMongoConfigured()) return []

  try {
    const db = await getMongoDb()
    if (!db) return []
    await ensureIndexes(db)
    return collection(db).find({}).sort({ updatedAt: -1 }).toArray()
  } catch (error) {
    console.warn('[usage] counter read skipped', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}
