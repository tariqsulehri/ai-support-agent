import './setup'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import {
  buildRlsQuery,
  scopedRecordQuery,
  filterRecordsByRls,
  assertTenantAccess,
  TenantAccessDeniedError,
} from '../lib/security/row-level-security'
import type { DashboardAccessScope } from '../lib/auth/types'

describe('Row-Level Security (RLS) & Multi-Tenant Data Isolation', () => {
  const tenantScopeA: DashboardAccessScope = { kind: 'tenant', tenantId: 'tenant-alpha' }
  const tenantScopeB: DashboardAccessScope = { kind: 'tenant', tenantId: 'tenant-beta' }
  const platformScope: DashboardAccessScope = { kind: 'platform' }

  describe('buildRlsQuery()', () => {
    it('strictly binds tenant.id to the authorized tenant in tenant scope', () => {
      const query = buildRlsQuery({ status: 'new' }, tenantScopeA)
      assert.equal(query.status, 'new')
      assert.equal(query['tenant.id'], 'tenant-alpha')
    })

    it('prevents tenant spoofing by overwriting any client-supplied tenant.id', () => {
      // Attacker tries to inject a different tenant ID into the query
      const spoofedFilter = { 'tenant.id': 'tenant-beta', status: 'won' }
      const query = buildRlsQuery(spoofedFilter, tenantScopeA)

      // RLS must forcefully overwrite it with tenant-alpha
      assert.equal(query['tenant.id'], 'tenant-alpha')
      assert.notEqual(query['tenant.id'], 'tenant-beta')
    })

    it('denies access by injecting unmatchable tenant ID when scope is missing', () => {
      const query = buildRlsQuery({ status: 'new' }, undefined)
      assert.equal(query['tenant.id'], '__RLS_UNAUTHENTICATED_DENIED__')
    })

    it('allows unbounded access across all tenants for platform admin', () => {
      const query = buildRlsQuery({ status: 'new' }, platformScope)
      assert.equal(query.status, 'new')
      assert.equal(query['tenant.id'], undefined)
    })

    it('allows platform admin to filter by a specific tenant when requested', () => {
      const query = buildRlsQuery({ status: 'new' }, platformScope, 'tenant-beta')
      assert.equal(query.status, 'new')
      assert.equal(query['tenant.id'], 'tenant-beta')
    })
  })

  describe('scopedRecordQuery()', () => {
    const validId = new ObjectId().toString()

    it('enforces tenant.id on single record lookup/mutation in tenant scope', () => {
      const query = scopedRecordQuery(validId, tenantScopeA)
      assert.ok(query._id instanceof ObjectId)
      assert.equal(query._id.toString(), validId)
      assert.equal(query['tenant.id'], 'tenant-alpha')
    })

    it('allows platform admin to query by _id without tenant filter', () => {
      const query = scopedRecordQuery(validId, platformScope)
      assert.ok(query._id instanceof ObjectId)
      assert.equal(query._id.toString(), validId)
      assert.equal(query['tenant.id'], undefined)
    })

    it('denies access if scope is missing or invalid', () => {
      const query = scopedRecordQuery(validId, undefined)
      assert.equal(query._id, null)
      assert.equal(query['tenant.id'], '__RLS_DENIED_NO_SCOPE__')
    })

    it('rejects invalid ObjectId strings safely', () => {
      const query = scopedRecordQuery('invalid-hex-id', tenantScopeA)
      assert.equal(query._id, null)
      assert.equal(query['tenant.id'], '__RLS_INVALID_OBJECT_ID__')
    })
  })

  describe('filterRecordsByRls() (In-Memory Defense-in-Depth)', () => {
    const sampleRecords = [
      { id: '1', tenant: { id: 'tenant-alpha' }, name: 'Lead 1' },
      { id: '2', tenant: { id: 'tenant-beta' }, name: 'Lead 2' },
      { id: '3', tenant: { id: 'tenant-alpha' }, name: 'Lead 3' },
      { id: '4', tenant: { id: 'tenant-gamma' }, name: 'Lead 4' },
    ]

    it('filters out records from any other tenant in tenant scope', () => {
      const filtered = filterRecordsByRls(sampleRecords, tenantScopeA)
      assert.equal(filtered.length, 2)
      assert.deepEqual(
        filtered.map((r) => r.id),
        ['1', '3']
      )
      assert.ok(filtered.every((r) => r.tenant.id === 'tenant-alpha'))
    })

    it('strictly isolates tenant A from tenant B data', () => {
      const alphaRecords = filterRecordsByRls(sampleRecords, tenantScopeA)
      const betaRecords = filterRecordsByRls(sampleRecords, tenantScopeB)

      assert.equal(alphaRecords.length, 2)
      assert.ok(alphaRecords.every((r) => r.tenant.id === 'tenant-alpha'))

      assert.equal(betaRecords.length, 1)
      assert.equal(betaRecords[0].tenant.id, 'tenant-beta')
      assert.equal(betaRecords[0].id, '2')
    })

    it('preserves all records for platform admin scope', () => {
      const filtered = filterRecordsByRls(sampleRecords, platformScope)
      assert.equal(filtered.length, 4)
    })

    it('returns empty array when scope is unauthenticated or missing', () => {
      const filtered = filterRecordsByRls(sampleRecords, undefined)
      assert.equal(filtered.length, 0)
    })
  })

  describe('assertTenantAccess()', () => {
    it('permits access when record tenant matches authorized tenant scope', () => {
      assert.doesNotThrow(() => {
        assertTenantAccess('tenant-alpha', tenantScopeA)
      })
    })

    it('throws TenantAccessDeniedError when accessing another tenant record', () => {
      assert.throws(
        () => {
          assertTenantAccess('tenant-beta', tenantScopeA)
        },
        (err) => err instanceof TenantAccessDeniedError
      )
    })

    it('permits platform admin access to any tenant record', () => {
      assert.doesNotThrow(() => {
        assertTenantAccess('tenant-beta', platformScope)
      })
      assert.doesNotThrow(() => {
        assertTenantAccess('tenant-alpha', platformScope)
      })
    })

    it('throws TenantAccessDeniedError when scope is undefined', () => {
      assert.throws(
        () => {
          assertTenantAccess('tenant-alpha', undefined)
        },
        (err) => err instanceof TenantAccessDeniedError
      )
    })
  })
})
