import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/config/env'

interface EmbedTenant {
  id: string
  token: string
  allowedParents?: string[]
}

interface TenantParseResult {
  byId: Map<string, EmbedTenant>
  parseError: string | null
}

let _cached: TenantParseResult | null = null

function parseTenants(): TenantParseResult {
  if (_cached) return _cached

  const raw = env.EMBED_TENANTS?.trim()
  if (!raw) {
    _cached = { byId: new Map(), parseError: null }
    return _cached
  }

  try {
    const parsed = JSON.parse(raw) as EmbedTenant[]
    if (!Array.isArray(parsed)) {
      _cached = { byId: new Map(), parseError: 'EMBED_TENANTS must be a JSON array' }
      return _cached
    }

    const byId = new Map<string, EmbedTenant>()
    for (const item of parsed) {
      if (!item?.id || !item?.token) {
        _cached = { byId: new Map(), parseError: 'Each tenant requires id and token' }
        return _cached
      }
      byId.set(item.id, item)
    }

    _cached = { byId, parseError: null }
    return _cached
  } catch {
    _cached = { byId: new Map(), parseError: 'EMBED_TENANTS is not valid JSON' }
    return _cached
  }
}

export function isEmbedAuthEnabled(): boolean {
  return env.EMBED_AUTH_ENABLED === 'true'
}

export function validateEmbedQuery(
  tenantId: string | undefined,
  token: string | undefined
): { ok: boolean; reason?: string } {
  if (!isEmbedAuthEnabled()) return { ok: true }

  const { byId, parseError } = parseTenants()
  if (parseError) return { ok: false, reason: parseError }

  if (!tenantId || !token) return { ok: false, reason: 'Missing tenant credentials' }

  const tenant = byId.get(tenantId)
  if (!tenant) return { ok: false, reason: 'Unknown tenant' }
  if (tenant.token !== token) return { ok: false, reason: 'Invalid tenant token' }

  return { ok: true }
}

function getHeader(req: NextRequest, name: string): string | undefined {
  return req.headers.get(name)?.trim() || undefined
}

function parseOrigin(urlString: string | undefined): string | null {
  if (!urlString) return null
  try {
    return new URL(urlString).origin
  } catch {
    return null
  }
}

export function requireEmbedApiAuth(req: NextRequest): NextResponse | null {
  if (!isEmbedAuthEnabled()) return null

  const { byId, parseError } = parseTenants()
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 500 })
  }

  const tenantId = getHeader(req, 'x-embed-tenant')
  const token = getHeader(req, 'x-embed-token')
  const parentUrl = getHeader(req, 'x-embed-parent')

  if (!tenantId || !token) {
    return NextResponse.json({ error: 'Missing embed auth headers' }, { status: 401 })
  }

  const tenant = byId.get(tenantId)
  if (!tenant || tenant.token !== token) {
    return NextResponse.json({ error: 'Invalid embed credentials' }, { status: 401 })
  }

  if (tenant.allowedParents && tenant.allowedParents.length > 0) {
    const parentOrigin = parseOrigin(parentUrl)
    if (!parentOrigin) {
      return NextResponse.json({ error: 'Missing or invalid parent origin' }, { status: 403 })
    }

    const allowSet = new Set(tenant.allowedParents.map((origin) => origin.trim()))
    if (!allowSet.has(parentOrigin)) {
      return NextResponse.json({ error: 'Parent origin is not allowed' }, { status: 403 })
    }
  }

  return null
}
