import { AdminPanel as Panel } from '@/components/admin/panel'
import { Field, TextArea } from '@/components/admin/form-fields'
import { ActionForm, ActionFormProvider, ActionMessage, SubmitButton } from '@/components/admin/action-form'
import { formatLabel } from '@/lib/admin/forms'
import { saveSettingsAction } from '../actions'
import type { TenantDetailData } from './types'

export function AgentTab({ data, canManage }: { data: TenantDetailData; canManage: boolean }) {
  const { settings } = data
  const readOnly = !canManage

  return (
    <ActionFormProvider action={saveSettingsAction}>
      <Panel
        title="Voice Agent Persona & Behavior"
        subtitle="Persona, tone, opening greeting, services, guardrails, and knowledge base for your AI support agent."
        actions={
          canManage && (
            <SubmitButton form="agent-settings-form" pendingLabel="Saving…">
              Save Agent Persona
            </SubmitButton>
          )
        }
      >
        <ActionForm id="agent-settings-form" className="space-y-3.5">
          <input type="hidden" name="tenantId" value={data.tenant.tenantId} />
          {readOnly && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              You have read-only access. A tenant owner or admin can change these settings.
            </p>
          )}

          <fieldset disabled={readOnly} className="space-y-3.5">
            <legend className="sr-only">Agent persona</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company / Brand Name" name="companyName" defaultValue={settings.companyName} required maxLength={120} />
              <Field label="Assistant Name" name="agentName" defaultValue={settings.agentName} required maxLength={80} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tone & Persona" name="tone" defaultValue={settings.tone} required maxLength={200} />
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Language Mode</span>
                <p className="mt-1 flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                  {formatLabel(settings.languageMode)}
                </p>
                <span className="mt-0.5 block text-xs text-slate-500">Managed by the platform.</span>
              </div>
            </div>

            <TextArea
              label="Opening Greeting (first spoken message)"
              name="greeting"
              rows={2}
              maxLength={500}
              defaultValue={settings.greeting}
              placeholder="Hello! How can I assist you today?"
            />

            <TextArea
              label="Services Offered (one per line)"
              name="services"
              rows={4}
              defaultValue={settings.services.join('\n')}
              placeholder={'Consulting\nProduct Support\nBilling Inquiries'}
            />

            <TextArea
              label="System Instructions & Guardrails"
              name="customInstructions"
              rows={5}
              maxLength={8000}
              defaultValue={settings.customInstructions}
              placeholder="You are a professional assistant for… Prefer concise, friendly answers."
            />

            <TextArea
              label="Knowledge Base (Topic | Content, one per line)"
              name="knowledgeBase"
              rows={6}
              defaultValue={settings.knowledgeBaseText}
              placeholder={'Pricing | Plans start from $49/mo\nHours | Mon-Fri 9am-6pm EST'}
              hint="Lines without a “|” separator are ignored."
            />
          </fieldset>

          <ActionMessage />
          {canManage && (
            <SubmitButton pendingLabel="Saving…" className="px-5">
              Save Agent Persona
            </SubmitButton>
          )}
        </ActionForm>
      </Panel>
    </ActionFormProvider>
  )
}
