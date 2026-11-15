import type { DashboardSignalCounts } from './types'

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/**
 * Deterministic, data-derived recommendations. Every sentence is computed from
 * aggregate counts over the whole filtered set (not just the visible page).
 */
export function buildRecommendations(c: DashboardSignalCounts): string[] {
  if (c.filteredCalls === 0) {
    return ['No conversations match the current filters yet. Widen the date range or confirm the agent is capturing calls.']
  }

  const out: string[] = []
  const captureRate = Math.round((c.callsWithLead / c.filteredCalls) * 100)

  if (c.hotOpen > 0) {
    out.push(`Prioritize ${c.hotOpen} hot ${plural(c.hotOpen, 'lead')} not yet won or lost — assign an owner and follow up the same business day.`)
  }
  if (c.highUrgencyOpen > 0) {
    out.push(`${c.highUrgencyOpen} high-urgency ${plural(c.highUrgencyOpen, 'conversation')} still open; timeline pressure was detected.`)
  }
  if (captureRate < 70) {
    out.push(`Lead capture rate is ${captureRate}%. Tighten the agent prompt around name, email, phone, company and purpose before closing calls.`)
  }
  if (c.emailFailures > 0) {
    out.push(`${c.emailFailures} summary ${plural(c.emailFailures, 'email')} failed. Check SMTP credentials and recipient rules.`)
  }
  if (c.averageMessages > 0 && c.averageMessages < 4) {
    out.push(`Average conversation depth is ${c.averageMessages} messages. Review greeting and discovery questions to improve qualification.`)
  }

  return out.length ? out.slice(0, 5) : ['No action items — lead capture, delivery and follow-up signals are healthy for this period.']
}

export function buildRiskSignals(c: DashboardSignalCounts): string[] {
  const out: string[] = []
  if (c.negativeSentiment) out.push(`${c.negativeSentiment} ${plural(c.negativeSentiment, 'conversation')} had negative sentiment and should be reviewed.`)
  if (c.complaints) out.push(`${c.complaints} complaint-intent ${plural(c.complaints, 'conversation')} may need escalation.`)
  if (c.staleNew) out.push(`${c.staleNew} new ${plural(c.staleNew, 'lead')} ${c.staleNew === 1 ? 'is' : 'are'} older than 24 hours with no status change.`)
  if (c.emailFailures) out.push(`${c.emailFailures} ${plural(c.emailFailures, 'record')} show email delivery errors.`)
  return out.length ? out.slice(0, 5) : ['No risk signals detected for the current filters.']
}

/**
 * Weighted readiness score (0–100): hot leads count double, plus pipeline movement and lead capture.
 */
export function conversionReadiness(c: Pick<DashboardSignalCounts, 'filteredCalls' | 'hotLeads' | 'qualifiedPipeline' | 'callsWithLead'>): number {
  if (!c.filteredCalls) return 0
  return Math.min(
    100,
    Math.round(((c.hotLeads * 2 + c.qualifiedPipeline + c.callsWithLead) / (c.filteredCalls * 4)) * 100)
  )
}
