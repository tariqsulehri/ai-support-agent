import { AdminPanel as Panel } from '@/components/admin/panel'
import { StatusBadge } from '@/components/admin/status-badge'
import { Field, TextArea } from '@/components/admin/form-fields'
import { ActionForm, ActionFormProvider, ActionMessage, SubmitButton } from '@/components/admin/action-form'
import {
  renewClientApiKeyAction,
  saveDomainsAction,
  saveEmbedTokenAction,
  verifyDomainAction,
} from '../actions'
import { CopyButton, MaskedValue } from './copy-button'
import { RefreshIcon } from './icons'
import { CodeBlock, MutedNote, Pill, SectionHeading, formatDate } from './ui'
import type { TenantDetailData, TenantPermissions } from './types'

export type EmbedTabProps = {
  data: TenantDetailData
  permissions: TenantPermissions
  clientApiKey: string
  maskedClientApiKey: string
  snippet: string
  maskedSnippet: string
  legacySnippet: string
  /** Only provided to users who can manage the tenant. */
  suggestedEmbedToken: string | null
}

function TenantIdField({ tenantId }: { tenantId: string }) {
  return <input type="hidden" name="tenantId" value={tenantId} />
}

export function EmbedTab({
  data,
  permissions,
  clientApiKey,
  maskedClientApiKey,
  snippet,
  maskedSnippet,
  legacySnippet,
  suggestedEmbedToken,
}: EmbedTabProps) {
  const { tenantId } = data.tenant

  return (
    <>
      <Panel
        title="Client API Key"
        subtitle="Publishable key used by the website embed. The tenant ID is cryptographically bound to the key."
        badge={clientApiKey ? <Pill tone="emerald">Issued</Pill> : <Pill tone="amber">Missing</Pill>}
      >
        <div className="space-y-3">
          <MaskedValue value={clientApiKey} masked={maskedClientApiKey} />
          <ActionFormProvider action={renewClientApiKeyAction}>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
              <span>
                {data.tenant.clientApiKeyCreatedAt
                  ? `Issued ${formatDate(data.tenant.clientApiKeyCreatedAt, true)}`
                  : 'Stored in tenant configuration'}
              </span>
              {permissions.canManage && (
                <ActionForm>
                  <TenantIdField tenantId={tenantId} />
                  <SubmitButton
                    size="sm"
                    pendingLabel="Renewing…"
                    confirmMessage="Renew the client API key? Websites using the current snippet will stop working until updated."
                  >
                    <RefreshIcon className="h-3 w-3" />
                    Renew Client API Key
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
            <ActionMessage />
          </ActionFormProvider>
        </div>
      </Panel>

      <Panel
        title="HTML Embed Snippet"
        subtitle="Paste this script tag into the <head> or before the closing </body> tag of your website."
        actions={<CopyButton value={snippet} label="Copy Snippet" copiedLabel="Copied HTML!" variant="primary" />}
      >
        <div className="space-y-3">
          <CodeBlock>{maskedSnippet}</CodeBlock>
          <p className="text-xs text-slate-500">The key is masked above; “Copy Snippet” copies the full value.</p>

          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600">
            <p className="font-bold text-slate-900">Deployment steps</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Paste the snippet onto any page where the AI voice button should appear.</li>
              <li>Make sure the website origin is listed under Allowed Origins below.</li>
            </ol>
          </div>

          <details className="group rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs">
            <summary className="flex cursor-pointer items-center justify-between rounded font-medium text-slate-600 outline-none transition hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#0052ff]/30">
              <span>Legacy snippet (without client-api-key)</span>
              <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-slate-500">For origin-only verification without client keys:</p>
              <CodeBlock tone="light">{legacySnippet}</CodeBlock>
            </div>
          </details>
        </div>
      </Panel>

      <ActionFormProvider action={saveDomainsAction}>
        <Panel
          title="Allowed Origins & Domain Verification"
          subtitle="Requests are rejected with 403 Forbidden unless they come from one of these origins."
          actions={
            permissions.canSetDomains && (
              <SubmitButton form="domains-form" pendingLabel="Saving…">
                Save Allowed Domains
              </SubmitButton>
            )
          }
        >
          {permissions.canSetDomains ? (
            <ActionForm id="domains-form" className="space-y-3">
              <TenantIdField tenantId={tenantId} />
              <TextArea
                label="Allowed origins (one per line)"
                name="domains"
                rows={4}
                defaultValue={data.domains.map((d) => d.origin).join('\n')}
                placeholder={'https://example.com\nhttps://app.example.com'}
              />
              <ActionMessage />
            </ActionForm>
          ) : (
            <MutedNote>Allowed domains are configured by platform administrators.</MutedNote>
          )}

          <div className="mt-4 space-y-2.5">
            <SectionHeading>Assigned domain status</SectionHeading>
            {data.domains.length === 0 ? (
              <p className="text-xs text-slate-500">No domains assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.domains.map((domain) => (
                  <DomainRow key={domain.origin} domain={domain} tenantId={tenantId} canVerify={permissions.canManage} />
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </ActionFormProvider>

      {permissions.canManage && suggestedEmbedToken && (
        <ActionFormProvider action={saveEmbedTokenAction}>
          <Panel
            title="Legacy Embed Token (Optional)"
            subtitle="Only needed if you use legacy domain session tokens instead of the client API key."
          >
            <ActionForm className="space-y-3">
              <TenantIdField tenantId={tenantId} />
              <Field
                label="Embed Token"
                name="embedToken"
                defaultValue={suggestedEmbedToken}
                required
                autoComplete="off"
                hint="A freshly generated token is pre-filled. Saving replaces the current legacy token."
              />
              <ActionMessage />
              <SubmitButton variant="dark" pendingLabel="Saving…">
                Save Legacy Token
              </SubmitButton>
            </ActionForm>
          </Panel>
        </ActionFormProvider>
      )}
    </>
  )
}

function DomainRow({
  domain,
  tenantId,
  canVerify,
}: {
  domain: TenantDetailData['domains'][number]
  tenantId: string
  canVerify: boolean
}) {
  const isVerified = domain.verificationStatus === 'verified'
  const token = domain.verificationToken
  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <ActionFormProvider action={verifyDomainAction}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="break-all font-mono text-xs font-semibold text-slate-900">{domain.origin}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={domain.verificationStatus} />
              <StatusBadge status={domain.status} />
            </div>
          </div>

          {canVerify && !isVerified && (
            <ActionForm className="flex flex-wrap items-center gap-2">
              <TenantIdField tenantId={tenantId} />
              <input type="hidden" name="origin" value={domain.origin} />
              <label className="sr-only" htmlFor={`method-${domain.origin}`}>
                Verification method for {domain.origin}
              </label>
              <select
                id={`method-${domain.origin}`}
                name="method"
                className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/15"
              >
                <option value="well-known">/.well-known file</option>
                <option value="meta-tag">HTML meta tag</option>
              </select>
              <SubmitButton size="sm" pendingLabel="Checking…">
                Verify Domain
              </SubmitButton>
            </ActionForm>
          )}
        </div>
        <ActionMessage />
      </ActionFormProvider>

      {!isVerified && token && (
        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Verification token</p>
          <CodeBlock tone="light">{token}</CodeBlock>
          <p className="text-xs leading-relaxed text-slate-500">
            Option A: upload the token to{' '}
            <span className="break-all font-mono text-slate-700">/.well-known/voice-agent-verification.txt</span>
            <br />
            Option B: add{' '}
            <span className="break-all font-mono text-slate-700">{`<meta name="voice-agent-verification" content="${token}">`}</span>{' '}
            to the homepage head.
          </p>
        </div>
      )}
    </li>
  )
}
