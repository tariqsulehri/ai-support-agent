/**
 * Small process-local TTL cache for resolved tenant bundles.
 *
 * Every embed API request resolves its tenant (often twice: once for auth, once
 * for the handler). Building a tenant bundle costs several MongoDB round trips
 * plus AES-GCM decryption of tenant secrets, so results are memoized briefly.
 * In-flight lookups are shared, and rejected lookups are evicted immediately so
 * a transient failure never poisons the cache.
 *
 * Any code that mutates tenant records, settings, domains, embed keys or secrets
 * must call `invalidateTenantCache()` so changes take effect immediately.
 */

const DEFAULT_TTL_MS = 15_000
const MAX_ENTRIES = 500

type Entry<T> = { expiresAt: number; value: Promise<T> }

type TenantCacheGlobal = typeof globalThis & {
  __voiceAgentTenantCache?: Map<string, Entry<unknown>>
}

const g = globalThis as TenantCacheGlobal

function store(): Map<string, Entry<unknown>> {
  return (g.__voiceAgentTenantCache ??= new Map())
}

function ttlMs(): number {
  const raw = Number(process.env.TENANT_CACHE_TTL_MS)
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_TTL_MS
}

export function cachedTenantLookup<T>(key: string, load: () => Promise<T>): Promise<T> {
  const ttl = ttlMs()
  if (ttl === 0) return load()

  const cache = store()
  const now = Date.now()
  const hit = cache.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) {
    // Refresh LRU position.
    cache.delete(key)
    cache.set(key, hit)
    return hit.value
  }

  const value = load()
  const entry: Entry<T> = { expiresAt: now + ttl, value }
  cache.set(key, entry)
  value.catch(() => {
    if (cache.get(key) === entry) cache.delete(key)
  })

  if (cache.size > MAX_ENTRIES) {
    for (const [k, e] of cache) {
      if (cache.size <= MAX_ENTRIES) break
      if (e.expiresAt <= now || cache.size > MAX_ENTRIES) cache.delete(k)
    }
  }

  return value
}

/** Drops cached tenant lookups. Tenant mutations are rare, so clear everything. */
export function invalidateTenantCache(): void {
  store().clear()
}
