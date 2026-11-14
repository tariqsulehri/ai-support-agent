import './setup'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionToken, verifySessionToken } from '../lib/auth/token'

describe('Auth Session Token Cryptography', () => {
  const sessionInput = {
    userId: 'user-12345',
    email: 'admin@platform.local',
    name: 'Platform Admin',
    role: 'platform_admin' as const,
    tenantId: null,
  }

  it('creates and verifies a valid signed session token', async () => {
    const token = await createSessionToken(sessionInput)
    assert.ok(token.includes('.'), 'token should have payload.signature format')

    const verified = await verifySessionToken(token)
    assert.ok(verified)
    assert.equal(verified.userId, sessionInput.userId)
    assert.equal(verified.email, sessionInput.email)
    assert.equal(verified.role, 'platform_admin')
    assert.ok(verified.exp > Math.floor(Date.now() / 1000))
  })

  it('rejects a token with a tampered signature', async () => {
    const token = await createSessionToken(sessionInput)
    const [payload, sig] = token.split('.')
    const tamperedSig = sig.slice(0, -2) + (sig.endsWith('a') ? 'b' : 'a')
    const tampered = `${payload}.${tamperedSig}`

    const verified = await verifySessionToken(tampered)
    assert.equal(verified, null)
  })

  it('rejects a token with a tampered payload', async () => {
    const token = await createSessionToken(sessionInput)
    const [, sig] = token.split('.')
    const fakePayload = Buffer.from(
      JSON.stringify({ ...sessionInput, role: 'platform_admin', exp: Date.now() })
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
