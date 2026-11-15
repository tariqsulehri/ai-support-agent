'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ManagedTenantDetail } from '@/lib/tenants/management'
import type { AuthSession } from '@/lib/auth/types'
import { StatusBadge } from '@/components/admin/status-badge'
import { AdminPanel as Panel } from '@/components/admin/panel'
import { Field, TextArea, CheckboxField } from '@/components/admin/form-fields'
import { formatLabel } from '@/lib/admin/forms'
import { SupportAgentLogo } from '@/components/brand/support-agent-logo'
import {
  saveSettingsAction,
  saveDomainsAction,
  verifyDomainAction,
  saveOpenAiKeyAction,
  saveDatabaseUrlAction,
  saveEmailNotificationsAction,
  saveEmbedTokenAction,
  renewClientApiKeyAction,
  createTenantUserAction,
} from './actions'

type TabKey = 'overview' | 'embed' | 'agent' | 'integrations' | 'team'

interface TenantDetailViewProps {
  detail: ManagedTenantDetail
  session: AuthSession
  baseUrl: string
  clientApiKey: string
  clientKeySnippet: string
  legacySnippet: string
  suggestedEmbedToken: string
  mutable: boolean
  canEditSecrets: boolean
  canSetDomains: boolean
  initialTab?: string
  errorParam?: string
  savedParam?: string
  createdParam?: string
}

const detailTabs: Array<{
  id: TabKey
  label: string
  num: number
  description: string
  badgeText: string
}> = [
  {
    id: 'overview',
    label: 'Overview & Readiness',
    num: 1,
    description: 'Checklist of deployment requirements, runtime status, and platform identity.',
    badgeText: 'Readiness Gate',
  },
  {
    id: 'embed',
    label: 'Embed & Client Key',
    num: 2,
    description: 'Encrypted client API keys, website embed script, and domain origin verification.',
    badgeText: 'Embed Security',
  },
  {
    id: 'agent',
    label: 'Agent Persona',
    num: 3,
    description: 'Assistant persona, opening greeting, voice tone, guardrails, and knowledge base.',
    badgeText: 'Agent Behavior',
  },
  {
    id: 'integrations',
    label: 'Integrations & Secrets',
    num: 4,
    description: 'Encrypted OpenAI key, dedicated tenant MongoDB cluster URI, and SMTP alerts.',
    badgeText: 'Cloud Connectors',
  },
  {
    id: 'team',
    label: 'Team Access',
    num: 5,
    description: 'Team members, assigned tenant administrator roles, and invite links.',
    badgeText: 'Identity & Access',
  },
]

function DetailTabIcon({ id, className = 'h-3.5 w-3.5' }: { id: TabKey; className?: string }) {
  if (id === 'overview') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75H4.25a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h4a.75.75 0 010 1.5h-4A2.25 2.25 0 012 15.75V4.25z" />
        <path d="M12.75 9a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75v-6z" />
      </svg>
    )
  }
  if (id === 'embed') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (id === 'agent') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
      </svg>
    )
  }
  if (id === 'integrations') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 4.163 1.225 1.225 0 01-.549 1.096A8.06 8.06 0 0114.5 16z" />
    </svg>
  )
}

export function TenantDetailView({
  detail,
  session,
  baseUrl,
  clientApiKey,
  clientKeySnippet,
  legacySnippet,
  suggestedEmbedToken,
  mutable,
  canEditSecrets,
  canSetDomains,
  initialTab = 'overview',
  errorParam,
  savedParam,
  createdParam,
}: TenantDetailViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab: TabKey = (['overview', 'embed', 'agent', 'integrations', 'team'].includes(initialTab)
    ? initialTab
    : 'overview') as TabKey

  const activeTabDef = detailTabs.find((t) => t.id === activeTab) || detailTabs[0]

  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [copiedTenantId, setCopiedTenantId] = useState(false)

  const tenant = detail.tenant
  const settings = detail.settings
  const emailConfig = settings.emailNotifications
  const verifiedDomains = detail.domains.filter((d) => d.verificationStatus === 'verified')
  const subscriptionStatus = tenant.subscription?.status ?? 'trial'
  const subscriptionReady = subscriptionStatus === 'trial' || subscriptionStatus === 'active'

  const setupRequirements = [
    {
      id: 'domain_added',
      label: 'Domain Assigned',
      description: detail.domains.length ? `${detail.domains.length} domain(s) configured` : 'Add an allowed website domain',
      complete: detail.domains.length > 0,
      tab: 'embed' as TabKey,
    },
    {
      id: 'domain_verified',
      label: 'Domain Ownership Verified',
      description: verifiedDomains.length ? `${verifiedDomains.length} domain(s) verified` : 'Verify domain via meta tag or well-known file',
      complete: verifiedDomains.length > 0,
      tab: 'embed' as TabKey,
    },
    {
      id: 'openai_key',
      label: 'OpenAI API Key',
      description: detail.openAiSecret ? `Stored (${detail.openAiSecret.maskedValue})` : 'Required to power voice & chat',
      complete: Boolean(detail.openAiSecret),
      tab: 'integrations' as TabKey,
    },
    {
      id: 'subscription',
      label: 'Subscription Plan',
      description: `Active on ${formatLabel(subscriptionStatus)}`,
      complete: subscriptionReady,
      tab: 'overview' as TabKey,
    },
    {
      id: 'lead_database',
      label: 'Lead Database (Optional)',
      description: detail.databaseUrlSecret ? `Connected to ${detail.databaseUrlSecret.maskedValue}` : 'Using platform database fallback',
      complete: true,
      tab: 'integrations' as TabKey,
    },
    {
      id: 'smtp_email',
      label: 'SMTP Notifications (Optional)',
      description: emailConfig?.enabled ? 'Lead email alerts active' : 'Not configured (optional)',
      complete: !emailConfig?.enabled || Boolean(detail.smtpPasswordSecret),
      tab: 'integrations' as TabKey,
    },
  ]

  const completedCount = setupRequirements.filter((r) => r.complete).length
  const completionPercent = Math.round((completedCount / setupRequirements.length) * 100)
  const embedReady = tenant.status === 'active' && subscriptionReady && Boolean(detail.openAiSecret) && verifiedDomains.length > 0

  const userInitials =
    session.name
      ?.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'TM'

  const roleTitle = session.role === 'platform_admin' ? 'ADMIN' : 'TENANT ADMIN'

  function switchTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    params.delete('saved')
    params.delete('error')
    router.replace(`?${params.toString()}`)
  }

  function handleCopy(text: string, type: 'key' | 'snippet' | 'id') {
    navigator.clipboard.writeText(text)
    if (type === 'key') {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    } else if (type === 'snippet') {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2000)
    } else {
      setCopiedTenantId(true)
      setTimeout(() => setCopiedTenantId(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased">
      {/* Top Application Navbar */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between select-none shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        {/* Left: Back Link & Support Agent Logo */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            title="Back to Dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          <Link href="/dashboard" className="flex items-center">
            <SupportAgentLogo variant="dark" />
          </Link>
        </div>

        {/* Right: Test Agent, Notifications, AI Icon & User Profile Badge */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Test Voice Agent Button */}
          <a
            href={`${baseUrl}/voice?tenant=${encodeURIComponent(tenant.tenantId)}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/60 px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:from-emerald-100 hover:to-emerald-200/70 transition shadow-[0_1px_3px_rgba(16,185,129,0.15)]"
            title="Launch interactive voice agent tester"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Test Voice Agent</span>
            <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.25 2A2.25 2.25 0 002 4.25v2.5a.75.75 0 001.5 0v-2.5a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-1.5 0v2.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M12.53 9.47a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H3.75a.75.75 0 010-1.5h6.44L8.47 8.53a.75.75 0 011.06-1.06l3 3z"
                clipRule="evenodd"
              />
            </svg>
          </a>

          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Notifications"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User profile pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0052ff] to-[#0038b8] text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,82,255,0.35)] ring-2 ring-white">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {session.name || 'Support Agent User'}
              </p>
              <p className="text-[10px] font-mono text-slate-500 tracking-wider">
                {roleTitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Body: Left Sidebar (CONSTANT & PERSISTENT) + Main Content */}
      <div className="flex-1 flex min-w-0">
        {/* Left Navigation Sidebar — CONSTANT EVERY TIME */}
        <aside className="w-64 flex flex-col justify-between border-r border-slate-200/80 bg-white/95 backdrop-blur-md shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.03)] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-4 z-30">
          <div className="space-y-6">
            <nav className="space-y-1.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75H4.25a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h4a.75.75 0 010 1.5h-4A2.25 2.25 0 012 15.75V4.25z" />
                  <path d="M12.75 9a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75v-6z" />
                </svg>
                <span>Live Overview</span>
              </Link>

              <Link
                href="/dashboard?tab=communications"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.74 3.37 1.97 4.6-.28 1.1-.94 2.12-1.87 2.87a.75.75 0 00.5 1.33c2.3 0 4.14-.9 5.23-1.92.7.08 1.43.12 2.17.12 4.418 0 8-3.134 8-7s-3.582-7-8-7z" clipRule="evenodd" />
                </svg>
                <span>Call Transcripts</span>
              </Link>

              <Link
                href="/dashboard?tab=leads"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>Lead Pipeline</span>
              </Link>

              <Link
                href="/dashboard?tab=ai"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
                </svg>
                <span>AI Intelligence</span>
              </Link>

              <Link
                href="/dashboard?tab=capabilities"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.72 9.72a.75.75 0 000 1.06l.25.25a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06L6.5 8.44l-.47-.47zm6.47-2.78a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Engine Capabilities</span>
              </Link>

              <a
                href={`${baseUrl}/voice?tenant=${encodeURIComponent(tenant.tenantId)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                    <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.58 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                  </svg>
                  <span>Test Voice Agent</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200/80 shadow-2xs">LIVE</span>
              </a>

              {session.role === 'platform_admin' && (
                <Link
                  href="/dashboard?tab=tenants"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition border border-transparent"
                >
                  <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Tenants Directory</span>
                </Link>
              )}

              {/* Setup / Configuration Section with Active State */}
              <div className="pt-2">
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#0052ff] bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(0,82,255,0.08)] select-none">
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 shrink-0 text-[#0052ff]" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Agent Setup</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0052ff]">Active</span>
                </div>

                {/* Sub-tree menu (matching Image 2) */}
                <div className="ml-4 pl-3 border-l-2 border-slate-200/80 mt-1.5 space-y-1 text-[11px] font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={() => switchTab('overview')}
                    className={`flex w-full items-center gap-2 py-1.5 px-2.5 rounded-lg text-left transition-all duration-150 ${
                      activeTab === 'overview'
                        ? 'bg-gradient-to-r from-blue-50/90 to-white text-[#0052ff] font-bold border border-blue-200/80 shadow-xs'
                        : 'hover:bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[#0052ff] font-bold">1</span>
                    <span>Readiness Checklist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('embed')}
                    className={`flex w-full items-center gap-2 py-1.5 px-2.5 rounded-lg text-left transition-all duration-150 ${
                      activeTab === 'embed'
                        ? 'bg-gradient-to-r from-blue-50/90 to-white text-[#0052ff] font-bold border border-blue-200/80 shadow-xs'
                        : 'hover:bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[#0052ff] font-bold">2</span>
                    <span>Embed & API Keys</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('agent')}
                    className={`flex w-full items-center gap-2 py-1.5 px-2.5 rounded-lg text-left transition-all duration-150 ${
                      activeTab === 'agent'
                        ? 'bg-gradient-to-r from-blue-50/90 to-white text-[#0052ff] font-bold border border-blue-200/80 shadow-xs'
                        : 'hover:bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[#0052ff] font-bold">3</span>
                    <span>Agent Persona</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('integrations')}
                    className={`flex w-full items-center gap-2 py-1.5 px-2.5 rounded-lg text-left transition-all duration-150 ${
                      activeTab === 'integrations'
                        ? 'bg-gradient-to-r from-blue-50/90 to-white text-[#0052ff] font-bold border border-blue-200/80 shadow-xs'
                        : 'hover:bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[#0052ff] font-bold">4</span>
                    <span>OpenAI & MongoDB</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('team')}
                    className={`flex w-full items-center gap-2 py-1.5 px-2.5 rounded-lg text-left transition-all duration-150 ${
                      activeTab === 'team'
                        ? 'bg-gradient-to-r from-blue-50/90 to-white text-[#0052ff] font-bold border border-blue-200/80 shadow-xs'
                        : 'hover:bg-slate-100/80 text-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[#0052ff] font-bold">5</span>
                    <span>Team Access</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>

          {/* Bottom user card in sidebar */}
          <div className="pt-4 border-t border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0052ff] to-[#0038b8] text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,82,255,0.35)] ring-2 ring-white">
                {userInitials}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session.name || 'Support Agent User'}
                </p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {tenant.tenantId} | {roleTitle}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 bg-[#f8fafc]/60 p-4 sm:p-6 lg:p-8 min-w-0 space-y-5 overflow-y-auto">
          {/* Notifications / Alerts */}
          {errorParam && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 shadow-xs">
              <svg className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-rose-900">Action Failed</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorParam}</p>
              </div>
            </div>
          )}

          {savedParam && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-medium text-emerald-800 shadow-xs">
              <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-emerald-900">Configuration Saved</p>
                <p className="mt-0.5 text-emerald-700">
                  {savedParam === 'client_key'
                    ? 'Client API key renewed and stored in database configuration.'
                    : `Successfully updated ${savedParam}.`}
                </p>
              </div>
            </div>
          )}

          {createdParam && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-xs">
              Tenant created successfully.
            </div>
          )}

          {/* Tenant Hero Header Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Soft rounded blue square icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-blue-100/60 text-[#0052ff] shadow-[0_2px_8px_rgba(0,82,255,0.12)]">
                  <DetailTabIcon id={activeTab} className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl font-sans">
                      {tenant.companyName}
                    </h1>
                    <span className="inline-flex items-center rounded-full border border-blue-200/90 bg-blue-50/90 px-3 py-0.5 text-[11px] font-bold text-[#0052ff] shadow-[0_1px_2px_rgba(0,82,255,0.1)]">
                      {activeTabDef.badgeText}
                    </span>
                    <StatusBadge status={tenant.status} />
                    <span className="inline-flex items-center rounded-full border border-indigo-200/90 bg-gradient-to-b from-indigo-50 to-indigo-100/70 px-3 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
                      {formatLabel(tenant.subscription?.type ?? 'free')} • {formatLabel(subscriptionStatus)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold shadow-2xs ${
                        embedReady
                          ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/70 text-emerald-800'
                          : 'border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100/70 text-amber-800'
                      }`}
                    >
                      {embedReady ? '● Embed Live' : '○ Setup in Progress'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {activeTabDef.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Top Header Card */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {activeTab === 'agent' && mutable && (
                  <button
                    form="agent-settings-form"
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                  >
                    <span>Save Agent Persona</span>
                    <span>✓</span>
                  </button>
                )}
                {activeTab === 'embed' && canSetDomains && (
                  <button
                    form="domains-form"
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                  >
                    <span>Save Allowed Domains</span>
                    <span>✓</span>
                  </button>
                )}
                {activeTab === 'integrations' && canEditSecrets && (
                  <button
                    form="openai-form"
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                  >
                    <span>Save API Keys</span>
                    <span>✓</span>
                  </button>
                )}
                {activeTab === 'team' && mutable && (
                  <button
                    form="team-user-form"
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                  >
                    <span>+ Add Team Member</span>
                  </button>
                )}

                <a
                  href={`${baseUrl}/voice?tenant=${encodeURIComponent(tenant.tenantId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h4a.75.75 0 010 1.5h-4z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                  </svg>
                  Preview Agent
                </a>

                {activeTab !== 'embed' && (
                  <button
                    type="button"
                    onClick={() => switchTab('embed')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 px-4 text-xs font-bold text-[#0052ff] shadow-xs transition"
                  >
                    Get Embed Code
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Stepped Numbered Pill Tabs Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-1">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Stepped tabs">
              {detailTabs.map((tab) => {
                const selected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                      selected
                        ? 'bg-gradient-to-r from-[#0052ff] to-[#0040d0] text-white shadow-[0_3px_10px_rgba(0,82,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] font-bold scale-[1.02]'
                        : 'bg-white border border-slate-200/80 text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Number badge */}
                    <span
                      className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-bold ${
                        selected
                          ? 'bg-white/20 text-white shadow-inner font-extrabold'
                          : 'bg-blue-50 text-[#0052ff] border border-blue-200/70'
                      }`}
                    >
                      {tab.num}
                    </span>

                    <DetailTabIcon id={tab.id} className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* TAB 1: OVERVIEW & READINESS */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Setup Readiness Hero Panel (No more wasted whitespace!) */}
              <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-slate-900">Tenant Setup Checklist</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Core requirements needed for live customer deployment.</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-[#0052ff] border border-blue-200/80 px-3 py-1 text-xs font-bold shadow-2xs">
                      {completedCount} of {setupRequirements.length} Ready ({completionPercent}%)
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className={`h-full transition-all duration-500 ${
                        completionPercent === 100 ? 'bg-emerald-500' : 'bg-[#0052ff]'
                      }`}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                {/* Checklist Items in a Clean, Balanced Grid */}
                <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                  {setupRequirements.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between bg-white p-5 transition hover:bg-slate-50/60"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            item.complete
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.complete ? '✓' : '!'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span
                          className={`text-[11px] font-semibold ${
                            item.complete ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {item.complete ? 'Configured' : 'Needs attention'}
                        </span>
                        <button
                          type="button"
                          onClick={() => switchTab(item.tab)}
                          className="text-xs font-semibold text-[#0052ff] hover:text-[#0043d9] transition"
                        >
                          Configure →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Summary Cards */}
              <div className="grid gap-5 md:grid-cols-2">
                <Panel title="Runtime Status & Platform State">
                  <dl className="space-y-3.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Lifecycle Status</dt>
                      <dd><StatusBadge status={tenant.status} /></dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Subscription Tier</dt>
                      <dd className="font-semibold text-slate-800">{formatLabel(tenant.subscription?.type ?? 'free')}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Billing Cycle</dt>
                      <dd className="text-slate-700 font-medium">{formatLabel(tenant.subscription?.billingCycle ?? 'monthly')}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Whitelisted Domains</dt>
                      <dd className="font-semibold text-slate-800">{detail.domains.length} total ({verifiedDomains.length} verified)</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500 font-medium">Lead Database</dt>
                      <dd className="font-semibold text-slate-800">{detail.databaseUrlSecret ? 'Dedicated MongoDB Atlas' : 'Platform Shared DB'}</dd>
                    </div>
                  </dl>

                  {session.role === 'platform_admin' && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <Link
                        href="/admin/tenants?tab=subscriptions"
                        className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                      >
                        Manage Subscriptions →
                      </Link>
                    </div>
                  )}
                </Panel>

                <Panel title="Tenant Identity & Security Keys">
                  <dl className="space-y-3.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Tenant Slug</dt>
                      <dd className="font-mono text-slate-800 font-semibold">{tenant.slug}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Public Identifier</dt>
                      <dd className="font-mono text-slate-800">{tenant.publicId}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Tenant ID (UUID)</dt>
                      <dd className="flex items-center gap-1.5 font-mono text-slate-800">
                        <span>{tenant.tenantId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tenant.tenantId, 'id')}
                          className="text-[#0052ff] hover:text-[#0043d9]"
                          title="Copy tenant ID"
                        >
                          {copiedTenantId ? 'Copied!' : 'Copy'}
                        </button>
                      </dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <dt className="text-slate-500 font-medium">Created At</dt>
                      <dd className="text-slate-700">{new Date(tenant.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500 font-medium">Assigned Admins</dt>
                      <dd className="font-semibold text-slate-800">{detail.users.length} active user(s)</dd>
                    </div>
                  </dl>
                </Panel>
              </div>
            </div>
          )}

          {/* TAB 2: EMBED & CLIENT API KEY */}
          {activeTab === 'embed' && (
            <div className="space-y-5">
              {/* Encrypted Client API Key Card */}
              <Panel
                title="Client API Key (Database Configuration)"
                subtitle="Tamper-proof key sealed with AES-256-GCM. The tenant ID is cryptographically bound and stored in database configuration."
                badge={
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                    Active
                  </span>
                }
                actions={
                  <button
                    type="button"
                    onClick={() => handleCopy(clientApiKey, 'key')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                  >
                    <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12a1.5 1.5 0 01.439 1.061V16.5A1.5 1.5 0 0115.5 18h-7A1.5 1.5 0 017 16.5v-13z" />
                    </svg>
                    {copiedKey ? 'Copied Key!' : 'Copy Key'}
                  </button>
                }
              >
                <div className="space-y-3">
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-[#121417] p-3.5 font-mono text-xs text-emerald-400 select-all leading-relaxed">
                      {clientApiKey}
                    </pre>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span>
                        {tenant.clientApiKeyCreatedAt
                          ? `Stored in DB • Renewed ${new Date(tenant.clientApiKeyCreatedAt).toLocaleString()}`
                          : 'Stored in tenant database configuration'}
                      </span>
                    </div>

                    {mutable && (
                      <form action={renewClientApiKeyAction}>
                        <input type="hidden" name="tenantId" value={tenant.tenantId} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-3 text-xs font-semibold text-white shadow-xs transition"
                        >
                          <svg className="h-3 w-3 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.148l.424.424a7 7 0 0011.89-3.23.75.75 0 00-1.502-.483zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.482a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.148l-.424-.424A7 7 0 003.186 7.643a.75.75 0 001.502.483z" clipRule="evenodd" />
                          </svg>
                          Renew Client API Key
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Panel>

              {/* HTML Embed Snippet Card */}
              <Panel
                title="Recommended HTML Embed Snippet"
                subtitle="Paste this script tag into the HTML head or before closing body tag of your website."
                actions={
                  <button
                    type="button"
                    onClick={() => handleCopy(clientKeySnippet, 'snippet')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-3 text-xs font-semibold text-white shadow-xs transition"
                  >
                    <svg className="h-3.5 w-3.5 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12a1.5 1.5 0 01.439 1.061V16.5A1.5 1.5 0 0115.5 18h-7A1.5 1.5 0 017 16.5v-13z" />
                    </svg>
                    {copiedSnippet ? 'Copied HTML!' : 'Copy Snippet'}
                  </button>
                }
              >
                <div className="space-y-3">
                  <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-[#121417] p-4 font-mono text-xs text-blue-200 select-all leading-relaxed">
                    {clientKeySnippet}
                  </pre>

                  <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                    <p className="font-bold text-slate-900">Deployment Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Paste the snippet above onto any page where you want the AI voice button to appear.</li>
                      <li>Ensure the embedding website origin is listed in the Allowed Domains section below.</li>
                    </ol>
                  </div>

                  <details className="group rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                    <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900 transition flex items-center justify-between">
                      <span>Legacy snippet (without client-api-key)</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="text-slate-500">
                        If you are using origin-only verification without client keys, use this legacy script tag:
                      </p>
                      <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700 select-all">
                        {legacySnippet}
                      </pre>
                    </div>
                  </details>
                </div>
              </Panel>

              {/* Allowed Domains & Verification */}
              <Panel
                title="Allowed Origins & Domain Ownership Verification"
                subtitle="Requests are rejected with 403 Forbidden unless initiated from one of these verified origins."
                actions={
                  canSetDomains && (
                    <button
                      form="domains-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>Save Allowed Domains</span>
                      <span>✓</span>
                    </button>
                  )
                }
              >
                {canSetDomains ? (
                  <form id="domains-form" action={saveDomainsAction} className="space-y-4">
                    <input type="hidden" name="tenantId" value={tenant.tenantId} />
                    <TextArea
                      label="Whitelisted Origins (One per line)"
                      name="domains"
                      rows={4}
                      defaultValue={detail.domains.map((d) => d.origin).join('\n')}
                      placeholder="https://example.com&#10;https://app.example.com"
                    />
                    <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-4 text-xs font-semibold text-white shadow-xs transition">
                      Save Domains
                    </button>
                  </form>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    Allowed domains are configured by platform administrators.
                  </p>
                )}

                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Domain Status</h3>
                  {detail.domains.length === 0 ? (
                    <p className="text-xs text-slate-400">No domains assigned yet.</p>
                  ) : (
                    detail.domains.map((domain) => {
                      const token = domain.verificationToken ?? 'Token pending'
                      const isVerified = (domain.verificationStatus ?? 'pending') === 'verified'
                      return (
                        <div key={domain.origin} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs font-semibold text-slate-900">{domain.origin}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <StatusBadge status={domain.verificationStatus ?? 'pending'} />
                                <StatusBadge status={domain.status} />
                              </div>
                            </div>

                            {canEditSecrets && !isVerified && (
                              <form action={verifyDomainAction} className="flex items-center gap-2">
                                <input type="hidden" name="tenantId" value={tenant.tenantId} />
                                <input type="hidden" name="origin" value={domain.origin} />
                                <select name="method" className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs">
                                  <option value="well-known">/.well-known file</option>
                                  <option value="meta-tag">HTML meta tag</option>
                                </select>
                                <button className="h-8 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-3 text-xs font-semibold text-white transition">
                                  Verify Domain
                                </button>
                              </form>
                            )}
                          </div>

                          {!isVerified && (
                            <div className="rounded-lg bg-white p-3 border border-slate-200/80 space-y-2 text-xs text-slate-600">
                              <p className="font-semibold text-slate-800">Verification Token:</p>
                              <pre className="overflow-x-auto rounded-md bg-slate-100 p-2 font-mono text-[11px] text-slate-800 select-all">{token}</pre>
                              <p className="text-[11px] text-slate-500">
                                Option A: Upload token to <span className="font-mono text-slate-700">/.well-known/voice-agent-verification.txt</span><br />
                                Option B: Add <span className="font-mono text-slate-700">{`<meta name="voice-agent-verification" content="${token}">`}</span> to homepage head.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </Panel>

              {/* Legacy Fallback Token */}
              {mutable && (
                <Panel
                  title="Legacy Embed Token (Optional)"
                  subtitle="Used only if you choose legacy domain session tokens instead of client-api-key."
                >
                  <form action={saveEmbedTokenAction} className="space-y-4">
                    <input type="hidden" name="tenantId" value={tenant.tenantId} />
                    <Field label="Embed Token" name="embedToken" defaultValue={suggestedEmbedToken} required autoComplete="off" />
                    <button className="h-9 rounded-lg bg-slate-800 hover:bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs transition">
                      Save Legacy Token
                    </button>
                  </form>
                </Panel>
              )}
            </div>
          )}

          {/* TAB 3: AGENT PERSONA */}
          {activeTab === 'agent' && (
            <div className="space-y-5">
              <Panel
                title="Voice Agent Persona & Behavior Settings"
                subtitle="Define the persona, tone, language, opening greeting, and knowledge base for your AI support agent."
                actions={
                  mutable && (
                    <button
                      form="agent-settings-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>Save Agent Profile</span>
                      <span>✓</span>
                    </button>
                  )
                }
              >
                <form id="agent-settings-form" action={saveSettingsAction} className="space-y-5">
                  <input type="hidden" name="tenantId" value={tenant.tenantId} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company / Brand Name" name="companyName" defaultValue={settings.companyName} required />
                    <Field label="Assistant Name" name="agentName" defaultValue={settings.agentName} required />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tone & Persona" name="tone" defaultValue={settings.tone} required />
                    <Field label="Language Mode" name="languageMode" defaultValue={settings.languageMode ?? 'english'} />
                  </div>

                  <TextArea
                    label="Opening Greeting (First spoken message)"
                    name="greeting"
                    rows={2}
                    defaultValue={settings.greeting ?? ''}
                    placeholder="Hello! How can I assist you today?"
                  />

                  <TextArea
                    label="Services Offered (One per line)"
                    name="services"
                    rows={4}
                    defaultValue={settings.services.join('\n')}
                    placeholder="Consulting&#10;Product Support&#10;Billing Inquiries"
                  />

                  <TextArea
                    label="System Instructions & Guardrails"
                    name="customInstructions"
                    rows={5}
                    defaultValue={settings.customInstructions ?? ''}
                    placeholder="You are a professional assistant for... Prefer concise, friendly answers."
                  />

                  <TextArea
                    label="Knowledge Base (Topic | Content)"
                    name="knowledgeBase"
                    rows={6}
                    defaultValue={settings.knowledgeBase?.map((kb) => `${kb.topic} | ${kb.content}`).join('\n') ?? ''}
                    placeholder="Pricing | Plans start from $49/mo&#10;Hours | Mon-Fri 9am-6pm EST"
                  />

                  {mutable && (
                    <div className="pt-2">
                      <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-5 text-xs font-semibold text-white shadow-xs transition">
                        Save Agent Profile
                      </button>
                    </div>
                  )}
                </form>
              </Panel>
            </div>
          )}

          {/* TAB 4: INTEGRATIONS & SECRETS */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              {/* OpenAI API Key */}
              <Panel
                title="OpenAI API Key"
                subtitle="Encrypted with server master key. Used to power agent conversations and transcription."
                actions={
                  canEditSecrets && (
                    <button
                      form="openai-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>Save OpenAI Key</span>
                      <span>✓</span>
                    </button>
                  )
                }
              >
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Current Key Status</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
                        {detail.openAiSecret ? detail.openAiSecret.maskedValue : 'Not configured'}
                      </p>
                    </div>
                    {detail.openAiSecret ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">Configured</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold">Missing</span>
                    )}
                  </div>

                  {canEditSecrets ? (
                    <form id="openai-form" action={saveOpenAiKeyAction} className="space-y-3">
                      <input type="hidden" name="tenantId" value={tenant.tenantId} />
                      <Field label="Replace OpenAI Key" name="openaiApiKey" type="password" required autoComplete="off" placeholder="sk-..." />
                      <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-4 text-xs font-semibold text-white shadow-xs transition">
                        Save OpenAI Key
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-400">Tenant Owner or Admin role required to modify keys.</p>
                  )}
                </div>
              </Panel>

              {/* Dedicated MongoDB Lead Database */}
              <Panel
                title="Dedicated Lead Database URL"
                subtitle="Store transcripts, leads, and recordings into this tenant's dedicated MongoDB cluster."
                actions={
                  canEditSecrets && (
                    <button
                      form="database-url-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>Save Database URL</span>
                      <span>✓</span>
                    </button>
                  )
                }
              >
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
                    <p className="text-xs font-medium text-slate-500">Configured Connection String</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-slate-900">
                      {detail.databaseUrlSecret ? detail.databaseUrlSecret.maskedValue : 'None (Using platform database fallback)'}
                    </p>
                  </div>

                  {canEditSecrets ? (
                    <form id="database-url-form" action={saveDatabaseUrlAction} className="space-y-3">
                      <input type="hidden" name="tenantId" value={tenant.tenantId} />
                      <Field label="MongoDB Connection URI" name="databaseUrl" type="password" required autoComplete="off" placeholder="mongodb+srv://..." />
                      <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-4 text-xs font-semibold text-white shadow-xs transition">
                        Save Database URL
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-400">Tenant Owner or Admin role required to modify database routing.</p>
                  )}
                </div>
              </Panel>

              {/* SMTP Notifications */}
              <Panel
                title="SMTP Email Notifications"
                subtitle="Automatically sends call transcripts and captured leads to team members upon conversation completion."
                actions={
                  canEditSecrets && (
                    <button
                      form="smtp-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>Save SMTP Alerts</span>
                      <span>✓</span>
                    </button>
                  )
                }
              >
                {canEditSecrets ? (
                  <form id="smtp-form" action={saveEmailNotificationsAction} className="space-y-4">
                    <input type="hidden" name="tenantId" value={tenant.tenantId} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <CheckboxField label="Enable email notifications" name="enabled" defaultChecked={emailConfig?.enabled ?? false} />
                      <CheckboxField label="Use secure SMTP (SSL/TLS)" name="secure" defaultChecked={emailConfig?.smtp.secure ?? true} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Service Provider" name="service" defaultValue={emailConfig?.smtp.service ?? 'gmail'} />
                      <Field label="SMTP Host" name="host" defaultValue={emailConfig?.smtp.host ?? 'smtp.gmail.com'} />
                      <Field label="SMTP Port" name="port" type="number" defaultValue={String(emailConfig?.smtp.port ?? 465)} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="SMTP User" name="user" type="email" defaultValue={emailConfig?.smtp.user ?? emailConfig?.fromEmail ?? ''} />
                      <Field label="SMTP Password / App Password" name="password" type="password" autoComplete="new-password" placeholder={detail.smtpPasswordSecret ? '••••••••' : ''} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="From Display Name" name="fromName" defaultValue={emailConfig?.fromName ?? `${tenant.companyName} Voice Agent`} />
                      <Field label="From Email Address" name="fromEmail" type="email" defaultValue={emailConfig?.fromEmail ?? ''} />
                    </div>

                    <TextArea
                      label="Lead Summary Recipients (One per line)"
                      name="recipients"
                      rows={3}
                      defaultValue={(emailConfig?.recipients ?? []).join('\n')}
                      placeholder="sales@example.com&#10;lead-inbox@example.com"
                    />

                    <CheckboxField label="Send summary email to captured lead customer" name="sendToLeadEmail" defaultChecked={emailConfig?.sendToLeadEmail ?? false} />

                    <div className="pt-2">
                      <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-5 text-xs font-semibold text-white shadow-xs transition">
                        Save SMTP Configuration
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400">Tenant Owner or Admin role required to modify SMTP alerts.</p>
                )}
              </Panel>
            </div>
          )}

          {/* TAB 5: TEAM & ACCESS */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              <Panel
                title="Team Members & Role Access"
                subtitle="Manage tenant administrators and team members with access to this agent."
                actions={
                  mutable && (
                    <button
                      form="team-user-form"
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#0052ff] to-[#0040d0] hover:from-[#085bf6] hover:to-[#0039be] px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,82,255,0.35)] transition cursor-pointer active:scale-[0.98]"
                    >
                      <span>+ Add Team Member</span>
                    </button>
                  )
                }
              >
                <div className="space-y-3">
                  {detail.users.length === 0 ? (
                    <p className="text-xs text-slate-400">No specific users assigned yet.</p>
                  ) : (
                    detail.users.map((user) => (
                      <div key={user.userId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{user.name || user.email}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
                        </div>
                        <span className="rounded-full border border-indigo-200/90 bg-gradient-to-b from-indigo-50 to-indigo-100/70 px-3 py-0.5 text-[11px] font-bold text-indigo-800 shadow-2xs">
                          {formatLabel(user.role)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {mutable && (
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Invite Team Admin</h3>
                    <form id="team-user-form" action={createTenantUserAction} className="space-y-3.5">
                      <input type="hidden" name="tenantId" value={tenant.tenantId} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Full Name" name="name" autoComplete="off" />
                        <Field label="Email Address" name="email" type="email" required autoComplete="off" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Password" name="password" type="password" required autoComplete="new-password" />
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</span>
                          <select name="role" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-xs outline-none focus:border-[#0052ff]">
                            <option value="tenant_admin">Tenant Admin</option>
                            <option value="tenant_owner">Tenant Owner</option>
                          </select>
                        </label>
                      </div>
                      <button className="h-9 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] px-4 text-xs font-semibold text-white shadow-xs transition">
                        Add User
                      </button>
                    </form>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
