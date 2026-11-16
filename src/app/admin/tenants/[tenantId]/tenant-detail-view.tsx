import { StatusBadge } from '@/components/admin/status-badge'
import { formatLabel } from '@/lib/admin/forms'
import { ActiveTabIcon, ActiveTabText, TabBar, TabLink, TabPanels, TenantTabProvider } from './_components/tab-state'
import { DetailHeader, DetailSidebar } from './_components/shell'
import { OverviewTab } from './_components/overview-tab'
import { EmbedTab, type EmbedTabProps } from './_components/embed-tab'
import { AgentTab } from './_components/agent-tab'
import { IntegrationsTab } from './_components/integrations-tab'
import { TeamTab } from './_components/team-tab'
import { CheckCircleIcon, ExternalIcon } from './_components/icons'
import { Pill } from './_components/ui'
import { readiness, type TabKey, type TenantDetailData, type TenantPermissions, type ViewerInfo } from './_components/types'

type TenantDetailViewProps = {
  data: TenantDetailData
  viewer: ViewerInfo
  permissions: TenantPermissions
  voiceUrl: string
  initialTab: TabKey
  created: boolean
  embed: Omit<EmbedTabProps, 'data' | 'permissions'>
}

/**
 * Server-rendered shell for the tenant detail page. Only the tab switcher,
 * copy buttons and forms are client components; every tab panel is rendered
 * here once so switching tabs needs no server round-trip.
 */
export function TenantDetailView({ data, viewer, permissions, voiceUrl, initialTab, created, embed }: TenantDetailViewProps) {
  const { tenant } = data
  const { embedReady } = readiness(data)

  return (
    <TenantTabProvider initialTab={initialTab}>
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_#e8efff_0%,_#f6f8fb_45%,_#f6f8fb_100%)] text-slate-900 antialiased">
        <DetailHeader viewer={viewer} voiceUrl={voiceUrl} />

        <div className="flex min-w-0 flex-1">
          <DetailSidebar viewer={viewer} tenantId={tenant.tenantId} voiceUrl={voiceUrl} />

          <main className="min-w-0 flex-1 space-y-4 px-3.5 pb-5 pt-3 sm:px-4 lg:px-5">
            {created && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
              >
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                Tenant created successfully.
              </div>
            )}

            <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] px-4 py-5 text-white shadow-[0_16px_40px_-16px_rgba(0,82,255,0.6)] sm:px-6">
              <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-white/10" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-48 -z-10 h-44 w-44 rounded-full bg-cyan-300/15" />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
                    <ActiveTabIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">
                        {tenant.companyName}
                      </h1>
                      <Pill tone="blue">
                        <ActiveTabText field="badgeText" />
                      </Pill>
                      <StatusBadge status={tenant.status} />
                      <Pill tone="indigo">
                        {formatLabel(tenant.subscriptionType)} · {formatLabel(tenant.subscriptionStatus)}
                      </Pill>
                      <Pill tone={embedReady ? 'emerald' : 'amber'}>
                        {embedReady ? 'Ready to embed' : 'Setup in progress'}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/85">
                      <ActiveTabText field="description" />
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <a
                    href={voiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white outline-none backdrop-blur-sm transition hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-white/40"
                  >
                    <ExternalIcon className="h-3.5 w-3.5" />
                    Preview Agent
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <TabLink
                    tab="embed"
                    hideWhenActive
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-[#133cb4] shadow-sm outline-none transition hover:bg-blue-50 focus-visible:ring-4 focus-visible:ring-white/40"
                  >
                    Get Embed Code
                  </TabLink>
                </div>
              </div>
            </section>

            <TabBar />

            <TabPanels
              panels={{
                overview: <OverviewTab data={data} isPlatformAdmin={viewer.isPlatformAdmin} />,
                embed: <EmbedTab data={data} permissions={permissions} {...embed} />,
                agent: <AgentTab data={data} canManage={permissions.canManage} />,
                integrations: <IntegrationsTab data={data} canManage={permissions.canManage} />,
                team: <TeamTab data={data} canManage={permissions.canManage} isPlatformAdmin={viewer.isPlatformAdmin} />,
              }}
            />
          </main>
        </div>
      </div>
    </TenantTabProvider>
  )
}
