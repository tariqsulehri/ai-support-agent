import { ObjectId, type Document } from 'mongodb'
import type { DashboardAccessScope } from '@/lib/auth/types'

export class TenantAccessDeniedError extends Error {
  readonly requestedTenantId?: string
  readonly allowedTenantId?: string

  constructor(message = 'Access denied: You do not have permission to view or modify this tenant data.', details?: {
    requestedTenantId?: string
    allowedTenantId?: string
  }) {
    super(message)
    this.name = 'TenantAccessDeniedError'
    this.requestedTenantId = details?.requestedTenantId
    this.allowedTenantId = details?.allowedTenantId
  }
}

/**
 * Enforces row-level security on a MongoDB query filter.
 * - Tenant scope: STRICTLY sets query['tenant.id'] to scope.tenantId (overwriting any spoofed values).
 * - Platform scope: Allows querying all tenants, or filters by explicitTenantId if provided.
 * - Missing/invalid scope: Injects an impossible filter to safely deny all access.
 */
export function buildRlsQuery(
  baseFilter: Document = {},
  scope?: DashboardAccessScope,
  explicitTenantId?: string
): Document {
  const securedQuery: Document = { ...baseFilter }

  if (scope?.kind === 'tenant') {
    if (!scope.tenantId || typeof scope.tenantId !== 'string' || !scope.tenantId.trim()) {
      securedQuery['tenant.id'] = '__RLS_INVALID_TENANT_SCOPE_DENIED__'
      return securedQuery
    }
    // Hard boundary: Overwrite any tenant.id parameter to prevent tenant boundary bypass
    securedQuery['tenant.id'] = scope.tenantId.trim()
    return securedQuery
  }

  if (scope?.kind === 'platform') {
    if (explicitTenantId && explicitTenantId !== 'all') {
      securedQuery['tenant.id'] = explicitTenantId.trim()
    }
    return securedQuery
  }

  // Deny all access if scope is missing or unrecognized
  securedQuery['tenant.id'] = '__RLS_UNAUTHENTICATED_DENIED__'
  return securedQuery
}

/**
 * Builds a scoped query filter for single-document lookups and mutations (update/delete).
 * Guarantees that a tenant can NEVER read or mutate a document belonging to another tenant.
 */
export function scopedRecordQuery(
  id: string,
  scope?: DashboardAccessScope
): Document {
  if (!ObjectId.isValid(id)) {
    return { _id: null, 'tenant.id': '__RLS_INVALID_OBJECT_ID__' }
  }

  const objectId = new ObjectId(id)

  if (scope?.kind === 'tenant') {
    if (!scope.tenantId || typeof scope.tenantId !== 'string' || !scope.tenantId.trim()) {
      return { _id: null, 'tenant.id': '__RLS_INVALID_TENANT_SCOPE__' }
    }
    return {
      _id: objectId,
      'tenant.id': scope.tenantId.trim(),
    }
  }

  if (scope?.kind === 'platform') {
    return { _id: objectId }
  }

  // Missing or invalid scope denies access
  return { _id: null, 'tenant.id': '__RLS_DENIED_NO_SCOPE__' }
}

/**
 * Post-query defense-in-depth filter for arrays of records in memory.
 * Ensures that even if an unexpected document was returned by MongoDB, it is dropped
 * if it does not belong to the authorized tenant.
 */
export function filterRecordsByRls<T extends { tenant?: { id?: string | null } | null; tenantId?: string | null }>(
  records: T[],
  scope?: DashboardAccessScope
): T[] {
  if (scope?.kind === 'tenant') {
    const targetId = scope.tenantId.trim()
    return records.filter((r) => {
      const recordTenant = r.tenant?.id ?? r.tenantId
      return recordTenant === targetId
    })
  }

  if (scope?.kind === 'platform') {
    return records
  }

  return []
}

/**
 * Validates that an operation on a specific tenant is authorized by the given scope.
 * Throws TenantAccessDeniedError if unauthorized.
 */
export function assertTenantAccess(
  recordTenantId: string | null | undefined,
  scope?: DashboardAccessScope
): void {
  if (scope?.kind === 'platform') return

  if (scope?.kind === 'tenant') {
    if (recordTenantId && recordTenantId === scope.tenantId) return
    throw new TenantAccessDeniedError('Cross-tenant access violation: Action not permitted on this record.', {
      requestedTenantId: recordTenantId ?? undefined,
      allowedTenantId: scope.tenantId,
    })
  }

  throw new TenantAccessDeniedError('Unauthenticated: Access scope required for tenant data access.')
}
