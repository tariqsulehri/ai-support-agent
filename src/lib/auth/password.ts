import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('base64url')
  return `scrypt:${salt}:${derived}`
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [scheme, salt, expected] = passwordHash.split(':')
  if (scheme !== 'scrypt' || !salt || !expected) return false

  const actual = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString('base64url'))
  const expectedBuffer = Buffer.from(expected)

  if (actual.length !== expectedBuffer.length) return false
  return timingSafeEqual(actual, expectedBuffer)
}
