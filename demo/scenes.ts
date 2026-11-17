/**
 * Single source of truth for the AI Scripto demo video (≈3.5-4 minutes):
 *   1. Brand intro → the problem (without an AI support agent) → the effect after deploying it
 *   2. 30-second website conversation
 *   3. Multi-tenant admin (brief: Tenant Management only)
 *   4. Tenant portal in detail: overview, conversations, leads, insights, filters/export, setup
 *   5. Contact card (demo link + support email)
 *
 * Card scenes (`card: true`) are rendered by Remotion (demo/remotion), the rest are screen
 * recordings (demo/record.ts). voiceover.ts narrates every scene; build-video.ts assembles
 * them in this order. Everything shown in the product is fictional US demo data.
 */

export type SceneId =
  | 'intro' | 'problem' | 'solution'
  | 'chat-open' | 'chat-ask' | 'chat-booked'
  | 'admin-tenants'
  | 'tenant-login' | 'tenant-overview' | 'tenant-conversations' | 'tenant-leads' | 'tenant-insights' | 'tenant-filters' | 'tenant-setup'
  | 'cta'

export interface Scene {
  id: SceneId
  part: string
  title: string
  minSeconds: number
  caption: string
  onScreen: string
  action: string
  voiceover: string
  card?: boolean
}

export const BRAND = {
  company: 'AI Scripto',
  product: 'AI Support Voice & Chatbot',
  tagline: 'Every customer answered. Every lead captured. 24/7.',
  cta: 'See it on your website',
  ctaUrl: 'www.aiscripto.com/ai-support-voice-chatbot',
  email: 'Support@aiscripto.com',
  primary: '#1800AD', // AI Scripto indigo (from the logo)
  blue: '#2563eb',
  accent: '#4CBAAB',
} as const

/** Card copy, shared by Remotion and the ffmpeg fallback cards. */
export const PROBLEMS = [
  'Calls after hours go straight to voicemail',
  'Website visitors wait hours for a reply',
  'Leads leave without their contact details',
  'No visibility into what customers ask for',
] as const

export const BENEFITS = [
  'Every visitor answered in seconds, 24/7',
  'Name, phone & email captured automatically',
  'Instant conversation summaries for your team',
  'One dashboard for every conversation & lead',
] as const

export const SCENES: Scene[] = [
  // ── 1. Brand, problem, effect ───────────────────────────────────────────────
  {
    id: 'intro', part: 'AI Scripto', title: 'Brand intro', minSeconds: 5, card: true,
    caption: 'AI Support Voice & Chatbot', onScreen: 'AI Scripto logo + product name.', action: 'Remotion card.',
    voiceover: 'AI Scripto presents the AI Support Voice and Chatbot.',
  },
  {
    id: 'problem', part: 'The problem', title: 'Without an AI support agent', minSeconds: 18, card: true,
    caption: 'Without an AI support agent', onScreen: 'Four pain points appear one by one with red markers.', action: 'Remotion card.',
    voiceover:
      "Without an AI support agent, here's what really happens. Calls after hours go straight to voicemail. " +
      'Website visitors wait hours for a reply, so they contact your competitor instead. ' +
      'Leads leave without their contact details, and you never really know what customers are asking for. ' +
      'Every missed conversation is lost revenue.',
  },
  {
    id: 'solution', part: 'The solution', title: 'After deploying AI Scripto', minSeconds: 16, card: true,
    caption: 'After deploying AI Scripto', onScreen: 'Four benefits appear with green checks.', action: 'Remotion card.',
    voiceover:
      "Now, deploy AI Scripto's AI Support Voice and Chatbot. Every visitor gets an answer in seconds, day or night, by voice or chat. " +
      'Contact details are captured automatically, your team receives an instant summary, ' +
      "and every conversation and lead lives in one simple dashboard. Let's see it in action.",
  },

  // ── 2. Website conversation (30 s) ──────────────────────────────────────────
  {
    id: 'chat-open', part: 'Live on your website', title: 'Visitor arrives', minSeconds: 6,
    caption: 'A homeowner visits the website', onScreen: 'Summit Pro Home Services site; click "Chat with us".', action: 'Open site, click launcher.',
    voiceover: 'A homeowner in Plano, Texas, visits a home services website. The assistant greets them instantly.',
  },
  {
    id: 'chat-ask', part: 'Live on your website', title: 'Real answers', minSeconds: 11,
    caption: 'Instant answers, 24/7', onScreen: 'AC question; reply with quick check and a 2-4 PM slot.', action: 'Type, send, reply streams.',
    voiceover: 'They describe the problem in their own words, and get a helpful answer with an open appointment today.',
  },
  {
    id: 'chat-booked', part: 'Live on your website', title: 'Lead captured', minSeconds: 13,
    caption: 'Lead captured and summarized automatically', onScreen: 'Contact details card + conversation summary.', action: 'Send details; scroll to summary.',
    voiceover: 'Name, phone, email and address are captured automatically, the job is booked, and a summary is ready for the team. All in under thirty seconds.',
  },

  // ── 3. Multi-tenant admin (brief) ───────────────────────────────────────────
  {
    id: 'admin-tenants', part: 'Multi-tenant admin', title: 'Tenant Management', minSeconds: 18,
    caption: 'One console manages every client business',
    onScreen: 'Admin signs in; Tenant Management tiles; Registered Tenants list with plans, keys and status.',
    action: 'Sign in as platform admin; hover tiles; open Tenants tab; filter Active/Disabled.',
    voiceover:
      'For agencies and multi-location brands, one admin console manages every client. ' +
      'Tenant Management shows each business, its plan, setup and status, and each tenant’s data stays completely private.',
  },

  // ── 4. Tenant portal in detail ──────────────────────────────────────────────
  {
    id: 'tenant-login', part: 'Tenant portal', title: 'Business owner signs in', minSeconds: 8,
    caption: 'Each business gets its own private portal', onScreen: 'Tenant sign-in.', action: 'Sign in with the tenant owner login.',
    voiceover: "Now let's step into the business owner's own portal.",
  },
  {
    id: 'tenant-overview', part: 'Tenant portal · Overview', title: 'Overview', minSeconds: 16,
    caption: 'Conversations, leads, pipeline and growth',
    onScreen: 'KPI cards: conversations, lead capture, hot leads, pipeline, overdue follow-ups; monthly growth; demand mix.',
    action: 'Hover KPI cards; scroll to charts.',
    voiceover:
      'The overview shows the numbers that matter: total conversations, how many visitors left their contact details, ' +
      'hot leads ready to buy, the sales pipeline and overdue follow-ups, plus month-over-month growth.',
  },
  {
    id: 'tenant-conversations', part: 'Tenant portal · Conversations', title: 'Every conversation saved', minSeconds: 20,
    caption: 'Summaries, sentiment, intent and full transcripts',
    onScreen: 'Call transcripts: AI summary, key points, intent, sentiment, urgency, email-sent badge; transcript expanded; search.',
    action: 'Open Call transcripts; expand a transcript; search "water heater".',
    voiceover:
      'Under Call Transcripts, every voice and chat conversation is saved. Each one has an AI summary, key points, ' +
      "the customer's intent, sentiment and urgency, and the complete transcript. And you can search them all in seconds.",
  },
  {
    id: 'tenant-leads', part: 'Tenant portal · Leads', title: 'Lead pipeline', minSeconds: 20,
    caption: 'Assign, follow up and track every lead',
    onScreen: 'Lead pipeline: captured/hot/pipeline/overdue tiles; Mike Johnson lead workspace; status Qualified; owner and note.',
    action: 'Open Lead pipeline on the hero lead; set status, owner, note; save; scroll to funnel.',
    voiceover:
      "The Lead Pipeline turns conversations into revenue. Open today's lead from Plano: contact details, AI-suggested next steps and the full context. " +
      'Mark it qualified, assign it to dispatch, add a note, and track every stage from new to won.',
  },
  {
    id: 'tenant-insights', part: 'Tenant portal · AI insights', title: 'What to do next', minSeconds: 14,
    caption: 'Recommendations, risk signals, call-back queue',
    onScreen: 'AI insights: recommendations, risk signals, priority follow-up queue.', action: 'Open AI insights; scroll.',
    voiceover: 'AI Insights tells your team what to do next: smart recommendations, risk signals like unhappy customers, and a priority list of who to call back first.',
  },
  {
    id: 'tenant-filters', part: 'Tenant portal · Reports', title: 'Filter and export', minSeconds: 10,
    caption: 'Filter, search and export to your CRM',
    onScreen: 'Filter quality = Hot; hover Export CSV.', action: 'Choose Hot in the quality filter; hover Export CSV.',
    voiceover: 'Filter by date, status, lead quality or urgency, and export everything to a spreadsheet or your CRM in one click.',
  },
  {
    id: 'tenant-setup', part: 'Tenant portal · Agent setup', title: 'Their assistant, their way', minSeconds: 13,
    caption: 'Greeting, tone, services and knowledge base',
    onScreen: 'Agent persona: tone, greeting, services, instructions, knowledge base.', action: 'Open agent settings; scroll.',
    voiceover: 'And in Agent Setup, the owner controls the greeting, the tone, their services and the knowledge base, so the assistant always sounds like their business.',
  },

  // ── 5. Contact ──────────────────────────────────────────────────────────────
  {
    id: 'cta', part: 'Contact AI Scripto', title: 'Contact', minSeconds: 13, card: true,
    caption: 'Book your free demo',
    onScreen: 'AI Scripto logo, demo link and support email.', action: 'Remotion card.',
    voiceover:
      'Ready to stop missing customers? Book your free demo at aiscripto dot com, or email support at aiscripto dot com. ' +
      'AI Scripto. Every customer answered, every lead captured.',
  },
]

export const RECORDED_SCENES = SCENES.filter((s) => !s.card)
