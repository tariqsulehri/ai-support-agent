import { getOpenAIClient } from './client'
import { env } from '@/lib/config/env'
import type { OpenAIVoice } from '@/types'

/**
 * Convert text to speech audio (MP3).
 * Returns a Buffer ready to stream back in an HTTP response.
 *
 * voice parameter allows per-request override (e.g., from UI voice selector).
 * Falls back to TTS_VOICE env var, then to 'nova'.
 */
export async function synthesizeSpeech(
  text: string,
  voice?: string
): Promise<Buffer> {
  const normalized = normalizeForSpeech(text)
  if (env.TTS_PROVIDER === 'elevenlabs') {
    return synthesizeElevenLabs(normalized)
  }
  return synthesizeOpenAI(normalized, (voice as OpenAIVoice) ?? env.TTS_VOICE)
}

// ── Pronunciation normalization ────────────────────────────────────────────────
// TTS engines spell out words that have no vowels. Replace brand names with
// phonetic equivalents so they are spoken as a single word.
const PRONUNCIATION_MAP: [RegExp, string][] = [
  [/support agent/gi, 'Support Agent'],
]

function normalizeForSpeech(text: string): string {
  return PRONUNCIATION_MAP.reduce((t, [pattern, replacement]) => t.replace(pattern, replacement), text)
}

// ── OpenAI TTS ─────────────────────────────────────────────────────────────────
async function synthesizeOpenAI(text: string, voice: OpenAIVoice): Promise<Buffer> {
  const client = getOpenAIClient()

  const response = await client.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    speed: 1.0,
  })

  return Buffer.from(await response.arrayBuffer())
}

// ── ElevenLabs TTS ─────────────────────────────────────────────────────────────
async function synthesizeElevenLabs(text: string): Promise<Buffer> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is missing. Add it to .env.local or set TTS_PROVIDER=openai')
  }

  const { ElevenLabsClient } = await import('elevenlabs')
  const { Readable } = await import('stream')

  const client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY })

  const audioStream = await client.textToSpeech.convert(env.ELEVENLABS_VOICE_ID, {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.80,
      style: 0.35,
      use_speaker_boost: true,
    },
  })

  const readable =
    audioStream instanceof Readable
      ? audioStream
      : Readable.fromWeb(audioStream as Parameters<typeof Readable.fromWeb>[0])

  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  return Buffer.concat(chunks)
}
