'use server'

import { revalidatePath } from 'next/cache'
import { canMutateDashboard, dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'
import { updateCallRecordManagement, updateCallRecordStatus, type LeadStatus } from '@/lib/db/call-records'
import { statusOptions } from './constants'

export async function updateStatusAction(formData: FormData) {
  const session = await getVerifiedSession()
  if (!session || !canMutateDashboard(session)) return

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as LeadStatus
  if (statusOptions.includes(status)) {
    await updateCallRecordStatus(id, status, dashboardScopeForSession(session))
    revalidatePath('/dashboard')
  }
}

export async function updateManagementAction(formData: FormData) {
  const session = await getVerifiedSession()
  if (!session || !canMutateDashboard(session)) return

  await updateCallRecordManagement({
    id: String(formData.get('id') ?? ''),
    owner: String(formData.get('owner') ?? ''),
    followUpAt: String(formData.get('followUpAt') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    scope: dashboardScopeForSession(session),
  })
  revalidatePath('/dashboard')
}
