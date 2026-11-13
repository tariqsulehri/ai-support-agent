import './load-env'
import { MongoClient } from 'mongodb'
import { getMongoDb } from '../lib/db/mongodb'
import { getDecryptedTenantSecret } from '../lib/tenants/secrets'
import { normalizeTenantId } from '../lib/tenants/normalize'

async function migrate() {
  const tenantId = normalizeTenantId(process.argv[2] || process.env.DEFAULT_TENANT_ID || 'vital-steer-technologies')
  const shouldDelete = process.argv.includes('--delete-source')

  console.log(`\n======================================================`)
  console.log(`  Migrating Conversations for Tenant: "${tenantId}"`)
  console.log(`======================================================\n`)

  // 1. Connect to platform DB
  const platformDb = await getMongoDb()
  if (!platformDb) {
    console.error('[error] Platform database is not accessible.')
    process.exit(1)
  }

  // 2. Fetch conversations for this tenant from platform DB
  const convCollection = platformDb.collection('conversations')
  const records = await convCollection.find({ 'tenant.id': tenantId }).toArray()

  console.log(`Found ${records.length} conversation(s) in platform database for "${tenantId}".`)
  if (records.length === 0) {
    console.log('No records to migrate. Exiting.')
    process.exit(0)
  }

  // 3. Decrypt tenant target database URL
  const targetUri = await getDecryptedTenantSecret(tenantId, 'database_url')
  if (!targetUri?.trim()) {
    console.error(`[error] Tenant "${tenantId}" does not have a configured "database_url" secret.`)
    process.exit(1)
  }

  console.log(`Attempting to connect to tenant target database...`)

  let tenantClient: MongoClient
  try {
    tenantClient = await MongoClient.connect(targetUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`\n❌ Failed to connect to tenant database:`)
    console.error(errorMsg)

    if (errorMsg.includes('SSL alert number 80') || errorMsg.includes('tlsv1 alert internal error')) {
      console.error(`\n👉 Root Cause: MongoDB Atlas IP Access List (Network Access) is blocking this IP.`)
      console.error(`   To fix: In MongoDB Atlas (cloud.mongodb.com), go to Network Access -> Add IP Address,`)
      console.error(`   and whitelist 0.0.0.0/0 (or your development & server IP addresses).\n`)
    }
    process.exit(1)
  }

  try {
    const parsed = new URL(targetUri)
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '').trim() || 'voiceagent'
    const targetDb = tenantClient.db(dbName)
    const targetCollection = targetDb.collection('conversations')

    console.log(`Connected successfully to tenant database "${dbName}". Starting migration...`)

    let upsertedCount = 0
    for (const record of records) {
      const { _id, ...docWithoutId } = record
      await targetCollection.updateOne(
        { conversationId: record.conversationId },
        {
          $setOnInsert: { _id },
          $set: docWithoutId,
        },
        { upsert: true }
      )
      upsertedCount++
    }

    console.log(`\n✅ Successfully migrated ${upsertedCount} conversation(s) to tenant database!`)

    if (shouldDelete) {
      const deleteResult = await convCollection.deleteMany({ 'tenant.id': tenantId })
      console.log(`🗑️  Removed ${deleteResult.deletedCount} migrated record(s) from platform database.`)
    } else {
      console.log(`ℹ️  Source records retained in platform database (pass --delete-source to purge).`)
    }
  } finally {
    await tenantClient.close()
  }
}

migrate().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})

