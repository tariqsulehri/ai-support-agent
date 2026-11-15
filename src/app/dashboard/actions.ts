'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { canMutateDashboard, dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'
import { updateCallRecordManagement, updateCallRecordStatus } from '@/lib/db/call-records'
import { statusOptions } from './constants'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record id.')

const statusSchema = z.object({
  id: objectId,
  status: z.enum(statusOptions as [string, ...string[]]),
})

const managementSchema = z.object({
  id: objectId,
  owner: z.string().trim().max(120, 'Owner must be 120 characters or fewer.'),
  followUpAt: z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(new Date(v).getTime()), 'Invalid follow-up date.'),
  notes: z.string().trim().max(5000, 'Notes must be 5000 characters or fewer.'),
})

type AuthResult =
  | { ok: true; scope: ReturnType<typeof dashboardScopeForSession> }
  | { ok: false; error: string }

async function authorize(): Promise<AuthResult> {
  const session = await getVerifiedSession()
  if (!session) return { ok: false, error: 'Your session has expired. Please sign in again.' }
  if (!canMutateDashboard(session)) return { ok: false, error: 'You have read-only access to this workspace.' }
  return { ok: true, scope: dashboardScopeForSession(session) }
}

const field = (formData: FormData, key: string) => String(formData.get(key) ?? '')

export async function updateStatusAction(formData: FormData): Promise<ActionResult> {
  const auth = await authorize()
  if (!auth.ok) return auth

  const parsed = statusSchema.safeParse({ id: field(formData, 'id'), status: field(formData, 'status') })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const result = await updateCallRecordStatus(
    parsed.data.id,
    parsed.data.status as (typeof statusOptions)[number],
    auth.scope
  )
  if (!result.saved) return { ok: false, error: result.error ?? 'Could not update status.' }

  revalidatePath('/dashboard')
  return { ok: true }
}

/** useActionState-compatible signature: (previousState, formData). */
export async function updateManagementAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize()
  if (!auth.ok) return auth

  const parsed = managementSchema.safeParse({
    id: field(formData, 'id'),
    owner: field(formData, 'owner'),
    followUpAt: field(formData, 'followUpAt'),
    notes: field(formData, 'notes'),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const result = await updateCallRecordManagement({ ...parsed.data, scope: auth.scope })
  if (!result.saved) return { ok: false, error: result.error ?? 'Could not save the lead plan.' }

  revalidatePath('/dashboard')
  return { ok: true, message: 'Lead plan saved.' }
}
