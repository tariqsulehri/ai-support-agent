import { StatusBadge } from '@/components/admin/status-badge'
import { buttonClasses } from '@/components/admin/button-styles'
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
      <div className="flex min-h-dvh flex-col bg-[#f8fafc] text-slate-900 antialiased">
        <DetailHeader viewer={viewer} voiceUrl={voiceUrl} />

        <div className="flex min-w-0 flex-1">
          <DetailSidebar viewer={viewer} tenantId={tenant.tenantId} voiceUrl={voiceUrl} />

          <main className="min-w-0 flex-1 space-y-3.5 p-3.5 sm:p-4 lg:p-5">
            {created && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
              >
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                Tenant created successfully.
              </div>
            )}

            <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-50 text-[#0052ff]">
                    <ActiveTabIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
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
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      <ActiveTabText field="description" />
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <a href={voiceUrl} target="_blank" rel="noreferrer" className={buttonClasses('secondary', 'md')}>
                    <ExternalIcon className="h-3.5 w-3.5 text-slate-500" />
                    Preview Agent
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <TabLink
                    tab="embed"
                    hideWhenActive
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-[#0052ff] transition hover:bg-blue-100"
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
