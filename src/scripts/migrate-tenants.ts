import './load-env'
import { MongoClient } from 'mongodb'
import tenantsRaw from '../data/tenants.json'
import { TENANT_COLLECTIONS, type TenantStatus } from '../lib/tenants/db-types'
import { hashTenantCredential } from '../lib/tenants/hash'
import { normalizeOrigin, normalizeTenantId } from '../lib/tenants/normalize'
import type { TenantConfig } from '../lib/tenants/types'

type MigrationSummary = {
  tenantsUpserted: number
  settingsUpserted: number
  domainsUpserted: number
  embedKeysUpserted: number
  skippedDomains: number
  errors: string[]
}

const tenants = tenantsRaw as TenantConfig[]
const TENANT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function required(value: string | undefined, label: string, tenantId: string, errors: string[]): void {
  if (!value?.trim()) errors.push(`${tenantId}: ${label} is required.`)
}

function publicIdForTenant(tenantId: string): string {
  return `tn_${tenantId.replace(/[^a-z0-9]+/g, '_')}`
}

function validateTenant(tenant: TenantConfig): string[] {
  const errors: string[] = []
  const tenantId = tenant.id || 'unknown'

  required(tenant.id, 'tenant id', tenantId, errors)
  required(tenant.companyName, 'companyName', tenantId, errors)
  required(tenant.agentName, 'agentName', tenantId, errors)
  required(tenant.ttsVoice, 'ttsVoice', tenantId, errors)

  if (tenant.id && !TENANT_ID_RE.test(tenant.id)) {
    errors.push(`${tenantId}: tenant id must be lowercase kebab-case.`)
  }

  if (tenant.ttsProvider !== 'openai' && tenant.ttsProvider !== 'elevenlabs') {
    errors.push(`${tenantId}: ttsProvider must be "openai" or "elevenlabs".`)
  }

  if (!tenant.services?.length) {
    errors.push(`${tenantId}: at least one service is required.`)
  }

  for (const entry of tenant.knowledgeBase ?? []) {
    if (!entry.topic?.trim() || !entry.content?.trim()) {
      errors.push(`${tenantId}: knowledgeBase entries require topic and content.`)
    }
  }

  return errors
}

function isAllowedOrigin(origin: string): boolean {
  if (origin.startsWith('http://localhost:')) return true
  if (origin.startsWith('http://127.0.0.1:')) return true
  return origin.startsWith('https://')
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    throw new Error('MONGODB_URI is required to migrate tenants.')
  }

  const dbName = process.env.MONGODB_DB_NAME?.trim() || 'voiceagent'
  const client = await MongoClient.connect(uri, {
    appName: 'voiceagent-tenant-migration',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })

  const summary: MigrationSummary = {
    tenantsUpserted: 0,
    settingsUpserted: 0,
    domainsUpserted: 0,
    embedKeysUpserted: 0,
    skippedDomains: 0,
    errors: [],
  }

  try {
    const db = client.db(dbName)
    const tenantCollection = db.collection(TENANT_COLLECTIONS.tenants)
    const settingsCollection = db.collection(TENANT_COLLECTIONS.settings)
    const domainCollection = db.collection(TENANT_COLLECTIONS.domains)
    const embedKeyCollection = db.collection(TENANT_COLLECTIONS.embedKeys)

    await Promise.all([
      tenantCollection.createIndex({ tenantId: 1 }, { unique: true }),
      tenantCollection.createIndex({ publicId: 1 }, { unique: true }),
      tenantCollection.createIndex({ slug: 1 }, { unique: true }),
      tenantCollection.createIndex({ status: 1 }),
      settingsCollection.createIndex({ tenantId: 1 }, { unique: true }),
      domainCollection.createIndex({ tenantId: 1, origin: 1 }, { unique: true }),
      domainCollection.createIndex({ origin: 1 }),
      domainCollection.createIndex({ status: 1 }),
      embedKeyCollection.createIndex({ tenantId: 1 }),
      embedKeyCollection.createIndex({ tokenHash: 1 }),
      embedKeyCollection.createIndex({ apiKeyHashes: 1 }),
      embedKeyCollection.createIndex({ status: 1 }),
    ])

    for (const rawTenant of tenants) {
      const tenant = { ...rawTenant, id: normalizeTenantId(rawTenant.id) }
      const validationErrors = validateTenant(tenant)
      if (validationErrors.length) {
        summary.errors.push(...validationErrors)
        continue
      }

      const now = new Date()
      const tenantId = tenant.id
      const status: TenantStatus = 'active'

      await tenantCollection.updateOne(
        { tenantId },
        {
          $setOnInsert: {
            tenantId,
            publicId: publicIdForTenant(tenantId),
            slug: tenantId,
            createdAt: now,
          },
          $set: {
            companyName: tenant.companyName,
            status,
            updatedAt: now,
          },
        },
        { upsert: true }
      )
      summary.tenantsUpserted += 1

      await settingsCollection.updateOne(
        { tenantId },
        {
          $setOnInsert: {
            tenantId,
            createdAt: now,
          },
          $set: {
            openaiApiKeyEnv: tenant.openaiApiKeyEnv,
            agentName: tenant.agentName,
            companyName: tenant.companyName,
            languageMode: tenant.languageMode,
            supportedLanguages: tenant.supportedLanguages,
            languageVoices: tenant.languageVoices,
            tone: tenant.tone,
            ttsProvider: tenant.ttsProvider,
            ttsVoice: tenant.ttsVoice,
            voiceProfile: tenant.voiceProfile,
            services: tenant.services,
            customInstructions: tenant.customInstructions,
            knowledgeBase: tenant.knowledgeBase,
            greeting: tenant.greeting,
            emailNotifications: tenant.emailNotifications,
            updatedAt: now,
          },
        },
        { upsert: true }
      )
      summary.settingsUpserted += 1

      for (const domain of tenant.allowedDomains ?? []) {
        const origin = normalizeOrigin(domain)
        if (!origin || !isAllowedOrigin(origin)) {
          summary.skippedDomains += 1
          summary.errors.push(`${tenantId}: skipped invalid or insecure domain "${domain}".`)
          continue
        }

        await domainCollection.updateOne(
          { tenantId, origin },
          {
            $setOnInsert: {
              tenantId,
              origin,
              createdAt: now,
            },
            $set: {
              status,
              updatedAt: now,
            },
          },
          { upsert: true }
        )
        summary.domainsUpserted += 1
      }

      const tokenHash = tenant.token ? hashTenantCredential(tenant.token) : undefined
      const apiKeyHashes = [...new Set((tenant.apiKeys ?? []).map(hashTenantCredential))]

      if (tokenHash || apiKeyHashes.length) {
        await embedKeyCollection.updateOne(
          { tenantId },
          {
            $setOnInsert: {
              tenantId,
              createdAt: now,
            },
            $set: {
              tokenHash,
              apiKeyHashes,
              status,
              updatedAt: now,
            },
          },
          { upsert: true }
        )
        summary.embedKeysUpserted += 1
      }
    }
  } finally {
    await client.close()
  }

  console.info('[tenants:migrate] complete', summary)

  if (summary.errors.length > 0) {
    console.warn('[tenants:migrate] completed with validation warnings')
  }
}

main().catch((err) => {
  console.error('[tenants:migrate] failed', err)
  process.exitCode = 1
})
