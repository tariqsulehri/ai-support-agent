import './setup'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { encryptSecret, decryptSecret, maskSecret } from '../lib/security/encryption'

describe('Encryption Utility (AES-256-GCM)', () => {
  it('encrypts and decrypts a plaintext secret successfully', () => {
    const secret = 'sk-proj-test-api-key-123456789'
    const encrypted = encryptSecret(secret)

    assert.ok(encrypted.ciphertext, 'should have ciphertext')
    assert.ok(encrypted.iv, 'should have iv')
    assert.ok(encrypted.authTag, 'should have authTag')
    assert.notEqual(encrypted.ciphertext, secret)

    const decrypted = decryptSecret(encrypted)
    assert.equal(decrypted, secret)
  })

  it('fails to decrypt if ciphertext was tampered with', () => {
    const secret = 'mongodb+srv://admin:pass@cluster.mongodb.net/prod'
    const encrypted = encryptSecret(secret)
    const tamperedCipher =
      encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.endsWith('a') ? 'b' : 'a')
    const tampered = { ...encrypted, ciphertext: tamperedCipher }

    assert.throws(() => {
      decryptSecret(tampered)
    })
  })

  it('correctly masks secrets showing only first 4 chars and last 4 chars', () => {
    const secret = 'sk-proj-supersecretkey123'
    const masked = maskSecret(secret)
    assert.ok(masked.startsWith('sk-p'))
    assert.ok(masked.includes('...'))
    assert.ok(masked.endsWith('y123'))
    assert.ok(!masked.includes('supersecretkey'))
  })

  it('masks short secrets with asterisks', () => {
    assert.equal(maskSecret('secret'), '********')
    assert.equal(maskSecret('12345678'), '********')
  })
})
