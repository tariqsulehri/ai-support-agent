/**
 * Generates the narration: one MP3 per scene from the `voiceover` text in
 * demo/scenes.ts, plus durations.json (used by the recorder to hold each scene long
 * enough, and by build-video.sh to place audio on the timeline).
 *
 *   npm run demo:voiceover
 *
 * Providers (DEMO_TTS_PROVIDER):
 *   openai      (default)  needs OPENAI_API_KEY.  Voice: DEMO_TTS_VOICE (default "nova"),
 *                          model: DEMO_TTS_MODEL (default "tts-1-hd").
 *   elevenlabs             needs ELEVENLABS_API_KEY. Voice: DEMO_TTS_VOICE or ELEVENLABS_VOICE_ID.
 *
 * Output: demo/output/audio/<scene>.mp3 and demo/output/audio/durations.json
 * Prefer a human voice? Record your own <scene>.mp3 files into that folder with the
 * same names and run `npm run demo:voiceover -- --durations-only`.
 */
import '../src/scripts/load-env'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import OpenAI from 'openai'
import { SCENES } from './scenes'

const OUT = path.join(__dirname, 'output', 'audio')
const PROVIDER = (process.env.DEMO_TTS_PROVIDER || 'openai').toLowerCase()
const ONLY = process.env.DEMO_SCENES?.split(',').map((s) => s.trim())
const DURATIONS_ONLY = process.argv.includes('--durations-only')

async function openaiSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set (put it in .env.local, never in the repo).')
  const client = new OpenAI({ apiKey })
  const res = await client.audio.speech.create({
    model: process.env.DEMO_TTS_MODEL || 'tts-1-hd',
    voice: (process.env.DEMO_TTS_VOICE || 'nova') as 'nova',
    input: text,
    speed: Number(process.env.DEMO_TTS_SPEED || 1.0),
    response_format: 'mp3',
  })
  return Buffer.from(await res.arrayBuffer())
}

async function elevenLabsSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set (put it in .env.local, never in the repo).')
  const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js')
  const client = new ElevenLabsClient({ apiKey })
  const voiceId = process.env.DEMO_TTS_VOICE || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2',
    voiceSettings: { stability: 0.5, similarityBoost: 0.8, style: 0.3, useSpeakerBoost: true },
  })
  const readable = audio instanceof Readable ? audio : Readable.fromWeb(audio as Parameters<typeof Readable.fromWeb>[0])
  const chunks: Buffer[] = []
  for await (const chunk of readable) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  return Buffer.concat(chunks)
}

function durationOf(file: string): number {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return Number(out.toString().trim())
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true })
  const durationsFile = path.join(OUT, 'durations.json')
  const durations: Record<string, number> = fs.existsSync(durationsFile)
    ? JSON.parse(fs.readFileSync(durationsFile, 'utf8'))
    : {}

  for (const scene of SCENES) {
    if (ONLY && !ONLY.includes(scene.id)) continue
    const file = path.join(OUT, `${scene.id}.mp3`)
    if (!DURATIONS_ONLY) {
      process.stdout.write(`[demo:voiceover] ${scene.id} ... `)
      const audio = PROVIDER === 'elevenlabs' ? await elevenLabsSpeech(scene.voiceover) : await openaiSpeech(scene.voiceover)
      fs.writeFileSync(file, audio)
    }
    if (!fs.existsSync(file)) throw new Error(`Missing ${file}`)
    durations[scene.id] = Number(durationOf(file).toFixed(2))
    if (!DURATIONS_ONLY) console.info(`${durations[scene.id]}s`)
  }

  fs.writeFileSync(durationsFile, JSON.stringify(durations, null, 2))
  const total = Object.values(durations).reduce((a, b) => a + b, 0)
  console.info(`[demo:voiceover] narration total ${total.toFixed(1)}s -> ${path.relative(process.cwd(), durationsFile)}`)
}

main().catch((err) => {
  console.error('[demo:voiceover] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
