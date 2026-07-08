import { NextResponse } from 'next/server'
import { env } from '@/lib/config/env'
import type { TenantConfig, TenantSubscriptionType } from './types'

type RuntimeAction = 'config' | 'chat' | 'transcribe' | 'speak' | 'summarize' | 'embed_session'

type RateBucket = {
  count: number
  resetAt: number
}

type RateLimitGlobal = typeof globalThis & {
  __voiceAgentRateBuckets?: Map<string, RateBucket>
}

const globalForRateLimit = globalThis as RateLimitGlobal

const PLAN_LIMITS: Record<TenantSubscriptionType, number> = {
  free: 30,
  starter: 90,
  growth: 240,
  enterprise: 900,
  custom: 900,
}

function subscriptionEnforcementEnabled(): boolean {
  return env.SUBSCRIPTION_ENFORCEMENT_ENABLED === 'true'
}

function rateLimitEnabled(): boolean {
  return env.TENANT_RATE_LIMIT_ENABLED === 'true'
}

function isExpired(value: Date | string | undefined): boolean {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

function subscriptionError(tenant: TenantConfig): string | null {
  if (!subscriptionEnforcementEnabled()) return null

  const subscription = tenant.subscription
  if (!subscription) return 'Tenant subscription is not configured.'
  if (subscription.status === 'canceled' || subscription.status === 'expired' || subscription.status === 'past_due') {
    return `Tenant subscription is ${subscription.status}.`
  }
  if (isExpired(subscription.expiresAt)) {
    return 'Tenant subscription has expired.'
  }

  return null
}

function rateLimitError(tenant: TenantConfig, action: RuntimeAction): string | null {
  if (!rateLimitEnabled()) return null

  const now = Date.now()
  const windowMs = env.TENANT_RATE_LIMIT_WINDOW_SECONDS * 1000
  const bucketStart = Math.floor(now / windowMs) * windowMs
  const key = `${tenant.id}:${bucketStart}`
  const buckets = globalForRateLimit.__voiceAgentRateBuckets ??= new Map<string, RateBucket>()

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) buckets.delete(bucketKey)
  }

  const current = buckets.get(key) ?? { count: 0, resetAt: bucketStart + windowMs }
  const limit = PLAN_LIMITS[tenant.subscription?.type ?? 'free']
  current.count += 1
  buckets.set(key, current)

  if (current.count > limit) {
    console.warn('[tenant-rate-limit] blocked', {
      tenantId: tenant.id,
      action,
      count: current.count,
      limit,
      resetAt: new Date(current.resetAt).toISOString(),
    })
    return 'Tenant rate limit exceeded.'
  }

  return null
}

export function requireTenantRuntimeAccess(
  tenant: TenantConfig,
  action: RuntimeAction
): NextResponse | null {
  const subscriptionMessage = subscriptionError(tenant)
  if (subscriptionMessage) {
    return NextResponse.json({ error: 'Tenant access blocked', detail: subscriptionMessage }, { status: 402 })
  }

  const rateLimitMessage = rateLimitError(tenant, action)
  if (rateLimitMessage) {
    return NextResponse.json({ error: 'Rate limit exceeded', detail: rateLimitMessage }, { status: 429 })
  }

  return null
}
