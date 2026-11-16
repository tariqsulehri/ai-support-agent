import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getVerifiedSession } from '@/lib/auth/session'
import { generateEmbedToken, listManagedTenants, type ManagedTenantSummary } from '@/lib/tenants/management'
import { listTenantUsageSummaries, type TenantUsageSummary } from '@/lib/observability/usage'
import { Field, SelectField, TextArea } from '@/components/admin/form-fields'
import { StatusBadge } from '@/components/admin/status-badge'
import { GlossyBarChart, GlossyDonutChart } from '@/components/admin/3d-charts'
import {
  ActionForm,
  ActionFormProvider,
  ActionMessage,
  SubmitButton,
  type ButtonVariant,
} from '@/components/admin/action-form'
import { buttonClasses } from '@/components/admin/button-styles'
import { CountPill, GradientStatTile, SectionCard } from '@/components/admin/gradient-tile'
import { cardSurface } from '@/components/admin/surface'
import { AdminTabs, type AdminTabMeta } from './_components/admin-tabs'
import { TenantDirectory, type DirectoryRow } from './_components/tenant-directory'
import { Icon, type IconName } from '@/app/dashboard/_components/icons'
import { formatLabel } from '@/lib/admin/forms'
import {
  TENANT_BILLING_CYCLES,
  TENANT_SUBSCRIPTION_STATUSES,
  TENANT_SUBSCRIPTION_TYPES,
} from '@/lib/tenants/options'
import { createTenantAction, tenantLifecycleAction, updateSubscriptionAction } from './actions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AdminTenantTab = 'overview' | 'tenants' | 'create' | 'subscriptions' | 'usage' | 'archived'

const tabs: Array<{ id: AdminTenantTab; label: string; icon: IconName }> = [
  { id: 'overview', label: 'Overview', icon: 'ai' },
  { id: 'tenants', label: 'Tenants', icon: 'tenants' },
  { id: 'create', label: 'Create Tenant', icon: 'user' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'configuration' },
  { id: 'usage', label: 'Usage', icon: 'overview' },
  { id: 'archived', label: 'Archived', icon: 'archive' },
]

const usageChartLabels: Array<[keyof TenantUsageSummary['counters'], string]> = [
  ['embed_session_created', 'Embed Sessions'],
  ['embed_session_denied', 'Denied Sessions'],
  ['config_request', 'Config'],
  ['chat_request', 'Chat'],
  ['transcription_request', 'Transcription'],
  ['tts_request', 'TTS'],
  ['conversation_completed', 'Completed Calls'],
]
const usageColors = ['#0052ff', '#6e19eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']

// ── Small presentational primitives ─────────────────────────────────────────

const thClass = 'px-4 py-3 font-semibold'
const tdClass = 'px-4 py-3 align-middle'

function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200" aria-hidden="true">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-slate-500">{children}</p>}
    </div>
  )
}

/** One status-change button (archive / disable / enable / activate) with pending + inline error. */
function LifecycleButton({
  tenant,
  op,
  label,
  pendingLabel,
  variant,
  confirmMessage,
  icon,
}: {
  tenant: ManagedTenantSummary
  op: 'archive' | 'disable' | 'enable' | 'activate'
  label: string
  pendingLabel: string
  variant: ButtonVariant
  confirmMessage?: string
  /** Render a square icon-only button; the label becomes its tooltip and screen-reader name. */
  icon?: IconName
}) {
  return (
    <ActionFormProvider action={tenantLifecycleAction}>
      <div className="flex flex-col items-end gap-1">
        <ActionForm>
          <input type="hidden" name="tenantId" value={tenant.tenantId} />
          <input type="hidden" name="op" value={op} />
          <span title={icon ? `${label} ${tenant.companyName}` : undefined} className="inline-flex">
            <SubmitButton
              size={icon ? 'icon' : 'sm'}
              variant={variant}
              pendingLabel={icon ? <span className="sr-only">{pendingLabel}</span> : pendingLabel}
              confirmMessage={confirmMessage}
            >
              {icon ? (
                <>
                  <Icon name={icon} className="h-3.5 w-3.5" />
                  <span className="sr-only">{label} {tenant.companyName}</span>
                </>
              ) : (
                <>
                  {label}
                  <span className="sr-only"> {tenant.companyName}</span>
                </>
              )}
            </SubmitButton>
          </span>
        </ActionForm>
        <ActionMessage className="max-w-[16rem] text-left" />
      </div>
    </ActionFormProvider>
  )
}

// ── Tab panels ──────────────────────────────────────────────────────────────

const AVATAR_TONES = [
  'from-[#0052ff] to-[#133cb4]',
  'from-violet-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-sky-700',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function avatarTone(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

function TenantIdentity({ tenant }: { tenant: ManagedTenantSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-sm ${avatarTone(tenant.tenantId)}`}
        aria-hidden="true"
      >
        {initials(tenant.companyName)}
      </span>
      <div className="min-w-0">
        <Link
          href={`/admin/tenants/${tenant.tenantId}`}
          className="block truncate font-semibold text-slate-950 outline-none hover:text-[#0052ff] focus-visible:underline"
        >
          {tenant.companyName}
        </Link>
        <p className="truncate font-mono text-xs text-slate-500">{tenant.tenantId}</p>
      </div>
    </div>
  )
}

const hostOf = (domain: string) => domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

/** First domain as a chip plus a "+N" pill; the full list is in the tooltip. */
function DomainSummary({ domains }: { domains: string[] }) {
  if (domains.length === 0) return <span className="text-xs text-slate-400">No domains</span>
  const [first, ...rest] = domains
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={domains.join('\n')}>
      <span className="truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
        {hostOf(first)}
      </span>
      {rest.length > 0 && (
        <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-[#0052ff]">
          +{rest.length}
          <span className="sr-only"> more: {rest.map(hostOf).join(', ')}</span>
        </span>
      )}
    </div>
  )
}

function DotLabel({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'}`} aria-hidden="true" />
      {ok ? okLabel : offLabel}
    </span>
  )
}

/** Server-rendered table row for one tenant; filtering happens client-side in TenantDirectory. */
function TenantRow({ tenant }: { tenant: ManagedTenantSummary }) {
  return (
    <tr className="group transition-colors hover:bg-blue-50/40">
      <td className={tdClass}><TenantIdentity tenant={tenant} /></td>
      <td className={tdClass}><DomainSummary domains={tenant.domains} /></td>
      <td className={tdClass}>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={tenant.subscriptionStatus} />
          <span className="text-xs font-semibold text-slate-600">{formatLabel(tenant.subscriptionType)}</span>
        </div>
      </td>
      <td className={tdClass}>
        <DotLabel ok={tenant.hasOpenAiKey} okLabel="Configured" offLabel="Missing" />
      </td>
      <td className={tdClass}><StatusBadge status={tenant.status} /></td>
      <td className={tdClass}>
        <div className="flex items-start justify-end gap-1.5 whitespace-nowrap">
          <Link href={`/admin/tenants/${tenant.tenantId}`} className={buttonClasses('primary', 'sm')}>
            Manage<span className="sr-only"> {tenant.companyName}</span>
            <Icon name="external" className="h-3 w-3" />
          </Link>
          {tenant.status === 'active' ? (
            <LifecycleButton tenant={tenant} op="disable" label="Disable" pendingLabel="Disabling…" variant="warning" icon="pause" />
          ) : tenant.status === 'disabled' ? (
            <LifecycleButton tenant={tenant} op="enable" label="Enable" pendingLabel="Enabling…" variant="success" icon="play" />
          ) : null}
          <LifecycleButton
            tenant={tenant}
            op="archive"
            label="Archive"
            pendingLabel="Archiving…"
            variant="secondary"
            icon="archive"
            confirmMessage={`Archive ${tenant.companyName}? Its agent will stop serving requests until reactivated.`}
          />
        </div>
      </td>
    </tr>
  )
}

function directoryRows(tenants: ManagedTenantSummary[]): DirectoryRow[] {
  return tenants.map((tenant) => ({
    id: tenant.tenantId,
    status: tenant.status,
    haystack: [tenant.companyName, tenant.tenantId, ...tenant.domains].join(' ').toLowerCase(),
    row: <TenantRow tenant={tenant} />,
  }))
}

// Violet band to match the Create Tenant card's tone.
const FORM_SECTION_BAND = 'border-b border-violet-100 bg-gradient-to-r from-violet-50 via-indigo-50/60 to-white'

/** Numbered form section used to break the create form into clear steps. */
function FormSection({
  step,
  title,
  hint,
  children,
}: {
  step: number
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <fieldset className={`min-w-0 overflow-hidden ${cardSurface}`}>
      <legend className="sr-only">{title}</legend>
      <div className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 ${FORM_SECTION_BAND}`}>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700 text-xs font-bold text-white shadow-[0_4px_12px_rgba(109,40,217,0.30)]"
          aria-hidden="true"
        >
          {step}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-slate-950">{title}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </fieldset>
  )
}

function CreateTenantPanel({ suggestedEmbedToken }: { suggestedEmbedToken: string }) {
  return (
    <ActionFormProvider action={createTenantAction}>
      <SectionCard
        title="Create Tenant"
        icon="user"
        tone="violet"
        description="Creates the tenant, admin login, allowed domains, subscription, and initial embed token."
        actions={
          <SubmitButton form="create-tenant-form" size="sm" pendingLabel="Creating…">
            Create Tenant
          </SubmitButton>
        }
      >
        <ActionForm id="create-tenant-form" className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <FormSection step={1} title="Tenant identity" hint="How the tenant is identified across the platform.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Tenant ID"
                  name="tenantId"
                  required
                  placeholder="acme-support"
                  maxLength={63}
                  hint="3-63 characters: lowercase letters, numbers, hyphens."
                />
                <Field label="Company Name" name="companyName" required placeholder="Acme Inc." maxLength={120} />
              </div>
            </FormSection>

            <FormSection step={2} title="Agent persona" hint="What visitors see and hear when the agent greets them.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agent Name" name="agentName" placeholder="Acme Assistant" maxLength={80} />
                <Field label="Tone" name="tone" placeholder="friendly, professional, and helpful" maxLength={200} />
              </div>
              <TextArea label="Greeting" name="greeting" rows={3} maxLength={500} placeholder="Hi, I am Acme Assistant. How can I help you today?" />
              <TextArea label="Services (one per line)" name="services" placeholder={'Customer Support\nSales Inquiry\nBooking'} />
            </FormSection>

            <FormSection step={3} title="Allowed domains" hint="Websites permitted to embed this agent. One origin per line.">
              <TextArea label="Allowed Domains" name="domains" placeholder={'https://example.com\nhttps://app.example.com'} />
            </FormSection>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4">
            <FormSection step={4} title="Subscription & access" hint="Plan details and the initial embed token.">
              <SelectField label="Subscription" name="subscriptionStatus" options={TENANT_SUBSCRIPTION_STATUSES} defaultValue="trial" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Plan Type" name="subscriptionType" options={TENANT_SUBSCRIPTION_TYPES} defaultValue="free" />
                <SelectField label="Billing Cycle" name="billingCycle" options={TENANT_BILLING_CYCLES} defaultValue="monthly" />
              </div>
              <Field label="Embed Token" name="embedToken" required defaultValue={suggestedEmbedToken} autoComplete="off" />
            </FormSection>

            <FormSection step={5} title="Tenant admin login" hint="Optional. Leave blank to add team members later.">
              <Field label="Admin Name" name="adminName" placeholder="Tenant Admin" maxLength={120} />
              <Field label="Admin Email" name="adminEmail" type="email" placeholder="admin@example.com" autoComplete="off" />
              <Field
                label="Admin Password"
                name="adminPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                hint="At least 8 characters."
              />
            </FormSection>

            <ActionMessage />
            <SubmitButton size="lg" pendingLabel="Creating tenant…" className="w-full">
              Create Tenant
            </SubmitButton>
          </div>
        </ActionForm>
      </SectionCard>
    </ActionFormProvider>
  )
}

// Compact table-cell controls: the column header is the visible label, so each
// control carries an sr-only label naming the tenant for screen readers.
const cellControl =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/10'

function CellSelect({
  form,
  name,
  label,
  options,
  defaultValue,
}: {
  form: string
  name: string
  label: string
  options: readonly string[]
  defaultValue: string
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select form={form} name={name} defaultValue={defaultValue} className={cellControl}>
        {options.map((option) => (
          <option key={option} value={option}>{formatLabel(option)}</option>
        ))}
      </select>
    </label>
  )
}

const SUBSCRIPTION_DOTS: Record<string, string> = {
  trial: 'bg-amber-500',
  active: 'bg-emerald-500',
  past_due: 'bg-rose-500',
  canceled: 'bg-slate-400',
  expired: 'bg-slate-400',
}

/** Human expiry hint, e.g. "in 12 days" or "Expired 3 days ago"; null when no expiry is set. */
function expiryHint(expiresAt: string | null): { text: string; tone: string } | null {
  if (!expiresAt) return null
  const end = Date.parse(`${expiresAt}T00:00:00Z`)
  if (Number.isNaN(end)) return null
  const days = Math.ceil((end - Date.now()) / 86_400_000)
  if (days < 0) return { text: `Expired ${-days} day${days === -1 ? '' : 's'} ago`, tone: 'text-rose-600' }
  if (days === 0) return { text: 'Expires today', tone: 'text-rose-600' }
  return { text: `in ${days} day${days === 1 ? '' : 's'}`, tone: days <= 14 ? 'text-amber-700' : 'text-slate-500' }
}

function SubscriptionRow({ tenant }: { tenant: ManagedTenantSummary }) {
  const formId = `subscription-${tenant.tenantId}`
  const expiry = expiryHint(tenant.expiresAt)
  return (
    <ActionFormProvider action={updateSubscriptionAction}>
      <tr className="transition-colors hover:bg-emerald-50/30">
        <td className={tdClass}>
          <ActionForm id={formId}>
            <input type="hidden" name="tenantId" value={tenant.tenantId} />
          </ActionForm>
          <TenantIdentity tenant={tenant} />
          <ActionMessage className="mt-2 max-w-xs" />
        </td>
        <td className={tdClass}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${SUBSCRIPTION_DOTS[tenant.subscriptionStatus] ?? 'bg-slate-400'}`} aria-hidden="true" />
            <CellSelect form={formId} name="subscriptionStatus" label={`Subscription status for ${tenant.companyName}`} options={TENANT_SUBSCRIPTION_STATUSES} defaultValue={tenant.subscriptionStatus} />
          </div>
        </td>
        <td className={tdClass}>
          <CellSelect form={formId} name="subscriptionType" label={`Plan type for ${tenant.companyName}`} options={TENANT_SUBSCRIPTION_TYPES} defaultValue={tenant.subscriptionType} />
        </td>
        <td className={tdClass}>
          <CellSelect form={formId} name="billingCycle" label={`Billing cycle for ${tenant.companyName}`} options={TENANT_BILLING_CYCLES} defaultValue={tenant.billingCycle} />
        </td>
        <td className={tdClass}>
          <label className="block">
            <span className="sr-only">Seats for {tenant.companyName}</span>
            <input
              form={formId}
              name="seats"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="∞"
              defaultValue={tenant.seats != null ? String(tenant.seats) : undefined}
              className={`${cellControl} tabular-nums`}
            />
          </label>
        </td>
        <td className={tdClass}>
          <label className="block">
            <span className="sr-only">Expiry date for {tenant.companyName}</span>
            <input form={formId} name="expiresAt" type="date" defaultValue={tenant.expiresAt ?? undefined} className={`${cellControl} tabular-nums`} />
          </label>
          {expiry && <p className={`mt-1 text-xs font-medium ${expiry.tone}`}>{expiry.text}</p>}
        </td>
        <td className={`${tdClass} text-right`}>
          <SubmitButton form={formId} size="sm" pendingLabel="Saving…">
            Save<span className="sr-only"> subscription for {tenant.companyName}</span>
          </SubmitButton>
        </td>
      </tr>
    </ActionFormProvider>
  )
}

function SubscriptionsPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  const byStatus = TENANT_SUBSCRIPTION_STATUSES.map((status) => ({
    status,
    count: tenants.filter((tenant) => tenant.subscriptionStatus === status).length,
  }))
  return (
    <SectionCard
      title="Tenant Subscriptions"
      icon="configuration"
      tone="emerald"
      badge={<CountPill>{tenants.length}</CountPill>}
      description="Edit a row and press Save. Clear seats or expiry to remove the limit."
      toolbar={
        <ul className="flex flex-wrap gap-2" aria-label="Tenants by subscription status">
          {byStatus.map(({ status, count }) => (
            <li
              key={status}
              className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
            >
              <span className={`h-2 w-2 rounded-full ${SUBSCRIPTION_DOTS[status] ?? 'bg-slate-400'}`} aria-hidden="true" />
              {formatLabel(status)}
              <span className="tabular-nums text-slate-400">{count}</span>
            </li>
          ))}
        </ul>
      }
    >
      {tenants.length === 0 ? (
        <EmptyState icon="tenants" title="No tenants yet">Create a tenant to manage its subscription here.</EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
          <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
            <caption className="sr-only">Tenant subscriptions</caption>
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className={thClass}>Tenant</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Plan</th>
                <th scope="col" className={thClass}>Billing cycle</th>
                <th scope="col" className={thClass}>Seats</th>
                <th scope="col" className={thClass}>Expires</th>
                <th scope="col" className={`${thClass} text-right`}><span className="sr-only">Save</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.map((tenant) => (
                <SubscriptionRow key={tenant.tenantId} tenant={tenant} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function ArchivedPanel({ tenants }: { tenants: ManagedTenantSummary[] }) {
  return (
    <SectionCard
      title="Archived Tenants"
      icon="archive"
      tone="slate"
      badge={<CountPill>{tenants.length}</CountPill>}
      description="Archived tenants are blocked from runtime usage until reactivated."
    >
      {tenants.length === 0 ? (
        <EmptyState icon="archive" title="No archived tenants">
          Tenants you archive from the Tenants tab appear here and can be reactivated at any time.
        </EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
          <table className="w-full min-w-[860px] table-fixed text-left text-sm">
            <caption className="sr-only">Archived tenants</caption>
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className={thClass}>Tenant</th>
                <th scope="col" className={thClass}>Domains</th>
                <th scope="col" className={thClass}>Plan</th>
                <th scope="col" className={thClass}>Last updated</th>
                <th scope="col" className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.map((tenant) => (
                <tr key={tenant.tenantId} className="transition-colors hover:bg-slate-50/80">
                  <td className={tdClass}><TenantIdentity tenant={tenant} /></td>
                  <td className={tdClass}><DomainSummary domains={tenant.domains} /></td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={tenant.subscriptionStatus} />
                      <span className="text-xs font-semibold text-slate-600">{formatLabel(tenant.subscriptionType)}</span>
                    </div>
                  </td>
                  <td className={`${tdClass} text-xs text-slate-500`}>{formatDateUtc(tenant.updatedAt)}</td>
                  <td className={tdClass}>
                    <div className="flex items-start justify-end gap-1.5 whitespace-nowrap">
                      <Link href={`/admin/tenants/${tenant.tenantId}`} className={buttonClasses('secondary', 'sm')}>
                        View<span className="sr-only"> {tenant.companyName}</span>
                      </Link>
                      <LifecycleButton tenant={tenant} op="activate" label="Activate" pendingLabel="Activating…" variant="primary" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function formatDateUtc(value: Date | null | undefined, withTime = false): string {
  if (!value || Number.isNaN(value.getTime())) return '—'
  return withTime
    ? `${value.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`
    : value.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
}

function UsagePanel({
  tenants,
  usageByTenant,
}: {
  tenants: ManagedTenantSummary[]
  usageByTenant: Map<string, TenantUsageSummary>
}) {
  const grandTotal = tenants.reduce((sum, tenant) => sum + (usageByTenant.get(tenant.tenantId)?.total ?? 0), 0)
  const activeCount = tenants.filter((tenant) => (usageByTenant.get(tenant.tenantId)?.total ?? 0) > 0).length
  return (
    <SectionCard
      title="Tenant Usage Counters"
      icon="overview"
      tone="amber"
      badge={<CountPill>{tenants.length}</CountPill>}
      description="Aggregate totals only. Detailed usage events are not stored."
      toolbar={
        <ul className="flex flex-wrap gap-2" aria-label="Usage summary">
          <li className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            Total events <span className="tabular-nums text-slate-950">{grandTotal.toLocaleString()}</span>
          </li>
          <li className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            Tenants with usage <span className="tabular-nums text-slate-950">{activeCount} of {tenants.length}</span>
          </li>
        </ul>
      }
    >
      {tenants.length === 0 ? (
        <EmptyState icon="overview" title="No tenants yet">Usage counters appear once tenants are created.</EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-xl sm:border sm:border-slate-200/80">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <caption className="sr-only">Usage counters per tenant</caption>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className={thClass}>Tenant</th>
                <th scope="col" className={`${thClass} text-right`}>Total</th>
                {usageChartLabels.map(([, label]) => (
                  <th scope="col" key={label} className={`${thClass} text-right`}>{label}</th>
                ))}
                <th scope="col" className={thClass}>Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.map((tenant) => {
                const usage = usageByTenant.get(tenant.tenantId)
                const total = usage?.total ?? 0
                return (
                  <tr key={tenant.tenantId} className="transition-colors hover:bg-amber-50/30">
                    <td className={tdClass}><TenantIdentity tenant={tenant} /></td>
                    <td className={`${tdClass} text-right`}>
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                          total > 0 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'text-slate-300'
                        }`}
                      >
                        {total.toLocaleString()}
                      </span>
                    </td>
                    {usageChartLabels.map(([key, label]) => {
                      const value = usage?.counters?.[key] ?? 0
                      return (
                        <td key={label} className={`${tdClass} text-right text-xs tabular-nums ${value > 0 ? 'font-semibold text-slate-800' : 'text-slate-300'}`}>
                          {value.toLocaleString()}
                        </td>
                      )
                    })}
                    <td className={`${tdClass} whitespace-nowrap text-xs text-slate-500`}>
                      {usage?.lastEventAt ? formatDateUtc(usage.lastEventAt, true) : <span className="text-slate-400">Never</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AdminTenantsPage() {
  // Session check runs in parallel with data loads; data is only rendered
  // after the platform-admin check passes.
  const [session, tenants, usageSummaries] = await Promise.all([
    getVerifiedSession(),
    listManagedTenants().catch((error: unknown) => (error instanceof Error ? error : new Error(String(error)))),
    listTenantUsageSummaries().catch(() => [] as TenantUsageSummary[]),
  ])
  if (!session) redirect(`/admin/login?next=${encodeURIComponent('/admin/tenants')}`)
  if (session.role !== 'platform_admin') redirect('/dashboard')
  if (tenants instanceof Error) throw tenants

  const activeTenants = tenants.filter((tenant) => tenant.status !== 'archived')
  const archivedTenants = tenants.filter((tenant) => tenant.status === 'archived')
  const enabledCount = tenants.filter((tenant) => tenant.status === 'active').length
  const disabledCount = tenants.filter((tenant) => tenant.status === 'disabled').length
  const openAiReadyCount = activeTenants.filter((tenant) => tenant.hasOpenAiKey).length
  const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)
  const usageByTenant = new Map(usageSummaries.map((summary) => [summary.tenantId, summary]))
  const aggregateUsage = usageChartLabels.map(([key, label], index) => ({
    label,
    value: usageSummaries.reduce((sum, summary) => sum + (summary.counters[key] ?? 0), 0),
    color: usageColors[index],
  }))
  const tabCounts: Partial<Record<AdminTenantTab, number>> = {
    tenants: activeTenants.length,
    subscriptions: activeTenants.length,
    archived: archivedTenants.length,
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e8efff_0%,_#f6f8fb_45%,_#f6f8fb_100%)] px-3.5 pb-6 pt-4 text-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] px-5 py-6 text-white shadow-[0_16px_40px_-16px_rgba(0,82,255,0.6)] sm:px-8 sm:py-7">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-40 -z-10 h-48 w-48 rounded-full bg-cyan-300/15" />
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex min-w-0 flex-col items-center gap-4 md:flex-row">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm" aria-hidden="true">
                <Icon name="tenants" className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Platform Admin</p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Tenant Management</h1>
                <p className="mt-1 text-sm text-white/85">
                  Control tenant access, runtime readiness, subscriptions, and deployment settings.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white outline-none backdrop-blur-sm transition hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <Icon name="overview" className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <form action="/api/admin/auth/logout" method="post">
                <input type="hidden" name="next" value="/admin/login" />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-xs font-semibold text-[#133cb4] shadow-sm outline-none transition hover:bg-blue-50 focus-visible:ring-4 focus-visible:ring-white/40"
                >
                  <Icon name="logout" className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tenant totals">
          <GradientStatTile
            label="Active"
            value={enabledCount}
            context={`of ${tenants.length}`}
            detail="Serving runtime requests"
            tone="emerald"
            icon="check"
            progress={share(enabledCount, tenants.length)}
          />
          <GradientStatTile
            label="Disabled"
            value={disabledCount}
            context={`of ${tenants.length}`}
            detail="Paused by an admin"
            tone="amber"
            icon="clock"
            progress={share(disabledCount, tenants.length)}
          />
          <GradientStatTile
            label="Archived"
            value={archivedTenants.length}
            context={`of ${tenants.length}`}
            detail="Blocked until reactivated"
            tone="slate"
            icon="archive"
            progress={share(archivedTenants.length, tenants.length)}
          />
          <GradientStatTile
            label="OpenAI ready"
            value={openAiReadyCount}
            context={`of ${activeTenants.length}`}
            detail="API key configured (non-archived)"
            tone="blue"
            icon="ai"
            progress={share(openAiReadyCount, activeTenants.length)}
          />
        </section>

        <AdminTabs
          defaultTab="overview"
          tabs={tabs.map((tab): AdminTabMeta => ({ ...tab, count: tabCounts[tab.id] }))}
          panels={{
            overview: (
              <section className="grid items-stretch gap-4 xl:grid-cols-2" aria-label="Platform metrics">
                <GlossyDonutChart
                  title="Tenant Status"
                  infoTooltip="Registered tenant accounts grouped by active, disabled, and archived status."
                  total={tenants.length}
                  unit="tenants"
                  className="h-full"
                  items={[
                    { label: 'Active', value: enabledCount, color: '#10b981' },
                    { label: 'Disabled', value: disabledCount, color: '#f59e0b' },
                    { label: 'Archived', value: archivedTenants.length, color: '#64748b' },
                  ]}
                />
                <GlossyBarChart
                  title="Platform Usage"
                  totalLabel={`${usageSummaries.length} tenant${usageSummaries.length === 1 ? '' : 's'} with usage`}
                  infoTooltip="Aggregated usage counters across registered tenants."
                  className="h-full"
                  items={aggregateUsage}
                />
              </section>
            ),
            tenants: <TenantDirectory rows={directoryRows(activeTenants)} />,
            create: <CreateTenantPanel suggestedEmbedToken={generateEmbedToken()} />,
            subscriptions: <SubscriptionsPanel tenants={activeTenants} />,
            usage: <UsagePanel tenants={activeTenants} usageByTenant={usageByTenant} />,
            archived: <ArchivedPanel tenants={archivedTenants} />,
          } satisfies Record<AdminTenantTab, ReactNode>}
        />
      </div>
    </main>
  )
}
