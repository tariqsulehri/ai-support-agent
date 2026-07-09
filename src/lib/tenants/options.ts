import type { TenantBillingCycle, TenantSubscriptionStatus, TenantSubscriptionType } from './db-types'

export const TENANT_SUBSCRIPTION_STATUSES: readonly TenantSubscriptionStatus[] = ['trial', 'active', 'past_due', 'canceled', 'expired']
export const TENANT_SUBSCRIPTION_TYPES: readonly TenantSubscriptionType[] = ['free', 'starter', 'growth', 'enterprise', 'custom']
export const TENANT_BILLING_CYCLES: readonly TenantBillingCycle[] = ['monthly', 'yearly', 'one_time', 'custom']
