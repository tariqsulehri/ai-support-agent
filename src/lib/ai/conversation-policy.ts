import type { TenantConfig } from '@/lib/tenants/types'

export type ConversationPolicyResult =
  | { type: 'continue' }
  | { type: 'out_of_scope'; reply: string }

const OUT_OF_SCOPE_TERMS = [
  'doctor',
  'medicine',
  'medical',
  'lawyer',
  'legal advice',
  'court case',
  'restaurant',
  'food order',
  'hotel',
  'hotel booking',
  'flight',
  'flight booking',
  'real estate',
  'property dealer',
  'loan',
  'insurance claim',
  'tax filing',
  'accounting',
  'school admission',
  'visa application',
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function mentionsTenantService(message: string, tenant: TenantConfig): boolean {
  const normalized = normalize(message)
  return tenant.services.some((service) =>
    service
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
      .some((word) => normalized.includes(word))
  )
}

function tenantScopeReply(tenant: TenantConfig): string {
  const services = tenant.services.slice(0, 4).join(', ')
  return `This service is out of scope for us, but we can help with ${services}.`
}

export function evaluateCustomerMessage(
  message: string,
  tenant: TenantConfig
): ConversationPolicyResult {
  const normalized = normalize(message)
  if (!normalized || normalized === '__greet__') return { type: 'continue' }
  if (mentionsTenantService(normalized, tenant)) return { type: 'continue' }

  const isOutOfScope = OUT_OF_SCOPE_TERMS.some((term) => normalized.includes(term))
  if (!isOutOfScope) return { type: 'continue' }

  return {
    type: 'out_of_scope',
    reply: tenantScopeReply(tenant),
  }
}
