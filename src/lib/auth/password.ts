import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64
/** Hard cap on password length to bound scrypt work per attempt. */
export const MAX_PASSWORD_LENGTH = 1024

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('base64url')
  return `scrypt:${salt}:${derived}`
}

function parseHash(passwordHash: string): { salt: string; expected: string } | null {
  const [scheme, salt, expected] = passwordHash.split(':')
  if (scheme !== 'scrypt' || !salt || !expected) return null
  return { salt, expected }
}

function compareDerived(derived: Buffer, expected: string): boolean {
  const actual = Buffer.from(derived.toString('base64url'))
  const expectedBuffer = Buffer.from(expected)
  if (actual.length !== expectedBuffer.length) return false
  return timingSafeEqual(actual, expectedBuffer)
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const parsed = parseHash(passwordHash)
  if (!parsed || password.length > MAX_PASSWORD_LENGTH) return false
  return compareDerived(scryptSync(password, parsed.salt, KEY_LENGTH), parsed.expected)
}

/**
 * Non-blocking variant of verifyPassword: runs scrypt on the libuv threadpool
 * so concurrent logins do not stall the event loop.
 */
export async function verifyPasswordAsync(password: string, passwordHash: string): Promise<boolean> {
  const parsed = parseHash(passwordHash)
  if (!parsed || password.length > MAX_PASSWORD_LENGTH) return false
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, parsed.salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key)))
  })
  return compareDerived(derived, parsed.expected)
}

let dummyHash: string | null = null

/**
 * Performs an equivalent scrypt computation when no user record exists so the
 * response time does not reveal whether an email is registered.
 */
export async function burnPasswordVerification(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  await verifyPasswordAsync(password.slice(0, MAX_PASSWORD_LENGTH), dummyHash)
}
