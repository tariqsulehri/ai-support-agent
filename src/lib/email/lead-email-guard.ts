import { createHash } from 'crypto'
import { getMongoDb } from '@/lib/db/mongodb'

/**
 * Abuse guard for emails sent to visitor-supplied addresses.
 *
 * A visitor can type any address into the widget, so without limits the summary
 * email turns a tenant's SMTP account into an open relay. Each address may receive
 * at most PER_ADDRESS_LIMIT emails per 24h, and each tenant at most PER_TENANT_LIMIT.
 * Backed by MongoDB (shared across instances) with an in-memory fallback.
 */
const WINDOW_MS = 24 * 60 * 60 * 1000
const PER_ADDRESS_LIMIT = 3
const PER_TENANT_LIMIT = 200
const COLLECTION = 'lead_email_log'

type LogDoc = { tenantId: string; addressHash: string; sentAt: Date }

type GuardGlobal = typeof globalThis & {
  __leadEmailMemory?: Map<string, number[]>
  __leadEmailIndexes?: Promise<void>
}
const g = globalThis as GuardGlobal

function hashAddress(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

async function collection() {
  const db = await getMongoDb().catch(() => null)
  if (!db) return null
  const col = db.collection<LogDoc>(COLLECTION)
  g.__leadEmailIndexes ??= Promise.all([
    col.createIndex({ addressHash: 1, sentAt: -1 }),
    col.createIndex({ tenantId: 1, sentAt: -1 }),
    col.createIndex({ sentAt: 1 }, { expireAfterSeconds: WINDOW_MS / 1000 }),
  ])
    .then(() => undefined)
    .catch((err) => {
      g.__leadEmailIndexes = undefined
      console.warn('[lead-email-guard] index setup failed', err instanceof Error ? err.message : err)
    })
  return col
}

function memoryAllow(key: string, limit: number, now: number): boolean {
  const memory = (g.__leadEmailMemory ??= new Map<string, number[]>())
  const recent = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (memory.size > 10_000) memory.clear()
  memory.set(key, recent)
  return recent.length < limit
}

function memoryRecord(key: string, now: number) {
  const memory = (g.__leadEmailMemory ??= new Map<string, number[]>())
  memory.set(key, [...(memory.get(key) ?? []), now])
}

/** Returns true when an email to this visitor address is allowed right now. */
export async function canEmailLead(tenantId: string, email: string): Promise<boolean> {
  const addressHash = hashAddress(email)
  const now = Date.now()
  const col = await collection()
  if (!col) {
    return memoryAllow(`a:${addressHash}`, PER_ADDRESS_LIMIT, now) && memoryAllow(`t:${tenantId}`, PER_TENANT_LIMIT, now)
  }
  const since = new Date(now - WINDOW_MS)
  const [perAddress, perTenant] = await Promise.all([
    col.countDocuments({ addressHash, sentAt: { $gte: since } }, { limit: PER_ADDRESS_LIMIT }),
    col.countDocuments({ tenantId, sentAt: { $gte: since } }, { limit: PER_TENANT_LIMIT }),
  ])
  return perAddress < PER_ADDRESS_LIMIT && perTenant < PER_TENANT_LIMIT
}

export async function recordLeadEmail(tenantId: string, email: string): Promise<void> {
  const addressHash = hashAddress(email)
  const col = await collection()
  if (!col) {
    const now = Date.now()
    memoryRecord(`a:${addressHash}`, now)
    memoryRecord(`t:${tenantId}`, now)
    return
  }
  await col.insertOne({ tenantId, addressHash, sentAt: new Date() }).catch((err) => {
    console.warn('[lead-email-guard] log write failed', err instanceof Error ? err.message : err)
  })
}
