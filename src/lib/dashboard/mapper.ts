import { calculateMaturityScore } from '@/lib/ai/maturity-score'
import type { LeadData } from '@/types'
import type { DashboardCall, RawRecord } from './types'

export function normalizeLead(input: Partial<LeadData> | undefined): LeadData {
  return {
    name: input?.name ?? null,
    email: input?.email ?? null,
    phone: input?.phone ?? null,
    company: input?.company ?? null,
    country: input?.country ?? null,
    purpose: input?.purpose ?? null,
  }
}

export function hasLead(lead: LeadData): boolean {
  return Object.values(lead).some((value) => Boolean(value?.trim()))
}

function safeDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function dateString(value: unknown): string {
  return (safeDate(value) ?? new Date(0)).toISOString()
}

function optionalDateString(value: unknown): string | null {
  return safeDate(value)?.toISOString() ?? null
}

export function toDashboardCall(record: RawRecord): DashboardCall {
  const lead = normalizeLead(record.lead ?? record.user)
  const classification = record.classification
  const requirement = record.requirement
  const transcript = Array.isArray(record.transcript) ? record.transcript : []
  const messageCount =
    typeof record.messageCount === 'number' ? record.messageCount : transcript.length

  const maturity =
    typeof record.maturityScore === 'number' && record.maturityLabel
      ? { score: record.maturityScore, label: record.maturityLabel }
      : calculateMaturityScore({
          status: record.status,
          leadQuality: classification?.leadQuality,
          urgency: requirement?.urgency,
          sentiment: classification?.sentiment,
          lead,
          messageCount,
          hasLead: record.hasLead ?? hasLead(lead),
        })

  return {
    id: record._id.toString(),
    tenantId: record.tenant?.id ?? 'unknown',
    companyName: record.tenant?.companyName ?? 'Unknown tenant',
    lead,
    status: record.status?.trim() || 'new',
    leadQuality: classification?.leadQuality ?? 'unknown',
    intent: classification?.intent ?? 'other',
    urgency: requirement?.urgency ?? 'unknown',
    sentiment: classification?.sentiment ?? 'neutral',
    category: classification?.category ?? 'other',
    servicesInterested: requirement?.servicesInterested ?? [],
    summary: record.callSummary?.summary ?? record.summary?.text ?? 'No summary captured.',
    keyPoints: record.callSummary?.keyPoints ?? record.summary?.keyPoints ?? [],
    nextSteps: record.callSummary?.nextSteps ?? [],
    transcript,
    messageCount,
    emailSent: Boolean(record.email?.sent),
    emailError: record.email?.error ?? null,
    finalizedAt: optionalDateString(record.finalizedAt),
    owner: record.owner?.trim() || null,
    followUpAt: optionalDateString(record.followUpAt),
    notes: record.notes?.trim() || null,
    statusHistory: (record.statusHistory ?? []).map((item) => ({
      status: item.status ?? 'unknown',
      changedAt: dateString(item.changedAt),
    })),
    createdAt: dateString(record.createdAt),
    updatedAt: dateString(record.updatedAt),
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
  }
}
