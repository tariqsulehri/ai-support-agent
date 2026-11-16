/**
 * Single source of truth for the demo video (≈3.5 minutes):
 *   Part 1  Website conversation, 30 s (visitor → assistant → lead captured → summary)
 *   Part 2  Platform admin: multi-tenant console, tenant detail, plans, onboarding, cross-tenant dashboard
 *   Part 3  Tenant (business owner) dashboard: KPIs, transcripts, lead pipeline, insights, setup
 *   Part 4  Call to action
 *
 * voiceover.ts reads `voiceover`, record.ts holds each scene for max(minSeconds, narration),
 * build-video.ts and Remotion read `caption` / `part`. Everything shown is fictional US data.
 */

export type SceneId =
  | 'chat-open' | 'chat-ask' | 'chat-booked'
  | 'admin-login' | 'admin-overview' | 'admin-tenants' | 'admin-tenant-detail' | 'admin-subscriptions' | 'admin-create' | 'admin-dashboard'
  | 'tenant-login' | 'tenant-overview' | 'tenant-transcripts' | 'tenant-pipeline' | 'tenant-insights' | 'tenant-setup'
  | 'cta'

export interface Scene {
  id: SceneId
  part: 'Website conversation' | 'Platform admin' | 'Tenant dashboard' | 'Call to action'
  title: string
  minSeconds: number
  caption: string
  onScreen: string
  action: string
  voiceover: string
  card?: boolean
}

export const BRAND = {
  product: 'AI Front Desk',
  demoCompany: 'Summit Pro Home Services',
  cta: 'Book a free 15-minute demo',
  ctaSub: 'For your business, or white-labeled for your clients.',
  ctaUrl: 'yourdomain.com/demo', // TODO: your booking link (Calendly, HubSpot, etc.)
  primary: '#194ad9',
  accent: '#4CBAAB',
} as const

export const SCENES: Scene[] = [
  // ── Part 1: 30-second website conversation ──────────────────────────────────
  {
    id: 'chat-open', part: 'Website conversation', title: 'Visitor arrives', minSeconds: 6,
    caption: 'A homeowner visits the website',
    onScreen: 'Summit Pro Home Services website (HVAC, plumbing, electrical); "Chat with us" launcher.',
    action: 'Open site, hover the hero, click "Chat with us"; greeting appears.',
    voiceover: "A homeowner in Plano, Texas lands on Summit Pro's website. Riley, their AI assistant, greets them instantly.",
  },
  {
    id: 'chat-ask', part: 'Website conversation', title: 'Real answers', minSeconds: 11,
    caption: 'Instant answers, 24/7',
    onScreen: 'Visitor types "AC stopped cooling, 98 degrees"; Riley replies with a safety check and a 2-4 PM slot.',
    action: 'Type the question, send, reply streams in.',
    voiceover: 'They describe the problem in their own words, and Riley answers with a quick fix to try and an open time slot today.',
  },
  {
    id: 'chat-booked', part: 'Website conversation', title: 'Lead captured, job booked', minSeconds: 13,
    caption: 'Lead captured and summarized automatically',
    onScreen: 'Visitor sends contact details; Contact Details card fills; conversation summary appears.',
    action: 'Type details, send; scroll to Contact Details and Conversation Summary.',
    voiceover: 'Name, phone, email and address are captured automatically, the job is booked, and the team gets a summary. All in under thirty seconds.',
  },

  // ── Part 2: Platform admin (multi-tenant) ───────────────────────────────────
  {
    id: 'admin-login', part: 'Platform admin', title: 'One console for every client', minSeconds: 8,
    caption: 'Platform admin console',
    onScreen: 'Admin sign-in page.', action: 'Type admin email and password, sign in.',
    voiceover: "Now let's look behind the scenes. As the platform owner, you sign in to one admin console.",
  },
  {
    id: 'admin-overview', part: 'Platform admin', title: 'Platform overview', minSeconds: 12,
    caption: 'Every business on the platform at a glance',
    onScreen: 'Active / Disabled / Archived / OpenAI-ready tiles; tenant status donut; platform usage bars.',
    action: 'Hover the stat tiles and charts.',
    voiceover: 'From here you manage every business on the platform: who is active, who is paused, and how much each one is using the assistant.',
  },
  {
    id: 'admin-tenants', part: 'Platform admin', title: 'Tenant directory', minSeconds: 15,
    caption: 'Each client is a separate, isolated tenant',
    onScreen: 'Tenants table: Dallas HVAC, Austin plumbing, Atlanta electrical, Phoenix HVAC, Chicago dental...; search and status filter.',
    action: 'Open Tenants tab, type "plumb" in search, clear, click Disabled filter, then All.',
    voiceover:
      'Each client company is its own tenant: a home services company in Dallas, a plumber in Austin, an electrician in Atlanta, a dental office in Chicago. ' +
      'Search, filter, and see each plan and setup status at a glance.',
  },
  {
    id: 'admin-tenant-detail', part: 'Platform admin', title: 'Inside a tenant', minSeconds: 18,
    caption: 'Readiness, embed code, assistant, team',
    onScreen: 'Summit Pro tenant: Overview & Readiness, Website Embed (masked key), Agent, Integrations, Team tabs.',
    action: 'Open Summit Pro; click through Embed, Agent and Team tabs.',
    voiceover:
      "Open any tenant to see its readiness, the website code to install, the assistant's personality and knowledge, and its team logins. " +
      "Each tenant's conversations and keys are kept completely separate.",
  },
  {
    id: 'admin-subscriptions', part: 'Platform admin', title: 'Plans & billing', minSeconds: 9,
    caption: 'Trials, plans and billing cycles',
    onScreen: 'Subscriptions table: trial, starter, growth, enterprise; monthly/yearly.',
    action: 'Open Subscriptions tab, scroll.',
    voiceover: 'Plans are managed here too: free trials, starter, growth and enterprise, billed monthly or yearly.',
  },
  {
    id: 'admin-create', part: 'Platform admin', title: 'Onboard a client in a minute', minSeconds: 16,
    caption: 'Onboard a new client in about a minute',
    onScreen: 'Create Tenant form filled for "Gulf Coast Electric"; tenant created.',
    action: 'Open Create Tenant, fill ID, company, assistant name, services, domain; click Create.',
    voiceover: 'Onboarding a new client takes about a minute. Enter the company, its services and website, and their assistant is ready to install.',
  },
  {
    id: 'admin-dashboard', part: 'Platform admin', title: 'All clients, one dashboard', minSeconds: 13,
    caption: 'Conversations and leads across all clients',
    onScreen: 'Platform dashboard: KPIs across all tenants; Tenants control center.',
    action: 'Click Dashboard; hover KPIs; open the Tenants tab.',
    voiceover: 'And the platform dashboard rolls up conversations and leads across all of your clients in one view.',
  },

  // ── Part 3: Tenant dashboard ────────────────────────────────────────────────
  {
    id: 'tenant-login', part: 'Tenant dashboard', title: "The business owner's view", minSeconds: 8,
    caption: "Your client's private dashboard",
    onScreen: 'Tenant sign-in page.', action: 'Sign out; sign in with the tenant owner login.',
    voiceover: "Now switch to your client's side. The business owner signs in to their own private dashboard.",
  },
  {
    id: 'tenant-overview', part: 'Tenant dashboard', title: 'Performance at a glance', minSeconds: 14,
    caption: 'Conversations, leads and growth',
    onScreen: 'Overview: conversations, lead capture, hot leads, readiness; 6-month growth; service demand.',
    action: 'Hover KPI cards; scroll to charts.',
    voiceover: 'They see exactly how their website is performing: conversations, lead capture rate, hot leads and month over month growth.',
  },
  {
    id: 'tenant-transcripts', part: 'Tenant dashboard', title: 'Every conversation saved', minSeconds: 15,
    caption: 'Search every conversation in seconds',
    onScreen: 'Call transcripts list; search "water heater"; summaries and transcript previews.',
    action: 'Open Call transcripts, search "water heater", scroll results.',
    voiceover: 'Every conversation is saved with a summary, key points and the full transcript, and it is searchable in seconds.',
  },
  {
    id: 'tenant-pipeline', part: 'Tenant dashboard', title: 'Work the lead', minSeconds: 16,
    caption: 'Assign, schedule follow-ups, track every job',
    onScreen: "Lead pipeline on Mike Johnson's AC lead; status New → Qualified; owner and notes saved.",
    action: 'Open Lead pipeline on the hero lead; set status, owner, notes; save.',
    voiceover: "Today's AC lead from Plano is right at the top. Assign it to dispatch, add a note, and move it through the pipeline.",
  },
  {
    id: 'tenant-insights', part: 'Tenant dashboard', title: 'What needs attention', minSeconds: 11,
    caption: 'Smart reminders and one-click CSV export',
    onScreen: 'AI insights: recommendations, risk signals, priority follow-up queue; Export CSV.',
    action: 'Open AI insights; scroll; hover Export CSV.',
    voiceover: 'Smart insights flag overdue callbacks and hot leads, so the right customer gets a call first. And everything exports to your CRM in one click.',
  },
  {
    id: 'tenant-setup', part: 'Tenant dashboard', title: 'Their assistant, their way', minSeconds: 10,
    caption: 'Greeting, tone, services, answers',
    onScreen: 'Agent setup: greeting, tone, services, knowledge base.',
    action: 'Open agent settings; scroll.',
    voiceover: 'And they stay in control of their assistant: the greeting, the tone, their services and answers to common questions, with no code.',
  },

  // ── Part 4: CTA ─────────────────────────────────────────────────────────────
  {
    id: 'cta', part: 'Call to action', title: 'Book a demo', minSeconds: 9, card: true,
    caption: 'Book a free 15-minute demo',
    onScreen: 'CTA card with booking link.', action: 'Rendered card.',
    voiceover: 'Want this answering your customers, or offered to your own clients? Book a free fifteen-minute demo today.',
  },
]

export const RECORDED_SCENES = SCENES.filter((s) => !s.card)
