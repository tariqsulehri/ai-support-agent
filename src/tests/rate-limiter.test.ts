import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from '../lib/auth/rate-limiter'

describe('Admin Login Sliding Window Rate Limiter', () => {
  const testIp = '192.168.1.100'
  const testEmail = 'attacker@test.local'

  beforeEach(() => {
    resetLoginRateLimit(testIp, testEmail)
  })

  it('allows initial login attempts', () => {
    const status = checkLoginRateLimit(testIp, testEmail)
    assert.equal(status.allowed, true)
    assert.equal(status.remaining, 5)
  })

  it('decrements remaining attempts on failures', () => {
    recordFailedLogin(testIp, testEmail)
    recordFailedLogin(testIp, testEmail)

    const status = checkLoginRateLimit(testIp, testEmail)
    assert.equal(status.allowed, true)
    assert.equal(status.remaining, 3)
  })

  it('locks out after 5 consecutive failures', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testIp, testEmail)
    }

    const status = checkLoginRateLimit(testIp, testEmail)
    assert.equal(status.allowed, false)
    assert.equal(status.remaining, 0)
    assert.ok(status.retryAfterSeconds && status.retryAfterSeconds > 0)
  })

  it('resets attempts on successful login', () => {
    recordFailedLogin(testIp, testEmail)
    recordFailedLogin(testIp, testEmail)

    resetLoginRateLimit(testIp, testEmail)

    const status = checkLoginRateLimit(testIp, testEmail)
    assert.equal(status.allowed, true)
    assert.equal(status.remaining, 5)
  })
})
