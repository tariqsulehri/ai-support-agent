import type { Collection, Db } from 'mongodb'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { decryptSecret, encryptSecret, maskSecret, secretFingerprint } from '@/lib/security/encryption'
import { TENANT_COLLECTIONS, type TenantSecretKind, type TenantSecretRecord } from './db-types'
import { normalizeTenantId } from './normalize'
import { invalidateTenantCache } from './tenant-cache'

type UpsertTenantSecretInput = {
  tenantId: string
  kind: TenantSecretKind
  value: string
}

export type TenantSecretPublicMetadata = {
  tenantId: string
  kind: TenantSecretKind
  status: TenantSecretRecord['status']
  maskedValue: string
  updatedAt: Date
}

function collection(db: Db): Collection<TenantSecretRecord> {
  return db.collection<TenantSecretRecord>(TENANT_COLLECTIONS.secrets)
}

// createIndex is idempotent but costs a round trip per index; run it once per
// Db per process. A failed attempt is forgotten so the next call retries.
const secretIndexes = new WeakMap<Db, Promise<void>>()

export function ensureTenantSecretIndexes(db: Db): Promise<void> {
  let pending = secretIndexes.get(db)
  if (!pending) {
    pending = Promise.all([
      collection(db).createIndex({ tenantId: 1, kind: 1 }, { unique: true }),
      collection(db).createIndex({ tenantId: 1 }),
      collection(db).createIndex({ kind: 1 }),
      collection(db).createIndex({ status: 1 }),
      collection(db).createIndex({ valueFingerprint: 1 }),
    ]).then(() => undefined)
    secretIndexes.set(db, pending)
    pending.catch(() => {
      if (secretIndexes.get(db) === pending) secretIndexes.delete(db)
    })
  }
  return pending
}

async function getTenantSecretsDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null
  const db = await getMongoDb()
  if (db) {
    await ensureTenantSecretIndexes(db).catch((err) => {
      console.warn('[tenant-secrets] index creation failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
  return db
}

export async function upsertTenantSecret(input: UpsertTenantSecretInput): Promise<TenantSecretPublicMetadata> {
  const db = await getTenantSecretsDb()
  if (!db) throw new Error('MongoDB is required to store tenant secrets.')

  return upsertTenantSecretInDb(db, input)
}

export async function upsertTenantSecretInDb(
  db: Db,
  input: UpsertTenantSecretInput
): Promise<TenantSecretPublicMetadata> {
  await ensureTenantSecretIndexes(db).catch(() => undefined)
  const value = input.value.trim()
  if (!value) throw new Error('Tenant secret value cannot be empty.')

  const encrypted = encryptSecret(value)
  const now = new Date()
  const record: Omit<TenantSecretRecord, 'createdAt'> = {
    tenantId: normalizeTenantId(input.tenantId),
    kind: input.kind,
    status: 'active',
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    algorithm: encrypted.algorithm,
    keyVersion: encrypted.keyVersion,
    valueFingerprint: secretFingerprint(value),
    maskedValue: maskSecret(value),
    updatedAt: now,
  }

  await collection(db).updateOne(
    { tenantId: record.tenantId, kind: record.kind },
    {
      $setOnInsert: { createdAt: now },
      $set: record,
    },
    { upsert: true }
  )
  invalidateTenantCache()

  return {
    tenantId: record.tenantId,
    kind: record.kind,
    status: record.status,
    maskedValue: record.maskedValue,
    updatedAt: record.updatedAt,
  }
}

export async function getTenantSecretMetadata(
  tenantId: string,
  kind: TenantSecretKind
): Promise<TenantSecretPublicMetadata | null> {
  const db = await getTenantSecretsDb()
  if (!db) return null

  const record = await collection(db).findOne(
    {
      tenantId: normalizeTenantId(tenantId),
      kind,
    },
    { projection: { tenantId: 1, kind: 1, status: 1, maskedValue: 1, updatedAt: 1 } }
  )
  if (!record) return null

  return {
    tenantId: record.tenantId,
    kind: record.kind,
    status: record.status,
    maskedValue: record.maskedValue,
    updatedAt: record.updatedAt,
  }
}

export async function getBatchTenantSecretsMetadata(
  tenantIds: string[],
  kind: TenantSecretKind
): Promise<Map<string, TenantSecretPublicMetadata>> {
  const map = new Map<string, TenantSecretPublicMetadata>()
  if (!tenantIds.length) return map
  const db = await getTenantSecretsDb()
  if (!db) return map

  const normalized = Array.from(new Set(tenantIds.map(normalizeTenantId)))
  const records = await collection(db)
    .find(
      { tenantId: { $in: normalized }, kind, status: 'active' },
      { projection: { tenantId: 1, kind: 1, status: 1, maskedValue: 1, updatedAt: 1 } }
    )
    .toArray()

  for (const record of records) {
    map.set(record.tenantId, {
      tenantId: record.tenantId,
      kind: record.kind,
      status: record.status,
      maskedValue: record.maskedValue,
      updatedAt: record.updatedAt,
    })
  }

  return map
}

function decryptRecord(record: TenantSecretRecord): string | null {
  try {
    return decryptSecret({
      ciphertext: record.ciphertext,
      iv: record.iv,
      authTag: record.authTag,
      algorithm: record.algorithm,
      keyVersion: record.keyVersion,
    })
  } catch (err) {
    console.warn(`[tenant-secrets] Failed to decrypt ${record.kind} for tenant ${record.tenantId}`, {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Fetches and decrypts several secret kinds in a single query. `tenantIds` is
 * ordered by preference (e.g. [tenantId, slug]); for each kind the first id
 * with a decryptable active secret wins.
 */
export async function getDecryptedTenantSecretsFromDb(
  db: Db,
  tenantIds: string[],
  kinds: TenantSecretKind[]
): Promise<Partial<Record<TenantSecretKind, string>>> {
  const ids = Array.from(new Set(tenantIds.filter(Boolean).map(normalizeTenantId)))
  if (!ids.length || !kinds.length) return {}

  const records = await collection(db)
    .find(
      { tenantId: { $in: ids }, kind: { $in: kinds }, status: 'active' },
      {
        projection: {
          tenantId: 1, kind: 1, ciphertext: 1, iv: 1, authTag: 1, algorithm: 1, keyVersion: 1,
        },
      }
    )
    .toArray()

  const result: Partial<Record<TenantSecretKind, string>> = {}
  for (const kind of kinds) {
    for (const id of ids) {
      const record = records.find((r) => r.kind === kind && r.tenantId === id)
      if (!record) continue
      const value = decryptRecord(record)
      if (value) {
        result[kind] = value
        break
      }
    }
  }
  return result
}

export async function getDecryptedTenantSecretFromDb(
  db: Db,
  tenantId: string,
  kind: TenantSecretKind
): Promise<string | null> {
  const record = await collection(db).findOne({
    tenantId: normalizeTenantId(tenantId),
    kind,
    status: 'active',
  })

  if (!record) return null

  return decryptRecord(record)
}

export async function getDecryptedTenantSecret(
  tenantId: string,
  kind: TenantSecretKind
): Promise<string | null> {
  const db = await getTenantSecretsDb()
  if (!db) return null
  return getDecryptedTenantSecretFromDb(db, tenantId, kind)
}
