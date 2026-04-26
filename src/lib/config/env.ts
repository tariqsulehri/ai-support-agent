import { z } from 'zod'

/**
 * Validated, typed access to environment variables.
 * Throws at startup if any required variable is missing or invalid —
 * fail-fast is better than mysterious runtime errors.
 *
 * Server-side only. Never import this in client components.
 */
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  LANGUAGE: z.string().default('english'),

  TTS_PROVIDER: z.enum(['openai', 'elevenlabs']).default('openai'),

  TTS_VOICE: z
    .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .default('nova'),

  // ElevenLabs — optional, only required when TTS_PROVIDER=elevenlabs
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default('pNInz6obpgDQGcFmaJgB'),

  // Embed security (optional)
  EMBED_AUTH_ENABLED: z.enum(['true', 'false']).default('false'),
  EMBED_TENANTS: z.string().optional(),
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

// Evaluated once at module load — throws before any request is served
export const env = validateEnv()
