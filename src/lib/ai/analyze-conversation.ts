import { z } from 'zod'
import { getOpenAIClient } from './client'
import type { TenantConfig } from '@/lib/tenants/types'
import type { ChatHistory, ConversationAnalysis, LeadData } from '@/types'

const nullableString = z.string().trim().min(1).nullable().catch(null)

const leadSchema = z.object({
  name: nullableString,
  email: nullableString,
  phone: nullableString,
  company: nullableString,
  country: nullableString,
  purpose: nullableString,
})

const analysisSchema = z.object({
  user: leadSchema,
  requirement: z.object({
    summary: z.string().trim().catch(''),
    detectedNeed: nullableString,
    servicesInterested: z.array(z.string().trim().min(1)).catch([]),
    urgency: z.enum(['high', 'medium', 'low', 'unknown']).catch('unknown'),
    budgetMentioned: z.boolean().catch(false),
    timelineMentioned: z.boolean().catch(false),
  }),
  classification: z.object({
    category: z.enum([
      'software_development',
      'ai_solution',
      'web_app',
      'mobile_app',
      'devops_cloud',
      'pricing_inquiry',
      'support_request',
      'partnership',
      'job_or_hiring',
      'general_inquiry',
      'other',
    ]).catch('other'),
    subcategory: nullableString,
    intent: z.enum([
      'buying_interest',
      'support',
      'information',
      'meeting_request',
      'complaint',
      'other',
    ]).catch('other'),
    leadQuality: z.enum(['hot', 'warm', 'cold', 'unknown']).catch('unknown'),
    sentiment: z.enum(['positive', 'neutral', 'negative']).catch('neutral'),
  }),
  nextSteps: z.array(z.string().trim().min(1)).catch([]),
})

function mergeLead(existing: LeadData, analyzed: LeadData): LeadData {
  return {
    name: analyzed.name ?? existing.name ?? null,
    email: analyzed.email ?? existing.email ?? null,
    phone: analyzed.phone ?? existing.phone ?? null,
    company: analyzed.company ?? existing.company ?? null,
    country: analyzed.country ?? existing.country ?? null,
    purpose: analyzed.purpose ?? existing.purpose ?? null,
  }
}

export function emptyLead(): LeadData {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    country: null,
    purpose: null,
  }
}

export function fallbackAnalysis(lead: LeadData, summary = ''): ConversationAnalysis {
  return {
    user: { ...emptyLead(), ...lead },
    requirement: {
      summary,
      detectedNeed: lead.purpose,
      servicesInterested: [],
      urgency: 'unknown',
      budgetMentioned: false,
      timelineMentioned: false,
    },
    classification: {
      category: 'other',
      subcategory: null,
      intent: 'other',
      leadQuality: 'unknown',
      sentiment: 'neutral',
    },
    nextSteps: [],
  }
}

function transcriptText(messages: ChatHistory, agentName: string): string {
  return messages
    .filter((message) => message.content !== '__GREET__')
    .map((message) => `${message.role === 'user' ? 'Visitor' : agentName}: ${message.content}`)
    .join('\n')
}

export async function analyzeConversation({
  tenant,
  lead,
  messages,
  summary,
}: {
  tenant: TenantConfig
  lead: LeadData
  messages: ChatHistory
  summary: string
}): Promise<ConversationAnalysis> {
  const openai = getOpenAIClient(tenant)
  const transcript = transcriptText(messages, tenant.agentName)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze completed website voice-agent conversations for ${tenant.companyName}.

Return only valid JSON with this exact shape:
{
  "user": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "company": string | null,
    "country": string | null,
    "purpose": string | null
  },
  "requirement": {
    "summary": string,
    "detectedNeed": string | null,
    "servicesInterested": string[],
    "urgency": "high" | "medium" | "low" | "unknown",
    "budgetMentioned": boolean,
    "timelineMentioned": boolean
  },
  "classification": {
    "category": "software_development" | "ai_solution" | "web_app" | "mobile_app" | "devops_cloud" | "pricing_inquiry" | "support_request" | "partnership" | "job_or_hiring" | "general_inquiry" | "other",
    "subcategory": string | null,
    "intent": "buying_interest" | "support" | "information" | "meeting_request" | "complaint" | "other",
    "leadQuality": "hot" | "warm" | "cold" | "unknown",
    "sentiment": "positive" | "neutral" | "negative"
  },
  "nextSteps": string[]
}

Use null when information is not available. Do not invent contact details. Choose one best category.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            knownLead: lead,
            existingSummary: summary,
            transcript,
            tenantServices: tenant.services,
          }),
        },
      ],
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const parsed = analysisSchema.parse(JSON.parse(raw))
    return {
      ...parsed,
      user: mergeLead(lead, parsed.user),
    }
  } catch (err) {
    console.error('[analyze-conversation]', err)
    return fallbackAnalysis(lead, summary)
  }
}
