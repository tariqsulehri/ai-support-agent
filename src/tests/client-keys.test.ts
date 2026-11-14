import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mintClientApiKey,
  decryptClientApiKey,
  maskClientApiKey,
  CLIENT_API_KEY_PREFIX,
} from '../lib/security/client-keys'

describe('Encrypted Client API Key (Server-Only Decryption & Authentic Tenant ID)', () => {
  const tenantId = 'vital-steer-technologies'

  it('mints and successfully decrypts a valid client API key', () => {
    const key = mintClientApiKey(tenantId)
    assert.ok(key.startsWith(CLIENT_API_KEY_PREFIX), 'key must start with vack_live_ prefix')

    const raw = key.slice(CLIENT_API_KEY_PREFIX.length)
    const segments = raw.split('.')
    assert.equal(segments.length, 3, 'key must have iv.ciphertext.tag structure')

    const payload = decryptClientApiKey(key)
    assert.ok(payload, 'decrypted payload must not be null')
    assert.equal(payload.tid, tenantId, 'payload must match the minted tenant ID')
    assert.equal(payload.type, 'client_publishable')
    assert.ok(payload.kid, 'key ID must be generated')
    assert.ok(payload.iat <= Math.floor(Date.now() / 1000))
  })

  it('preserves custom key ID (kid) when provided', () => {
    const customKid = 'kid_custom_999'
    const key = mintClientApiKey(tenantId, customKid)
    const payload = decryptClientApiKey(key)
    assert.ok(payload)
    assert.equal(payload.kid, customKid)
    assert.equal(payload.tid, tenantId)
  })

  it('cryptographically rejects a key if ciphertext was modified / tampered (prevents tenant spoofing)', () => {
    const key = mintClientApiKey(tenantId)
    const raw = key.slice(CLIENT_API_KEY_PREFIX.length)
    const [iv, cipher, tag] = raw.split('.')

    // Attacker tries to mutate ciphertext to change tenantId
    const tamperedCipher = cipher.slice(0, -2) + (cipher.endsWith('a') ? 'b' : 'a')
    const tamperedKey = `${CLIENT_API_KEY_PREFIX}${iv}.${tamperedCipher}.${tag}`

    const result = decryptClientApiKey(tamperedKey)
    assert.equal(result, null, 'AEAD verification must fail on tampered ciphertext')
  })

  it('cryptographically rejects a key if authentication tag was tampered', () => {
    const key = mintClientApiKey(tenantId)
    const raw = key.slice(CLIENT_API_KEY_PREFIX.length)
    const [iv, cipher, tag] = raw.split('.')

    const tamperedTag = (tag.endsWith('a') ? 'b' : 'a') + tag.slice(1)
    const tamperedKey = `${CLIENT_API_KEY_PREFIX}${iv}.${cipher}.${tamperedTag}`

    const result = decryptClientApiKey(tamperedKey)
    assert.equal(result, null, 'AEAD verification must fail on tampered auth tag')
  })

  it('cryptographically rejects a key if IV was modified', () => {
    const key = mintClientApiKey(tenantId)
    const raw = key.slice(CLIENT_API_KEY_PREFIX.length)
    const [iv, cipher, tag] = raw.split('.')

    const tamperedIv = (iv.endsWith('a') ? 'b' : 'a') + iv.slice(1)
    const tamperedKey = `${CLIENT_API_KEY_PREFIX}${tamperedIv}.${cipher}.${tag}`

    const result = decryptClientApiKey(tamperedKey)
    assert.equal(result, null, 'AEAD verification must fail on tampered IV')
  })

  it('guarantees tenant isolation (key for Tenant A can never produce Tenant B)', () => {
    const keyA = mintClientApiKey('tenant-alpha')
    const keyB = mintClientApiKey('tenant-bravo')

    const payloadA = decryptClientApiKey(keyA)
    const payloadB = decryptClientApiKey(keyB)

    assert.ok(payloadA)
    assert.ok(payloadB)
    assert.equal(payloadA.tid, 'tenant-alpha')
    assert.equal(payloadB.tid, 'tenant-bravo')
    assert.notEqual(payloadA.tid, payloadB.tid)
  })

  it('safely returns null for missing, empty, or malformed keys without throwing', () => {
    assert.equal(decryptClientApiKey(undefined), null)
    assert.equal(decryptClientApiKey(null), null)
    assert.equal(decryptClientApiKey(''), null)
    assert.equal(decryptClientApiKey('not-a-client-key'), null)
    assert.equal(decryptClientApiKey('vack_live_badformat'), null)
    assert.equal(decryptClientApiKey('vack_live_part1.part2'), null)
    assert.equal(decryptClientApiKey('vack_live_part1.part2.part3.part4'), null)
  })

  it('correctly masks the client API key for UI presentation', () => {
    const key = mintClientApiKey(tenantId)
    const masked = maskClientApiKey(key)
    assert.ok(masked.startsWith(CLIENT_API_KEY_PREFIX))
    assert.ok(masked.includes('••••'))
    assert.notEqual(masked, key)
  })
})
