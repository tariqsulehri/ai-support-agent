import { getMongoDb, isMongoConfigured } from '@/lib/db/mongodb'
import { getDecryptedTenantSecretFromDb } from '@/lib/tenants/secrets'

let bootstrapPromise: Promise<string | null> | null = null

/**
 * Reads DEFAULT_TENANT_ID from environment (defaults to 'ai-scripto'),
 * reads its OpenAI API key from the database collection (tenant_secrets),
 * and automatically sets process.env.OPENAI_API_KEY so OpenAI works across the platform.
 */
export async function bootstrapDefaultTenantOpenAIKey(): Promise<string | null> {
  // If already set in process.env, return it
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim()
  }

  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    try {
      if (!isMongoConfigured()) return null

      const defaultTenantId = process.env.DEFAULT_TENANT_ID?.trim() || 'ai-scripto'
      const db = await getMongoDb()
      if (!db) return null

      const key =
        (await getDecryptedTenantSecretFromDb(db, defaultTenantId, 'openai_api_key')) ??
        undefined

      if (key?.trim()) {
        process.env.OPENAI_API_KEY = key.trim()
        console.info(
          `[bootstrap] OpenAI API key loaded from database for tenant "${defaultTenantId}" and set in environment.`
        )
        return key.trim()
      }
    } catch (err) {
      console.warn('[bootstrap] Could not load default tenant OpenAI key from database:', err)
    } finally {
      bootstrapPromise = null
    }
    return null
  })()

  return bootstrapPromise
}
