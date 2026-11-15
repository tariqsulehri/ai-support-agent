import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/lib/config/env'

const EMBED_SESSION_TTL_SECONDS = 60 * 30

export interface EmbedSession {
  tenantId: string
  origin: string
  exp: number
}

const DEV_FALLBACK_SECRET = 'voiceagent_default_master_server_secret_32bytes_min'

let cachedSecret: { source: string; secret: string } | null = null

function sessionSecret(): string {
  const source = [
    env.PLATFORM_ENCRYPTION_KEY,
    process.env.PLATFORM_ENCRYPTION_KEY,
    env.AUTH_SECRET,
    process.env.AUTH_SECRET,
  ].map((value) => value ?? '').join('\u0000')
  if (cachedSecret?.source === source) return cachedSecret.secret
  const secret = computeSessionSecret()
  cachedSecret = { source, secret }
  return secret
}

function computeSessionSecret(): string {
  const candidates = [
    env.PLATFORM_ENCRYPTION_KEY,
    process.env.PLATFORM_ENCRYPTION_KEY,
    env.AUTH_SECRET,
    process.env.AUTH_SECRET,
  ].filter((s): s is string => typeof s === 'string' && s.trim().length >= 32)

  if (candidates.length > 0) {
    return candidates[0].trim()
  }

  // If a secret exists but is shorter than 32 characters, derive a deterministic 32-byte key via SHA-256
  const configured = (
    env.PLATFORM_ENCRYPTION_KEY ??
    process.env.PLATFORM_ENCRYPTION_KEY ??
    env.AUTH_SECRET ??
    process.env.AUTH_SECRET
  )?.trim()

  // A publicly known fallback secret would let anyone mint embed sessions for
  // any tenant, so it is only tolerated outside production.
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('PLATFORM_ENCRYPTION_KEY or AUTH_SECRET must be configured to sign embed sessions.')
  }
  const fallback = configured || DEV_FALLBACK_SECRET

  return createHash('sha256').update(fallback).digest('hex')
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function unbase64url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function originFromUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function createEmbedSessionToken(input: { tenantId: string; origin: string }): string {
  const payload = base64url(JSON.stringify({
    tenantId: input.tenantId,
    origin: input.origin,
    exp: Math.floor(Date.now() / 1000) + EMBED_SESSION_TTL_SECONDS,
  } satisfies EmbedSession))

  return `${payload}.${sign(payload)}`
}

export function verifyEmbedSessionToken(token: string | undefined): EmbedSession | null {
  if (!token || typeof token !== 'string' || token.length > 4096) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  if (!payload || !signature) return null

  try {
    if (!safeEqual(signature, sign(payload))) return null
  } catch {
    return null
  }

  try {
    const parsed = JSON.parse(unbase64url(payload)) as EmbedSession
    if (
      typeof parsed.tenantId !== 'string' || !parsed.tenantId ||
      typeof parsed.origin !== 'string' || !parsed.origin ||
      typeof parsed.exp !== 'number'
    ) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
