import OpenAI from 'openai'
import { env } from '@/lib/config/env'

// Singleton for the server-level fallback key
let _defaultClient: OpenAI | null = null

/**
 * Returns an OpenAI client using the given API key, or the server-level
 * OPENAI_API_KEY as a fallback. Server-side only — keys must never reach the browser.
 */
export function getOpenAIClient(apiKey?: string): OpenAI {
  if (apiKey) return new OpenAI({ apiKey })
  if (!_defaultClient) {
    _defaultClient = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }
  return _defaultClient
}
