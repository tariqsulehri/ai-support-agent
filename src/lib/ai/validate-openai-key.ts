import OpenAI from 'openai'

export type OpenAIKeyValidationResult =
  | { ok: true; modelCount: number }
  | { ok: false; error: string }

/**
 * Performs a minimal authenticated OpenAI request without exposing the key.
 * Intended for server-side admin flows and CLI checks only.
 */
export async function validateOpenAIApiKey(apiKey: string): Promise<OpenAIKeyValidationResult> {
  try {
    const client = new OpenAI({ apiKey })
    const models = await client.models.list()
    return { ok: true, modelCount: models.data.length }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { ok: false, error }
  }
}
