import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/lib/config/env'

const EMBED_SESSION_TTL_SECONDS = 60 * 30

export interface EmbedSession {
  tenantId: string
  origin: string
  exp: number
}

function sessionSecret(): string {
  const secret = env.AUTH_SECRET ?? env.PLATFORM_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET or PLATFORM_ENCRYPTION_KEY must be at least 32 characters for embed sessions.')
  }
  return secret
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
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null

  try {
    const parsed = JSON.parse(unbase64url(payload)) as EmbedSession
    if (!parsed.tenantId || !parsed.origin || !parsed.exp) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
