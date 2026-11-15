import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildFilterQuery, hasActiveFilters, normalizeFilters, resolveSort, sortSpec } from '../lib/dashboard/query'
import { buildRecommendations, buildRiskSignals, conversionReadiness } from '../lib/dashboard/insights'
import type { DashboardSignalCounts } from '../lib/dashboard/types'

describe('dashboard query builder', () => {
  it('always scopes tenant users to their tenant, even if a filter tries to override it', () => {
    const q = buildFilterQuery({ status: 'new' }, { kind: 'tenant', tenantId: 'acme' })
    assert.equal(q['tenant.id'], 'acme')
    assert.equal(q.status, 'new')
  })

  it('denies access without a scope', () => {
    const q = buildFilterQuery({}, undefined)
    assert.match(String(q['tenant.id']), /DENIED/)
  })

  it('drops unknown enum values instead of passing them to MongoDB', () => {
    const q = buildFilterQuery({ status: '{"$ne":null}', quality: 'bogus', urgency: 'high' }, { kind: 'platform' })
    assert.equal(q.status, undefined)
    assert.equal(q['classification.leadQuality'], undefined)
    assert.equal(q['requirement.urgency'], 'high')
  })

  it('escapes regex metacharacters and caps search length', () => {
    const q = buildFilterQuery({ q: 'a.b*(c)' + 'x'.repeat(500) }, { kind: 'platform' })
    const pattern = q.$or[0]['lead.name'].$regex as string
    assert.ok(pattern.startsWith('a\\.b\\*\\(c\\)'))
    assert.ok(pattern.length < 130)
  })

  it('uses a single indexable updatedAt predicate for date ranges', () => {
    const q = buildFilterQuery({ range: '7' }, { kind: 'platform' })
    assert.ok(q.updatedAt.$gte instanceof Date)
    assert.equal(q.$or, undefined)
  })

  it('clamps pagination', () => {
    const f = normalizeFilters({ page: '-3', limit: '10000' })
    assert.equal(f.page, 1)
    assert.equal(f.limit, 100)
  })

  it('maps legacy sort keys and keeps sorts stable with _id', () => {
    assert.equal(resolveSort('score'), 'maturity_desc')
    assert.equal(resolveSort('nonsense'), 'recent')
    assert.equal(Object.keys(sortSpec('recent')).at(-1), '_id')
  })

  it('detects active filters', () => {
    assert.equal(hasActiveFilters({ range: 'all' }), false)
    assert.equal(hasActiveFilters({ range: '30' }), true)
  })
})

describe('dashboard insights', () => {
  const base: DashboardSignalCounts = {
    filteredCalls: 100,
    callsWithLead: 90,
    hotLeads: 10,
    hotOpen: 0,
    highUrgencyOpen: 0,
    qualifiedPipeline: 20,
    emailSent: 90,
    emailFailures: 0,
    negativeSentiment: 0,
    complaints: 0,
    staleNew: 0,
    averageMessages: 8,
  }

  it('reports a healthy state without inventing actions', () => {
    assert.equal(buildRecommendations(base).length, 1)
    assert.match(buildRiskSignals(base)[0], /No risk signals/)
  })

  it('derives recommendations from aggregate counts', () => {
    const recs = buildRecommendations({ ...base, hotOpen: 3, callsWithLead: 40, emailFailures: 1 })
    assert.ok(recs.some((r) => r.includes('3 hot leads')))
    assert.ok(recs.some((r) => r.includes('40%')))
    assert.ok(recs.some((r) => r.includes('1 summary email failed')))
  })

  it('computes a bounded readiness score', () => {
    assert.equal(conversionReadiness({ filteredCalls: 0, hotLeads: 0, qualifiedPipeline: 0, callsWithLead: 0 }), 0)
    assert.equal(conversionReadiness({ filteredCalls: 1, hotLeads: 5, qualifiedPipeline: 5, callsWithLead: 5 }), 100)
  })
})
