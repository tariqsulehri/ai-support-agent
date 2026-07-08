import type { Collection, Db } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import type { AuthSession } from '@/lib/auth/types'

const AUDIT_COLLECTION = 'tenant_audit_logs'

export type AuditAction =
  | 'tenant.created'
  | 'tenant.archived'
  | 'tenant.disabled'
  | 'tenant.enabled'
  | 'tenant.activated'
  | 'tenant.subscription_updated'
  | 'tenant.settings_updated'
  | 'tenant.domains_updated'
  | 'tenant.domain_verified'
  | 'tenant.secret_updated'
  | 'tenant.embed_token_rotated'
  | 'tenant.user_created'

type AuditActor = {
  userId: string
  email: string
  role: string
  tenantId: string | null
}

type AuditRecord = {
  tenantId: string
  action: AuditAction
  actor: AuditActor
  target?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

type AuditInput = {
  tenantId: string
  action: AuditAction
  actor: AuthSession
  target?: string
  metadata?: Record<string, unknown>
}

let indexesReady: Promise<void> | null = null

function auditEnabled(): boolean {
  return env.AUDIT_LOGS_ENABLED === 'true'
}

function collection(db: Db): Collection<AuditRecord> {
  return db.collection<AuditRecord>(AUDIT_COLLECTION)
}

async function ensureIndexes(db: Db): Promise<void> {
  indexesReady ??= (async () => {
    await Promise.all([
      collection(db).createIndex({ tenantId: 1, createdAt: -1 }),
      collection(db).createIndex({ action: 1, createdAt: -1 }),
      collection(db).createIndex({ 'actor.userId': 1, createdAt: -1 }),
      env.AUDIT_LOGS_TTL_DAYS
        ? collection(db).createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: env.AUDIT_LOGS_TTL_DAYS * 24 * 60 * 60 }
          )
        : Promise.resolve(),
    ])
  })()

  return indexesReady
}

function safeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined
  const blocked = new Set(['password', 'token', 'secret', 'openaiApiKey', 'databaseUrl', 'embedToken'])
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !blocked.has(key))
  )
}

export async function recordAuditLog(input: AuditInput): Promise<void> {
  if (!auditEnabled() || !isMongoConfigured()) return

  try {
    const db = await getMongoDb()
    if (!db) return
    await ensureIndexes(db)

    await collection(db).insertOne({
      tenantId: input.tenantId,
      action: input.action,
      actor: {
        userId: input.actor.userId,
        email: input.actor.email,
        role: input.actor.role,
        tenantId: input.actor.tenantId,
      },
      target: input.target,
      metadata: safeMetadata(input.metadata),
      createdAt: new Date(),
    })
  } catch (error) {
    console.warn('[audit] log write skipped', {
      action: input.action,
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
