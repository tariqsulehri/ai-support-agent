import { createHash, timingSafeEqual } from 'crypto'

const HASH_PREFIX = 'sha256:'

export function hashTenantCredential(value: string): string {
  return `${HASH_PREFIX}${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

export function safeCompareTenantCredential(value: string, expectedHash: string | undefined): boolean {
  if (!expectedHash) return false

  const actualHash = hashTenantCredential(value)
  const actual = Buffer.from(actualHash)
  const expected = Buffer.from(expectedHash)

  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
