/**
 * Sliding window in-memory rate limiter for administrative authentication.
 * Mitigates brute-force credential stuffing attacks against /api/admin/auth/login.
 */

interface AttemptBucket {
  count: number
  firstAttemptAt: number
  lockedUntil?: number
}

type GlobalRateLimiter = typeof globalThis & {
  __authLoginAttempts?: Map<string, AttemptBucket>
}

const g = globalThis as GlobalRateLimiter
const buckets = (g.__authLoginAttempts ??= new Map<string, AttemptBucket>())

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes lockout after 5 failures

function cleanupOldBuckets(now: number) {
  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.lockedUntil && bucket.lockedUntil < now) {
        buckets.delete(key)
      } else if (now - bucket.firstAttemptAt > WINDOW_MS && !bucket.lockedUntil) {
        buckets.delete(key)
      }
    }
  }
}

export function checkLoginRateLimit(ip: string, email?: string): {
  allowed: boolean
  retryAfterSeconds?: number
  remaining: number
} {
  const now = Date.now()
  cleanupOldBuckets(now)

  const keys = [ip ? `ip:${ip}` : null, email ? `email:${email.trim().toLowerCase()}` : null].filter(
    Boolean
  ) as string[]

  for (const key of keys) {
    const bucket = buckets.get(key)
    if (!bucket) continue

    if (bucket.lockedUntil && bucket.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((bucket.lockedUntil - now) / 1000)
      return { allowed: false, retryAfterSeconds, remaining: 0 }
    }
  }

  // Find lowest remaining attempts among keys
  let maxUsed = 0
  for (const key of keys) {
    const bucket = buckets.get(key)
    if (bucket && now - bucket.firstAttemptAt <= WINDOW_MS) {
      if (bucket.count > maxUsed) maxUsed = bucket.count
    }
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - maxUsed)
  return { allowed: remaining > 0, remaining }
}

export function recordFailedLogin(ip: string, email?: string): void {
  const now = Date.now()
  const keys = [ip ? `ip:${ip}` : null, email ? `email:${email.trim().toLowerCase()}` : null].filter(
    Boolean
  ) as string[]

  for (const key of keys) {
    let bucket = buckets.get(key)
    if (!bucket || now - bucket.firstAttemptAt > WINDOW_MS) {
      bucket = { count: 1, firstAttemptAt: now }
    } else {
      bucket.count += 1
    }

    if (bucket.count >= MAX_ATTEMPTS) {
      bucket.lockedUntil = now + LOCKOUT_MS
    }

    buckets.set(key, bucket)
  }
}

export function resetLoginRateLimit(ip: string, email?: string): void {
  if (ip) buckets.delete(`ip:${ip}`)
  if (email) buckets.delete(`email:${email.trim().toLowerCase()}`)
}

