import { AdminPanel as Panel } from '@/components/admin/panel'
import { Field, SelectField } from '@/components/admin/form-fields'
import { ActionForm, ActionFormProvider, ActionMessage, SubmitButton } from '@/components/admin/action-form'
import { formatLabel } from '@/lib/admin/forms'
import { createTenantUserAction } from '../actions'
import { Pill, SectionHeading } from './ui'
import type { TenantDetailData } from './types'

const TENANT_ROLES = [
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'tenant_viewer', label: 'Tenant Viewer (read-only)' },
]
const PLATFORM_ROLES = [...TENANT_ROLES, { value: 'tenant_owner', label: 'Tenant Owner' }]

export function TeamTab({
  data,
  canManage,
  isPlatformAdmin,
}: {
  data: TenantDetailData
  canManage: boolean
  isPlatformAdmin: boolean
}) {
  return (
    <ActionFormProvider action={createTenantUserAction}>
      <Panel
        title="Team Members & Role Access"
        subtitle="People with access to this tenant's agent and dashboard."
        badge={<Pill tone="blue">{data.users.length}</Pill>}
      >
        {data.users.length === 0 ? (
          <p className="text-xs text-slate-500">No team members assigned yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.users.map((user) => (
              <li
                key={user.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{user.name || user.email}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-500">{user.email}</p>
                </div>
                <Pill tone="indigo">{formatLabel(user.role)}</Pill>
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3">
              <SectionHeading>Add team member</SectionHeading>
            </div>
            <ActionForm className="space-y-3.5" resetOnSuccess>
              <input type="hidden" name="tenantId" value={data.tenant.tenantId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full Name" name="name" autoComplete="off" maxLength={120} />
                <Field label="Email Address" name="email" type="email" required autoComplete="off" maxLength={254} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Temporary Password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  hint="At least 8 characters. Share it securely."
                />
                <SelectField
                  label="Role"
                  name="role"
                  options={isPlatformAdmin ? PLATFORM_ROLES : TENANT_ROLES}
                  defaultValue="tenant_admin"
                />
              </div>
              <ActionMessage />
              <SubmitButton pendingLabel="Adding…">+ Add Team Member</SubmitButton>
            </ActionForm>
          </div>
        )}
      </Panel>
    </ActionFormProvider>
  )
}
