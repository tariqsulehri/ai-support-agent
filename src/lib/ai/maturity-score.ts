import type { LeadData, LeadQuality, ConversationUrgency, ConversationSentiment } from '@/types'

export interface MaturityEvaluationInput {
  status?: string | null
  leadQuality?: LeadQuality | string | null
  urgency?: ConversationUrgency | string | null
  sentiment?: ConversationSentiment | string | null
  lead?: Partial<LeadData> | null
  user?: Partial<LeadData> | null
  messageCount?: number
  hasLead?: boolean
}

export interface MaturityResult {
  score: 1 | 2 | 3 | 4 | 5
  label: string
  stars: number
  description: string
  points: number
}

const MATURITY_LABELS: Record<number, { label: string; description: string }> = {
  5: {
    label: 'Enterprise Mature',
    description: 'High engagement, complete contact details, and closed-won or proposal stage.',
  },
  4: {
    label: 'High Intent / Sales Ready',
    description: 'Qualified lead with high urgency or hot interest and multi-turn discovery.',
  },
  3: {
    label: 'Qualified Prospect',
    description: 'Solid contact profile, active interest, and positive or neutral sentiment.',
  },
  2: {
    label: 'Active Discovery',
    description: 'Early engagement with basic contact information or inquiry details captured.',
  },
  1: {
    label: 'Initial Inquiry',
    description: 'Cold or preliminary contact with minimal qualification details.',
  },
}

/**
 * Server-side deterministic computation of lead maturity / engagement score (1 to 5 stars).
 * Evaluates multiple real signals: status lifecycle, lead quality classification, urgency,
 * sentiment, contact profile completeness, and conversation exchange depth.
 */
export function calculateMaturityScore(input: MaturityEvaluationInput): MaturityResult {
  let points = 0

  // 1. Status Lifecycle Progression (0 to 3 points)
  const status = (input.status || 'new').toLowerCase()
  if (status === 'won') points += 3.5
  else if (status === 'proposal') points += 3.0
  else if (status === 'qualified') points += 2.0
  else if (status === 'reviewing') points += 1.0
  else if (status === 'lost') points -= 1.0

  // 2. Lead Quality Classification (0 to 2 points)
  const quality = (input.leadQuality || 'unknown').toLowerCase()
  if (quality === 'hot') points += 2.0
  else if (quality === 'warm') points += 1.0
  else if (quality === 'cold') points -= 0.5

  // 3. Urgency Signal (0 to 1 point)
  const urgency = (input.urgency || 'unknown').toLowerCase()
  if (urgency === 'high') points += 1.0
  else if (urgency === 'medium') points += 0.5

  // 4. Sentiment Signal (-0.5 to +1 point)
  const sentiment = (input.sentiment || 'neutral').toLowerCase()
  if (sentiment === 'positive') points += 1.0
  else if (sentiment === 'negative') points -= 0.5

  // 5. Contact Profile Completeness (0 to 2.5 points)
  const leadData = input.lead ?? input.user ?? {}
  let fieldCount = 0
  if (leadData.name?.trim()) fieldCount++
  if (leadData.email?.trim()) fieldCount += 1.5
  if (leadData.phone?.trim()) fieldCount += 1.5
  if (leadData.company?.trim()) fieldCount++
  if (leadData.purpose?.trim()) fieldCount++

  if (fieldCount >= 4) points += 2.0
  else if (fieldCount >= 2) points += 1.0
  else if (fieldCount >= 1) points += 0.5

  // 6. Conversation Exchange Depth (0 to 1 point)
  const msgs = input.messageCount ?? 0
  if (msgs >= 8) points += 1.0
  else if (msgs >= 4) points += 0.5

  // Map continuous points into clean 1 to 5 integer star score
  let score: 1 | 2 | 3 | 4 | 5 = 1
  if (points >= 6.5) score = 5
  else if (points >= 4.5) score = 4
  else if (points >= 3.0) score = 3
  else if (points >= 1.5) score = 2
  else score = 1

  // Edge cases
  if (status === 'won') score = 5
  if (status === 'lost' && score > 2) score = 2

  const meta = MATURITY_LABELS[score]

  return {
    score,
    stars: score,
    label: meta.label,
    description: meta.description,
    points: Math.round(points * 10) / 10,
  }
}

