import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from '@/lib/config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32
export const CLIENT_API_KEY_PREFIX = 'vack_live_'

export interface ClientKeyPayload {
  tid: string // Authoritative Tenant ID (cannot be forged or modified)
  kid: string // Key identifier for auditing / rotation
  iat: number // Issued at timestamp (epoch seconds)
  type: 'client_publishable'
  v: number // Schema version
}

function resolveServerKey(): Buffer {
  const raw = (
    process.env.ENCRYPTION_KEY ||
    env.PLATFORM_ENCRYPTION_KEY ||
    env.AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    'voiceagent_default_master_server_secret_32bytes_min'
  ).trim()

  // 1. Direct 64-character hex (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  // 2. Direct 32-byte Base64
  const base64 = Buffer.from(raw, 'base64')
  if (base64.length === KEY_BYTES) {
    return base64
  }

  // 3. Any string hashed via SHA-256 yields deterministic 32-byte AES key
  return createHash('sha256').update(raw, 'utf8').digest()
}

/**
 * Server-only: Mint an encrypted client API key for a tenant.
 *
 * Format: vack_live_<iv_b64url>.<ciphertext_b64url>.<authTag_b64url>
 *
 * The tenant ID is cryptographically sealed inside the ciphertext.
 * Any modification to the ciphertext or auth tag causes decryption failure.
 */
export function mintClientApiKey(tenantId: string, kid?: string): string {
  const cleanTenantId = tenantId.trim()
  if (!cleanTenantId) {
    throw new Error('Tenant ID is required to mint a client API key.')
  }

  const masterKey = resolveServerKey()
  const iv = randomBytes(IV_BYTES)
  const keyId = kid || randomBytes(8).toString('hex')

  const payload: ClientKeyPayload = {
    tid: cleanTenantId,
    kid: keyId,
    iat: Math.floor(Date.now() / 1000),
    type: 'client_publishable',
    v: 1,
  }

  const cipher = createCipheriv(ALGORITHM, masterKey, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${CLIENT_API_KEY_PREFIX}${iv.toString('base64url')}.${ciphertext.toString('base64url')}.${authTag.toString('base64url')}`
}

/**
 * Server-only: Decrypt, authenticate, and extract the authoritative tenantId from a client API key.
 *
 * Returns null if:
 * - Key is missing or does not start with vack_live_
 * - Format is malformed (not 3 dot-separated base64url segments)
 * - AEAD authentication tag verification fails (ciphertext or tag was tampered with)
 * - Server key does not match
 * - Payload structure is invalid or not type: 'client_publishable'
 */
export function decryptClientApiKey(apiKey: string | undefined | null): ClientKeyPayload | null {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith(CLIENT_API_KEY_PREFIX)) {
    return null
  }

  const raw = apiKey.slice(CLIENT_API_KEY_PREFIX.length)
  const parts = raw.split('.')
  if (parts.length !== 3) return null

  const [ivB64, cipherB64, tagB64] = parts
  if (!ivB64 || !cipherB64 || !tagB64) return null

  try {
    const masterKey = resolveServerKey()
    const iv = Buffer.from(ivB64, 'base64url')
    const ciphertext = Buffer.from(cipherB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')

    if (iv.length !== IV_BYTES || authTag.length !== 16) {
      return null
    }

    const decipher = createDecipheriv(ALGORITHM, masterKey, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8')

    const parsed = JSON.parse(decrypted) as ClientKeyPayload
    if (
      !parsed.tid ||
      typeof parsed.tid !== 'string' ||
      parsed.type !== 'client_publishable' ||
      !parsed.iat
    ) {
      return null
    }

    return {
      tid: parsed.tid.trim(),
      kid: parsed.kid,
      iat: parsed.iat,
      type: 'client_publishable',
      v: parsed.v ?? 1,
    }
  } catch {
    // AEAD auth tag verification failure or corrupt data
    return null
  }
}

/**
 * Masks a client API key for UI display: vack_live_abc...xyz
 */
export function maskClientApiKey(apiKey: string): string {
  if (!apiKey.startsWith(CLIENT_API_KEY_PREFIX)) return '••••••••'
  const raw = apiKey.slice(CLIENT_API_KEY_PREFIX.length)
  if (raw.length <= 12) return `${CLIENT_API_KEY_PREFIX}••••••••`
  return `${CLIENT_API_KEY_PREFIX}${raw.slice(0, 6)}••••${raw.slice(-4)}`
}

