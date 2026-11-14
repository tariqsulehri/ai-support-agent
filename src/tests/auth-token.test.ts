import './setup'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionToken, verifySessionToken } from '../lib/auth/token'

describe('Auth Session Token Cryptography', () => {
  const adminInput = {
    userId: 'user-admin',
    email: 'admin@platform.local',
    name: 'Platform Admin',
    role: 'platform_admin' as const,
    tenantId: null,
  }

  const tenantInput = {
    userId: 'user-tenant-1',
    email: 'owner@vitalsteer.com',
    name: 'Tenant Owner',
    role: 'tenant_owner' as const,
    tenantId: 'vital-steer-technologies',
  }

  it('creates and verifies a valid signed platform admin token', async () => {
    const token = await createSessionToken(adminInput)
    assert.ok(token.includes('.'), 'token should have payload.signature format')

    const verified = await verifySessionToken(token)
    assert.ok(verified)
    assert.equal(verified.userId, adminInput.userId)
    assert.equal(verified.email, adminInput.email)
    assert.equal(verified.role, 'platform_admin')
    assert.equal(verified.tenantId, null)
    assert.ok(verified.exp > Math.floor(Date.now() / 1000))
  })

  it('stores and cryptographically verifies tenantId inside tenant session token', async () => {
    const token = await createSessionToken(tenantInput)
    assert.ok(token.includes('.'))

    const verified = await verifySessionToken(token)
    assert.ok(verified)
    assert.equal(verified.userId, tenantInput.userId)
    assert.equal(verified.email, tenantInput.email)
    assert.equal(verified.role, 'tenant_owner')
    // Cryptographic proof that tenantId is stored and verified inside the token
    assert.equal(verified.tenantId, 'vital-steer-technologies')
  })

  it('rejects a tenant role token if tenantId is missing or empty', async () => {
    const invalidTenantInput = {
      userId: 'user-hacker',
      email: 'hacker@test.local',
      name: 'Imposter',
      role: 'tenant_admin' as const,
      tenantId: null, // missing tenantId for a tenant role!
    }
    const token = await createSessionToken(invalidTenantInput)
    const verified = await verifySessionToken(token)

    // Token must be rejected because tenant users MUST have a valid tenantId inside token
    assert.equal(verified, null)
  })

  it('rejects a token with a tampered signature', async () => {
    const token = await createSessionToken(tenantInput)
    const [payload, sig] = token.split('.')
    const tamperedSig = sig.slice(0, -2) + (sig.endsWith('a') ? 'b' : 'a')
    const tampered = `${payload}.${tamperedSig}`

    const verified = await verifySessionToken(tampered)
    assert.equal(verified, null)
  })

  it('rejects a token with a tampered tenantId in payload', async () => {
    const token = await createSessionToken(tenantInput)
    const [, sig] = token.split('.')
    // Attacker tries to alter tenantId in the base64 payload without knowing the secret
    const fakePayload = Buffer.from(
      JSON.stringify({ ...tenantInput, tenantId: 'victim-corp', exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url')
    const tampered = `${fakePayload}.${sig}`

    const verified = await verifySessionToken(tampered)
    assert.equal(verified, null)
  })

  it('returns null for undefined or empty tokens', async () => {
    assert.equal(await verifySessionToken(undefined), null)
    assert.equal(await verifySessionToken(''), null)
    assert.equal(await verifySessionToken('random-garbage'), null)
  })
})
