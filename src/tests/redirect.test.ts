import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { safeRelativePath, resolveRedirectUrl } from '../lib/auth/redirect'

describe('safeRelativePath', () => {
  it('accepts safe relative paths', () => {
    assert.equal(safeRelativePath('/admin/tenants', '/dashboard'), '/admin/tenants')
    assert.equal(safeRelativePath('/dashboard?tab=ai', '/dashboard'), '/dashboard?tab=ai')
  })

  it('rejects open redirects and malicious paths', () => {
    assert.equal(safeRelativePath('https://evil.com', '/fallback'), '/fallback')
    assert.equal(safeRelativePath('//evil.com', '/fallback'), '/fallback')
    assert.equal(safeRelativePath('/\\evil.com', '/fallback'), '/fallback')
    assert.equal(safeRelativePath('javascript:alert(1)', '/fallback'), '/fallback')
    assert.equal(safeRelativePath(null, '/fallback'), '/fallback')
  })
})

describe('resolveRedirectUrl', () => {
  it('uses Host header from the incoming request (e.g. remote VM port)', () => {
    const req = new NextRequest('http://0.0.0.0:3000/api/admin/auth/login', {
      headers: { host: '161.97.110.121:3060' },
    })
    const url = resolveRedirectUrl('/admin/tenants', req)
    assert.equal(url.href, 'http://161.97.110.121:3060/admin/tenants')
  })

  it('prefers X-Forwarded-Host and X-Forwarded-Proto if present', () => {
    const req = new NextRequest('http://0.0.0.0:3000/api/admin/auth/login', {
      headers: {
        host: 'internal-cluster',
        'x-forwarded-host': 'app.example.com',
        'x-forwarded-proto': 'https',
      },
    })
    const url = resolveRedirectUrl('/admin/tenants', req)
    assert.equal(url.href, 'https://app.example.com/admin/tenants')
  })

  it('sanitizes 0.0.0.0 to localhost to prevent Chromium/macOS ERR_CONNECTION_REFUSED', () => {
    const req = new NextRequest('http://0.0.0.0:3000/api/admin/auth/login', {
      headers: { host: '0.0.0.0:3000' },
    })
    const url = resolveRedirectUrl('/admin/login?error=invalid', req)
    assert.equal(url.href, 'http://localhost:3000/admin/login?error=invalid')
  })
})
