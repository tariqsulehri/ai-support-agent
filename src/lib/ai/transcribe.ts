import { toFile } from 'openai'
import { getOpenAIClient } from './client'
import type { TenantConfig } from '@/lib/tenants/types'

/** Whisper infers the codec from the file extension, so it must match the recorder's format. */
function audioExtension(mimeType: string): string {
  const type = mimeType.split(';')[0].trim().toLowerCase()
  if (type === 'audio/mp4' || type === 'audio/x-m4a' || type === 'audio/aac') return 'm4a'
  if (type === 'audio/ogg') return 'ogg'
  if (type === 'audio/mpeg') return 'mp3'
  if (type === 'audio/wav' || type === 'audio/x-wav') return 'wav'
  return 'webm'
}

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

  const file = await toFile(audio, `audio.${audioExtension(audio.type)}`, { type: audio.type || 'audio/webm' })

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    ...(languageCode ? { language: languageCode } : {}),
  })

  return transcription.text.trim()
}
