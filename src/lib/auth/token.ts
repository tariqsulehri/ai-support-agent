import { env } from '@/lib/config/env'
import type { AuthSession } from './types'

const SESSION_TTL_SECONDS = 60 * 60 * 8

function authSecret(): string {
  const secret = env.AUTH_SECRET ?? env.PLATFORM_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET or PLATFORM_ENCRYPTION_KEY must be at least 32 characters for sessions.'
    )
  }
  return secret
}

function base64urlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function textEncode(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function textDecode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = authSecret()
  return await crypto.subtle.importKey(
    'raw',
    toBufferSource(textEncode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signPayload(payload: string): Promise<string> {
  const key = await getHmacKey()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, toBufferSource(textEncode(payload)))
  return base64urlEncode(signatureBuffer)
}

async function verifyPayloadSignature(payload: string, signatureB64url: string): Promise<boolean> {
  try {
    const key = await getHmacKey()
    const signatureBytes = base64urlDecode(signatureB64url)
    return await crypto.subtle.verify(
      'HMAC',
      key,
      toBufferSource(signatureBytes),
      toBufferSource(textEncode(payload))
    )
  } catch {
    return false
  }
}

export async function createSessionToken(input: Omit<AuthSession, 'exp'>): Promise<string> {
  const payloadJson = JSON.stringify({
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })
  const payload = base64urlEncode(textEncode(payloadJson))
  const signature = await signPayload(payload)
  return `${payload}.${signature}`
}

export async function verifySessionToken(token: string | undefined): Promise<AuthSession | null> {
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const isValid = await verifyPayloadSignature(payload, signature)
  if (!isValid) return null

  try {
    const decodedText = textDecode(base64urlDecode(payload))
    const parsed = JSON.parse(decodedText) as AuthSession
    if (!parsed.userId || !parsed.email || !parsed.role || !parsed.exp) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
