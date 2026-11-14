import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { env } from '@/lib/config/env'

function tokenSecret(): string {
  const secret = env.AUTH_SECRET ?? env.PLATFORM_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET or PLATFORM_ENCRYPTION_KEY must be at least 32 characters for signed tokens.')
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
  return createHmac('sha256', tokenSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export interface SignedEmbedTokenPayload {
  tenantId: string
  nonce: string
  createdAt: number
}

/**
 * Creates a cryptographically signed embed token that explicitly embeds the tenant ID.
 * Format: emb_<base64urlPayload>_<signature>
 */
export function createSignedEmbedToken(tenantId: string): string {
  const payload = base64url(
    JSON.stringify({
      tenantId: tenantId.trim(),
      nonce: randomBytes(12).toString('hex'),
      createdAt: Math.floor(Date.now() / 1000),
    } satisfies SignedEmbedTokenPayload)
  )
  return `emb.${payload}.${sign(payload)}`
}

/**
 * Cryptographically verifies a signed embed token and extracts the tenant ID.
 * Returns null if the signature is invalid, token is tampered with, or tenantId is missing.
 */
export function verifySignedEmbedToken(token: string | undefined): SignedEmbedTokenPayload | null {
  if (!token || !token.startsWith('emb.')) return null
  const parts = token.slice(4).split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null

  try {
    const parsed = JSON.parse(unbase64url(payload)) as SignedEmbedTokenPayload
    if (!parsed.tenantId || typeof parsed.tenantId !== 'string' || !parsed.tenantId.trim()) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
