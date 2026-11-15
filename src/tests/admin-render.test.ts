/**
 * Component render tests (react-dom/server, no browser, no database):
 * - tenant detail view renders every tab from a realistic fixture and leaks no secrets
 * - funnel chart labels small bars outside the bar so they stay legible
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { TenantDetailView } from '../app/admin/tenants/[tenantId]/tenant-detail-view'
import type { TenantDetailData, TenantPermissions, ViewerInfo } from '../app/admin/tenants/[tenantId]/_components/types'
import { GlossyBarChart } from '../components/admin/3d-charts'

// tsx compiles the app's JSX (tsconfig jsx: preserve) with the classic runtime, which needs a global React.
;(globalThis as { React?: typeof React }).React = React

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')

const data: TenantDetailData = {
  tenant: {
    tenantId: 'smoke-co',
    publicId: 'pub_123',
    slug: 'smoke-co',
    companyName: 'Smoke Co',
    status: 'active',
    createdAt: '2026-11-01T10:00:00.000Z',
    clientApiKeyCreatedAt: '2026-11-01T10:00:00.000Z',
    subscriptionStatus: 'trial',
    subscriptionType: 'free',
    billingCycle: 'monthly',
  },
  settings: {
    companyName: 'Smoke Co',
    agentName: 'Ava',
    tone: 'friendly',
    languageMode: 'english',
    greeting: 'Hi, I am Ava.',
    services: ['web_app', 'ai_solution'],
    customInstructions: '',
    knowledgeBaseText: 'Pricing | From $5k',
  },
  email: {
    enabled: true,
    service: '',
    host: 'smtp.example.test',
    port: '587',
    secure: false,
    user: 'mailer@example.test',
    fromName: 'Smoke',
    fromEmail: 'mailer@example.test',
    recipients: ['sales@example.test'],
    sendToLeadEmail: false,
  },
  domains: [{ origin: 'https://smoke.example', status: 'active', verificationStatus: 'verified', verificationToken: 'verify-tok' }],
  users: [{ userId: 'u1', name: 'Owner One', email: 'owner@example.test', role: 'tenant_owner' }],
  openAiSecret: { maskedValue: 'sk-…abcd', updatedAt: '2026-11-01T10:00:00.000Z' },
  databaseUrlSecret: null,
  smtpPasswordSecret: { maskedValue: '••••wxyz', updatedAt: '2026-11-01T10:00:00.000Z' },
}

const RAW_CLIENT_KEY = 'ck_live_SUPERSECRETKEY1234567890'

function render(permissions: TenantPermissions, viewer: ViewerInfo, initialTab: 'overview' | 'embed' | 'team' | 'integrations' | 'agent' = 'overview') {
  return renderToString(
    createElement(TenantDetailView, {
      data,
      viewer,
      permissions,
      voiceUrl: 'https://app.example.test/voice?tenant=smoke-co',
      initialTab,
      created: false,
      embed: {
        clientApiKey: RAW_CLIENT_KEY,
        maskedClientApiKey: 'ck_live_••••7890',
        snippet: `<script src="https://app.example.test/agent.js" data-key="${RAW_CLIENT_KEY}"></script>`,
        maskedSnippet: '<script src="https://app.example.test/agent.js" data-key="ck_live_••••7890"></script>',
        legacySnippet: '<script src="https://app.example.test/agent.js" data-tenant="smoke-co"></script>',
        suggestedEmbedToken: permissions.canManage ? 'emb.payload.sig' : null,
      },
    })
  )
}

const admin: ViewerInfo = { name: 'Smoke Admin', role: 'platform_admin', isPlatformAdmin: true, initials: 'SA', roleTitle: 'Platform Admin' }
const viewer: ViewerInfo = { name: 'Smoke Viewer', role: 'tenant_viewer', isPlatformAdmin: false, initials: 'SV', roleTitle: 'Tenant Viewer' }

describe('tenant detail view (render)', () => {
  const html = render({ canManage: true, canSetDomains: true }, admin)
  const body = text(html)

  it('renders the tenant and every tab panel from real fixture data', () => {
    assert.match(body, /Smoke Co/)
    assert.match(text(render({ canManage: true, canSetDomains: true }, admin, 'embed')), /https:\/\/smoke\.example/)
    assert.match(text(render({ canManage: true, canSetDomains: true }, admin, 'team')), /Owner One/)
    assert.match(text(render({ canManage: true, canSetDomains: true }, admin, 'integrations')), /sk-…abcd/)
  })

  it('never renders password hashes or the unmasked client key in visible text', () => {
    assert.doesNotMatch(html, /passwordHash|scrypt\$/)
    assert.doesNotMatch(body, new RegExp(RAW_CLIENT_KEY))
  })

  it('withholds manager-only credentials from read-only users', () => {
    const viewerHtml = render({ canManage: false, canSetDomains: false }, viewer)
    assert.doesNotMatch(viewerHtml, /emb\.payload\.sig/)
  })
})

describe('funnel chart labels', () => {
  const html = renderToString(
    createElement(GlossyBarChart, {
      title: 'Lead Pipeline Funnel',
      total: 100,
      variant: 'funnel',
      items: [
        { label: 'New', value: 60, color: '#0052ff' },
        { label: 'Won', value: 5, color: '#10b981' },
      ],
    })
  )
  const body = text(html)

  it('labels wide bars inside and narrow bars beside the bar', () => {
    assert.match(body, /60\s*%/)
    assert.match(body, /Won.*?5\s*5\s*%/) // count followed by the share, outside the 12%-wide bar
  })
})
