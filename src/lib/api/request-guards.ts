import { NextResponse, type NextRequest } from 'next/server'
import type { LeadData } from '@/types'

/**
 * Shared request hardening helpers for public (embed) API routes:
 * client IP resolution, per-IP rate limiting, bounded JSON body parsing and
 * input sanitizers for chat histories / lead objects.
 */

// ── Client IP ─────────────────────────────────────────────────────────────────
export function getClientIp(req: Pick<NextRequest, 'headers'>): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  const ip = forwarded || realIp || 'unknown'
  // Bound the key length so a hostile header cannot bloat the limiter map.
  return ip.slice(0, 64)
}

// ── Per-IP fixed-window rate limiting ───────────────────────────────────────────
type IpBucket = { count: number; resetAt: number }

type IpRateLimitGlobal = typeof globalThis & {
  __voiceAgentIpRateBuckets?: Map<string, IpBucket>
  __voiceAgentIpRateLastSweep?: number
}

const ipGlobal = globalThis as IpRateLimitGlobal
const MAX_IP_BUCKETS = 20_000
const SWEEP_INTERVAL_MS = 30_000

export function ipRateLimitEnabled(): boolean {
  const flag = process.env.IP_RATE_LIMIT_ENABLED?.trim()
  if (flag === 'false') return false
  if (flag === 'true') return true
  return process.env.NODE_ENV === 'production'
}

function sweepIpBuckets(buckets: Map<string, IpBucket>, now: number): void {
  const lastSweep = ipGlobal.__voiceAgentIpRateLastSweep ?? 0
  if (now - lastSweep < SWEEP_INTERVAL_MS && buckets.size < MAX_IP_BUCKETS) return
  ipGlobal.__voiceAgentIpRateLastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // Hard cap: if still oversized (flood of unique IPs), drop the oldest entries.
  if (buckets.size >= MAX_IP_BUCKETS) {
    const excess = buckets.size - Math.floor(MAX_IP_BUCKETS / 2)
    let removed = 0
    for (const key of buckets.keys()) {
      if (removed >= excess) break
      buckets.delete(key)
      removed += 1
    }
  }
}

/**
 * Returns the number of seconds to wait when the limit is exceeded, or null when allowed.
 */
export function checkIpRateLimit(key: string, limit: number, windowMs: number): number | null {
  if (!ipRateLimitEnabled()) return null

  const now = Date.now()
  const buckets = (ipGlobal.__voiceAgentIpRateBuckets ??= new Map<string, IpBucket>())
  sweepIpBuckets(buckets, now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  bucket.count += 1

  if (bucket.count > limit) {
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  }
  return null
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

// ── Bounded body parsing ───────────────────────────────────────────────────────
export class RequestBodyError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'RequestBodyError'
    this.status = status
  }
}

export function contentLengthExceeds(req: Pick<NextRequest, 'headers'>, maxBytes: number): boolean {
  const raw = req.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > maxBytes
}

/**
 * Reads and parses a JSON body, rejecting payloads larger than maxBytes
 * (checked against Content-Length up front and the actual byte count after reading).
 */
export async function readJsonBody<T = unknown>(req: Request, maxBytes: number): Promise<T> {
  if (contentLengthExceeds(req, maxBytes)) {
    throw new RequestBodyError('Request body too large', 413)
  }
  let text: string
  try {
    text = await req.text()
  } catch {
    throw new RequestBodyError('Invalid request body')
  }
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new RequestBodyError('Request body too large', 413)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new RequestBodyError('Invalid request body')
  }
}

export function bodyErrorResponse(err: unknown): NextResponse {
  if (err instanceof RequestBodyError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}

// ── Sanitizers ────────────────────────────────────────────────────────────────
export type SanitizedMessage = { role: 'user' | 'assistant'; content: string }

export function sanitizeChatHistory(
  raw: unknown,
  options: { maxMessages: number; maxContentChars: number; keepEmpty?: boolean }
): SanitizedMessage[] | null {
  if (!Array.isArray(raw)) return null

  const cleaned: SanitizedMessage[] = []
  // Only inspect the tail of very long arrays; older turns are discarded anyway.
  const start = Math.max(0, raw.length - options.maxMessages * 2)
  for (let i = start; i < raw.length; i++) {
    const item = raw[i] as { role?: unknown; content?: unknown } | null
    if (!item || typeof item !== 'object') continue
    const { role, content } = item
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    const trimmed = content.trim()
    if (!trimmed && !options.keepEmpty) continue
    cleaned.push({ role, content: trimmed.slice(0, options.maxContentChars) })
  }

  return cleaned.slice(-options.maxMessages)
}

const LEAD_FIELDS = ['name', 'email', 'phone', 'company', 'country', 'purpose'] as const
const MAX_LEAD_FIELD_CHARS = 500

/** Keeps only known LeadData string fields (bounded length); drops anything else. */
export function sanitizeLead(raw: unknown): Partial<LeadData> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const lead: Partial<LeadData> = {}
  for (const field of LEAD_FIELDS) {
    const value = source[field]
    if (typeof value === 'string') {
      const trimmed = value.trim().slice(0, MAX_LEAD_FIELD_CHARS)
      lead[field] = trimmed || null
    } else if (value === null) {
      lead[field] = null
    }
  }
  return lead
}

const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/

export function sanitizeConversationId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return CONVERSATION_ID_PATTERN.test(trimmed) ? trimmed : undefined
}

/** Fire-and-forget helper for best-effort side effects (usage counters etc.). */
export function background(promise: Promise<unknown>, label: string): void {
  promise.catch((err) => {
    console.warn(`[${label}] background task failed`, {
      error: err instanceof Error ? err.message : String(err),
    })
  })
}
