import './load-env'
import { MongoClient } from 'mongodb'
import { upsertTenantSecretInDb, type TenantSecretPublicMetadata } from '../lib/tenants/secrets'
import { validateOpenAIApiKey } from '../lib/ai/validate-openai-key'

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
}

async function main(): Promise<void> {
  const tenantId = arg('tenant') ?? process.env.TENANT_ID
  const apiKey = process.env.TENANT_OPENAI_API_KEY
  const shouldValidate = process.env.VALIDATE_OPENAI_KEY === 'true'

  if (!tenantId?.trim()) {
    throw new Error('Set TENANT_ID or pass --tenant=<tenant-id>.')
  }

  if (!apiKey?.trim()) {
    throw new Error('Set TENANT_OPENAI_API_KEY to the key that should be encrypted and stored.')
  }

  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required to store tenant secrets.')

  if (shouldValidate) {
    const validation = await validateOpenAIApiKey(apiKey)
    if (!validation.ok) {
      throw new Error(`OpenAI key validation failed: ${validation.error}`)
    }
  }

  const client = await MongoClient.connect(uri, {
    appName: 'voiceagent-set-openai-secret',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })

  let saved: TenantSecretPublicMetadata
  try {
    const db = client.db(process.env.MONGODB_DB_NAME?.trim() || 'voiceagent')
    saved = await upsertTenantSecretInDb(db, {
      tenantId,
      kind: 'openai_api_key',
      value: apiKey,
    })
  } finally {
    await client.close()
  }

  console.info('[tenants:secret:set-openai] saved', {
    tenantId: saved.tenantId,
    kind: saved.kind,
    maskedValue: saved.maskedValue,
    updatedAt: saved.updatedAt,
    validated: shouldValidate,
  })
}

main().catch((err) => {
  console.error('[tenants:secret:set-openai] failed', err)
  process.exitCode = 1
})
