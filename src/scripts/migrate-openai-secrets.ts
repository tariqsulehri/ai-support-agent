import './load-env'
import { MongoClient } from 'mongodb'
import { TENANT_COLLECTIONS, type TenantAgentSettingsRecord } from '../lib/tenants/db-types'
import { upsertTenantSecretInDb } from '../lib/tenants/secrets'

type Summary = {
  migrated: number
  skipped: number
  errors: string[]
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required to migrate OpenAI tenant secrets.')

  const dbName = process.env.MONGODB_DB_NAME?.trim() || 'voiceagent'
  const client = await MongoClient.connect(uri, {
    appName: 'voiceagent-openai-secret-migration',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })

  const summary: Summary = {
    migrated: 0,
    skipped: 0,
    errors: [],
  }

  try {
    const db = client.db(dbName)
    const settings = await db
      .collection<TenantAgentSettingsRecord>(TENANT_COLLECTIONS.settings)
      .find({})
      .toArray()

    for (const setting of settings) {
      const envName = setting.openaiApiKeyEnv?.trim()
      if (!envName) {
        summary.skipped += 1
        continue
      }

      const apiKey = process.env[envName]?.trim()
      if (!apiKey) {
        summary.skipped += 1
        summary.errors.push(`${setting.tenantId}: env var ${envName} is not set.`)
        continue
      }

      await upsertTenantSecretInDb(db, {
        tenantId: setting.tenantId,
        kind: 'openai_api_key',
        value: apiKey,
      })
      summary.migrated += 1
    }
  } finally {
    await client.close()
  }

  console.info('[tenants:secrets:migrate-openai] complete', summary)
}

main().catch((err) => {
  console.error('[tenants:secrets:migrate-openai] failed', err)
  process.exitCode = 1
})
