import { randomUUID } from 'crypto'
import type { Collection, Db } from 'mongodb'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { burnPasswordVerification, hashPassword, verifyPasswordAsync } from './password'
import { AUTH_COLLECTIONS, type AuthRole, type AuthUserRecord } from './types'

type CreateUserInput = {
  email: string
  password: string
  name?: string
  role: AuthRole
  tenantId?: string | null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function collection(db: Db): Collection<AuthUserRecord> {
  return db.collection<AuthUserRecord>(AUTH_COLLECTIONS.users)
}

export async function ensureAuthUserIndexes(db: Db): Promise<void> {
  await Promise.all([
    collection(db).createIndex({ userId: 1 }, { unique: true }),
    collection(db).createIndex({ email: 1 }, { unique: true }),
    collection(db).createIndex({ tenantId: 1 }),
    collection(db).createIndex({ role: 1 }),
    collection(db).createIndex({ status: 1 }),
  ])
}

let indexesPromise: Promise<void> | null = null

async function getAuthDb(): Promise<Db> {
  if (!isMongoConfigured()) throw new Error('MongoDB is required for admin authentication.')
  const db = await getMongoDb()
  if (!db) throw new Error('MongoDB is required for admin authentication.')
  if (!indexesPromise) {
    indexesPromise = ensureAuthUserIndexes(db).catch((err) => {
      indexesPromise = null
      console.warn('[auth indexes] index creation error:', err)
    })
  }
  return db
}

export async function upsertAuthUser(input: CreateUserInput): Promise<AuthUserRecord> {
  const db = await getAuthDb()
  const now = new Date()
  const email = normalizeEmail(input.email)
  const existing = await collection(db).findOne({ email })
  const userId = existing?.userId ?? randomUUID()

  const record: AuthUserRecord = {
    userId,
    tenantId: input.role === 'platform_admin' ? null : input.tenantId ?? null,
    email,
    name: input.name?.trim() || email,
    role: input.role,
    status: 'active',
    passwordHash: hashPassword(input.password),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastLoginAt: existing?.lastLoginAt,
  }

  await collection(db).updateOne(
    { email },
    { $set: record },
    { upsert: true }
  )

  return record
}

export async function authenticateUser(email: string, password: string): Promise<AuthUserRecord | null> {
  const db = await getAuthDb()
  const user = await collection(db).findOne({ email: normalizeEmail(email), status: 'active' })
  if (!user) {
    // Equalize timing with the found-user path to avoid account enumeration.
    await burnPasswordVerification(password)
    return null
  }
  if (!(await verifyPasswordAsync(password, user.passwordHash))) return null

  const now = new Date()
  await collection(db).updateOne(
    { userId: user.userId },
    { $set: { lastLoginAt: now, updatedAt: now } }
  )

  return user
}

export async function getAuthUserById(userId: string): Promise<AuthUserRecord | null> {
  const db = await getAuthDb()
  return collection(db).findOne({ userId, status: 'active' })
}

export async function getAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const db = await getAuthDb()
  return collection(db).findOne({ email: normalizeEmail(email), status: 'active' })
}

export async function listAuthUsersForTenant(tenantId: string): Promise<AuthUserRecord[]> {
  const db = await getAuthDb()
  return collection(db)
    .find({ tenantId, status: 'active' })
    .sort({ createdAt: 1 })
    .toArray()
}
