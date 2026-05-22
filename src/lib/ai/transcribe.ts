import { toFile } from 'openai'
import { getOpenAIClient } from './client'
import type { TenantConfig } from '@/lib/tenants/types'

/**
 * Transcribe audio using OpenAI Whisper.
 * Accepts a Web API File (from the browser via FormData) or a Node.js Buffer.
 */
export async function transcribeAudio(
  audio: File | Blob,
  languageCode: string | null,
  tenant?: TenantConfig
): Promise<string> {
  const client = getOpenAIClient(tenant)

  const file = await toFile(audio, 'audio.webm', { type: 'audio/webm' })

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    ...(languageCode ? { language: languageCode } : {}),
  })

  return transcription.text.trim()
}
