import { z } from 'zod'

/**
 * Server-level environment variables — API keys and platform config.
 * Per-tenant settings (language, TTS, voice, persona) live in tenants.json.
 *
 * Server-side only. Never import this in client components.
 */
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // ElevenLabs — only required when a tenant uses ttsProvider: "elevenlabs"
  ELEVENLABS_API_KEY:  z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default('pNInz6obpgDQGcFmaJgB'),

  // Embed security
  EMBED_AUTH_ENABLED: z.enum(['true', 'false']).default('false'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const message = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n')
    throw new Error(`\n[env] Invalid environment variables:\n${message}\n`)
  }
  return result.data
}

export const env = validateEnv()
