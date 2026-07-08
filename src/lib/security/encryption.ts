import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { env } from '@/lib/config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

export interface EncryptedValue {
  ciphertext: string
  iv: string
  authTag: string
  algorithm: typeof ALGORITHM
  keyVersion: number
}

function decodeEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim()

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }

  const base64 = Buffer.from(trimmed, 'base64')
  if (base64.length === KEY_BYTES) return base64

  if (trimmed.length >= KEY_BYTES) {
    return createHash('sha256').update(trimmed, 'utf8').digest()
  }

  throw new Error(
    'PLATFORM_ENCRYPTION_KEY must be 32+ characters, 64-char hex, or base64-encoded 32 bytes.'
  )
}

function getEncryptionKey(): Buffer {
  if (!env.PLATFORM_ENCRYPTION_KEY) {
    throw new Error('PLATFORM_ENCRYPTION_KEY is required for tenant secret encryption.')
  }

  return decodeEncryptionKey(env.PLATFORM_ENCRYPTION_KEY)
}

export function encryptSecret(plaintext: string): EncryptedValue {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    algorithm: ALGORITHM,
    keyVersion: 1,
  }
}

export function decryptSecret(value: EncryptedValue): string {
  if (value.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported secret encryption algorithm: ${value.algorithm}`)
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(value.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function secretFingerprint(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function maskSecret(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 8) return '********'
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}
