import { toFile } from 'openai'
import { getOpenAIClient } from './client'

/**
 * Transcribe audio using OpenAI Whisper.
 * Accepts a Web API File (from the browser via FormData) or a Node.js Buffer.
 */
export async function transcribeAudio(
  audio: File | Blob,
  languageCode: string | null,
  apiKey?: string
): Promise<string> {
  const client = getOpenAIClient(apiKey)

  const file = await toFile(audio, 'audio.webm', { type: 'audio/webm' })

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    ...(languageCode ? { language: languageCode } : {}),
  })

  return transcription.text.trim()
}
