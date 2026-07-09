import type { LeadData } from '@/types'

const LEAD_RE = /\[LEAD:\s*\{[\s\S]*?\}\]/g

export function stripLead(text: string): string {
  return text.replace(LEAD_RE, '').trim()
}

export function stripLeadForDisplay(text: string): string {
  return text
    .replace(LEAD_RE, '')
    .replace(/\[LEAD:[\s\S]*$/g, '')
    .trimEnd()
}

export function stripEndCall(text: string): string {
  return text.replace(/\[END_CALL\]/g, '').trim()
}

export function displayText(text: string): string {
  return stripEndCall(stripLeadForDisplay(text))
}

export function extractLead(text: string): Record<string, string | null> | null {
  const match = text.match(/\[LEAD:(\{[\s\S]*?\})\]/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        if (typeof value !== 'string') return [key, value ?? null]
        const trimmed = value.trim()
        return [key, !trimmed || trimmed.toLowerCase() === 'null' ? null : trimmed]
      })
    ) as Record<string, string | null>
  } catch {
    return null
  }
}

export function hasRequiredLead(lead: Partial<LeadData> | null): boolean {
  return Boolean(lead?.name && lead.email && lead.phone && lead.country)
}

export function userWantsToEnd(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return [
    'bye',
    'goodbye',
    'thank you',
    'thanks',
    'no thank you',
    'no. thank you',
    "that's all",
    'that is all',
    'nothing else',
    'no more',
  ].some((phrase) => normalized.includes(phrase))
}

export function assistantClosed(text: string): boolean {
  const normalized = text.toLowerCase()
  return [
    'have a great day',
    'have a nice day',
    'reach out to you soon',
    'will reach out',
    "we'll reach out",
    'thank you for providing your details',
    "you're welcome",
  ].some((phrase) => normalized.includes(phrase))
}
