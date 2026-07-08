import type { Collection, Db } from 'mongodb'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { decryptSecret, encryptSecret, maskSecret, secretFingerprint } from '@/lib/security/encryption'
import { TENANT_COLLECTIONS, type TenantSecretKind, type TenantSecretRecord } from './db-types'
import { normalizeTenantId } from './normalize'

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

export async function ensureTenantSecretIndexes(db: Db): Promise<void> {
  await Promise.all([
    collection(db).createIndex({ tenantId: 1, kind: 1 }, { unique: true }),
    collection(db).createIndex({ tenantId: 1 }),
    collection(db).createIndex({ kind: 1 }),
    collection(db).createIndex({ status: 1 }),
    collection(db).createIndex({ valueFingerprint: 1 }),
  ])
}

async function getTenantSecretsDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null
  const db = await getMongoDb()
  if (db) await ensureTenantSecretIndexes(db)
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
  await ensureTenantSecretIndexes(db)
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

  const record = await collection(db).findOne({
    tenantId: normalizeTenantId(tenantId),
    kind,
  })
  if (!record) return null

  return {
    tenantId: record.tenantId,
    kind: record.kind,
    status: record.status,
    maskedValue: record.maskedValue,
    updatedAt: record.updatedAt,
  }
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

  return decryptSecret({
    ciphertext: record.ciphertext,
    iv: record.iv,
    authTag: record.authTag,
    algorithm: record.algorithm,
    keyVersion: record.keyVersion,
  })
}

export async function getDecryptedTenantSecret(
  tenantId: string,
  kind: TenantSecretKind
): Promise<string | null> {
  const db = await getTenantSecretsDb()
  if (!db) return null
  return getDecryptedTenantSecretFromDb(db, tenantId, kind)
}
