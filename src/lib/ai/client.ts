import OpenAI from 'openai'
import { env } from '@/lib/config/env'

/**
 * Singleton OpenAI client.
 * Server-side only — the API key must never reach the browser.
 */
let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }
  return _client
}
