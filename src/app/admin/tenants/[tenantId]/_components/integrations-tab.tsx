import { AdminPanel as Panel } from '@/components/admin/panel'
import { CheckboxField, Field, TextArea } from '@/components/admin/form-fields'
import { ActionForm, ActionFormProvider, ActionMessage, SubmitButton } from '@/components/admin/action-form'
import { saveDatabaseUrlAction, saveEmailNotificationsAction, saveOpenAiKeyAction } from '../actions'
import { MutedNote, Pill, formatDate } from './ui'
import type { TenantDetailData } from './types'

const READ_ONLY_NOTE = 'Tenant owner or admin role required to change this.'

function SecretStatus({
  label,
  secret,
  emptyText,
}: {
  label: string
  secret: TenantDetailData['openAiSecret']
  emptyText: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 break-all font-mono text-xs font-semibold text-slate-900">
          {secret ? secret.maskedValue : emptyText}
        </p>
        {secret?.updatedAt && (
          <p className="mt-0.5 text-xs text-slate-500">Updated {formatDate(secret.updatedAt, true)}</p>
        )}
      </div>
      {secret ? <Pill tone="emerald">Configured</Pill> : <Pill tone="amber">Not set</Pill>}
    </div>
  )
}

export function IntegrationsTab({ data, canManage }: { data: TenantDetailData; canManage: boolean }) {
  const tenantId = data.tenant.tenantId
  const email = data.email

  return (
    <>
      <ActionFormProvider action={saveOpenAiKeyAction}>
        <Panel
          title="OpenAI API Key"
          subtitle="Encrypted with the server master key. Powers agent conversations and transcription."
        >
          <div className="space-y-4">
            <SecretStatus label="Current key" secret={data.openAiSecret} emptyText="Not configured" />
            {canManage ? (
              <ActionForm className="space-y-3" resetOnSuccess>
                <input type="hidden" name="tenantId" value={tenantId} />
                <Field
                  label={data.openAiSecret ? 'Replace OpenAI Key' : 'OpenAI Key'}
                  name="openaiApiKey"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="sk-…"
                />
                <ActionMessage />
                <SubmitButton pendingLabel="Encrypting…">Save OpenAI Key</SubmitButton>
              </ActionForm>
            ) : (
              <MutedNote>{READ_ONLY_NOTE}</MutedNote>
            )}
          </div>
        </Panel>
      </ActionFormProvider>

      <ActionFormProvider action={saveDatabaseUrlAction}>
        <Panel
          title="Dedicated Lead Database"
          subtitle="Store transcripts, leads, and recordings in this tenant's own MongoDB cluster."
        >
          <div className="space-y-4">
            <SecretStatus
              label="Connection string"
              secret={data.databaseUrlSecret}
              emptyText="None (using platform database)"
            />
            {canManage ? (
              <ActionForm className="space-y-3" resetOnSuccess>
                <input type="hidden" name="tenantId" value={tenantId} />
                <Field
                  label="MongoDB Connection URI"
                  name="databaseUrl"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="mongodb+srv://…"
                />
                <ActionMessage />
                <SubmitButton pendingLabel="Encrypting…">Save Database URL</SubmitButton>
              </ActionForm>
            ) : (
              <MutedNote>{READ_ONLY_NOTE}</MutedNote>
            )}
          </div>
        </Panel>
      </ActionFormProvider>

      <ActionFormProvider action={saveEmailNotificationsAction}>
        <Panel
          title="SMTP Email Notifications"
          subtitle="Sends call transcripts and captured leads to your team when a conversation completes."
          actions={
            canManage && (
              <SubmitButton form="smtp-form" pendingLabel="Saving…">
                Save SMTP Settings
              </SubmitButton>
            )
          }
        >
          {canManage ? (
            <ActionForm id="smtp-form" className="space-y-4">
              <input type="hidden" name="tenantId" value={tenantId} />

              <div className="grid gap-3 sm:grid-cols-2">
                <CheckboxField label="Enable email notifications" name="enabled" defaultChecked={email?.enabled ?? false} />
                <CheckboxField label="Use secure SMTP (SSL/TLS)" name="secure" defaultChecked={email?.secure ?? true} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Service Provider" name="service" defaultValue={email?.service ?? 'gmail'} />
                <Field label="SMTP Host" name="host" defaultValue={email?.host ?? 'smtp.gmail.com'} />
                <Field
                  label="SMTP Port"
                  name="port"
                  type="number"
                  min={1}
                  max={65535}
                  inputMode="numeric"
                  defaultValue={email?.port || '465'}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="SMTP User"
                  name="user"
                  type="email"
                  autoComplete="off"
                  defaultValue={email?.user || email?.fromEmail || ''}
                />
                <Field
                  label="SMTP Password / App Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={data.smtpPasswordSecret ? 'Saved — leave blank to keep' : ''}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="From Display Name"
                  name="fromName"
                  defaultValue={email?.fromName || `${data.tenant.companyName} Voice Agent`}
                />
                <Field label="From Email Address" name="fromEmail" type="email" defaultValue={email?.fromEmail ?? ''} />
              </div>

              <TextArea
                label="Lead Summary Recipients (one per line)"
                name="recipients"
                rows={3}
                defaultValue={(email?.recipients ?? []).join('\n')}
                placeholder={'sales@example.com\nlead-inbox@example.com'}
              />

              <CheckboxField
                label="Send summary email to the captured lead"
                name="sendToLeadEmail"
                defaultChecked={email?.sendToLeadEmail ?? false}
              />

              <ActionMessage />
              <SubmitButton pendingLabel="Saving…" className="px-5">
                Save SMTP Settings
              </SubmitButton>
            </ActionForm>
          ) : (
            <MutedNote>{READ_ONLY_NOTE}</MutedNote>
          )}
        </Panel>
      </ActionFormProvider>
    </>
  )
}
