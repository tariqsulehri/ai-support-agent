import './setup'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSignedEmbedToken, verifySignedEmbedToken } from '../lib/security/embed-tokens'

describe('Signed Embed Tokens (Tenant ID In Token)', () => {
  const tenantId = 'vital-steer-technologies'

  it('creates and verifies a valid signed embed token with embedded tenantId', () => {
    const token = createSignedEmbedToken(tenantId)
    assert.ok(token.startsWith('emb.'), 'token should start with emb. prefix')

    const verified = verifySignedEmbedToken(token)
    assert.ok(verified, 'token should verify successfully')
    assert.equal(verified.tenantId, tenantId)
    assert.ok(verified.nonce)
    assert.ok(verified.createdAt > 0)
  })

  it('rejects a token with a tampered signature', () => {
    const token = createSignedEmbedToken(tenantId)
    const parts = token.slice(4).split('.')
    const tamperedSig = parts[1].slice(0, -2) + (parts[1].endsWith('a') ? 'b' : 'a')
    const tampered = `emb.${parts[0]}.${tamperedSig}`

    assert.equal(verifySignedEmbedToken(tampered), null)
  })

  it('rejects a token when payload is tampered to another tenantId', () => {
    const token = createSignedEmbedToken(tenantId)
    const [, sig] = token.slice(4).split('.')
    // Attacker alters tenantId in payload
    const fakePayload = Buffer.from(
      JSON.stringify({ tenantId: 'hacked-tenant', nonce: '1234', createdAt: Date.now() })
    ).toString('base64url')
    const tampered = `emb.${fakePayload}.${sig}`

    assert.equal(verifySignedEmbedToken(tampered), null)
  })

  it('returns null for undefined, empty, or malformed tokens', () => {
    assert.equal(verifySignedEmbedToken(undefined), null)
    assert.equal(verifySignedEmbedToken(''), null)
    assert.equal(verifySignedEmbedToken('not_an_emb_token'), null)
    assert.equal(verifySignedEmbedToken('emb.missing_signature'), null)
  })
})
