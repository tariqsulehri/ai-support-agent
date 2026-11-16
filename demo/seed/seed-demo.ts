/**
 * Seeds a LOCAL MongoDB with a fictional demo business so every screen in the demo
 * video looks real: tenant + agent settings + knowledge base, a tenant-owner login,
 * a verified domain, and ~110 realistic conversations over six months (growing trend),
 * including the "hero" lead captured live in the video.
 *
 *   npm run demo:seed
 *
 * Safe to re-run: it deletes and recreates only the demo tenant's data.
 * Refuses to touch a non-local database unless DEMO_SEED_ALLOW_REMOTE=true.
 * All names, emails (example.com/.test) and phone numbers (555-01xx) are fake.
 */
import '../../src/scripts/load-env'
import { ObjectId, type Document } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb } from '@/lib/db/mongodb'
import { AUTH_COLLECTIONS } from '@/lib/auth/types'
import { TENANT_COLLECTIONS } from '@/lib/tenants/db-types'
import { calculateMaturityScore } from '@/lib/ai/maturity-score'
import { upsertTenantSecretInDb } from '@/lib/tenants/secrets'
import {
  createManagedTenant,
  createManagedTenantUser,
  updateManagedTenantSettings,
} from '@/lib/tenants/management'
import {
  DEMO_OWNER,
  DEMO_TENANT,
  HERO_LEAD,
  HERO_RECORD_ID,
  HERO_SUMMARY,
  HERO_TURNS,
} from '../fixtures/demo-tenant'

// ── Safety ────────────────────────────────────────────────────────────────────
function assertLocalDatabase(): void {
  const uri = env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set. Point it at a local MongoDB (see demo/README.md).')
  if (process.env.DEMO_SEED_ALLOW_REMOTE === 'true') return
  const host = uri.replace(/^mongodb(\+srv)?:\/\//, '').replace(/^[^@]*@/, '').split(/[/?,:]/)[0]
  if (!['localhost', '127.0.0.1', '::1', 'mongo', 'mongodb', 'host.docker.internal'].includes(host)) {
    throw new Error(
      `Refusing to seed demo data into "${host}". Use a local database, or set DEMO_SEED_ALLOW_REMOTE=true if you are sure.`
    )
  }
}

// ── Deterministic randomness (same data every run) ────────────────────────────
let seed = 20261116
function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]
function weighted<T extends string>(table: Record<T, number>): T {
  const entries = Object.entries(table) as Array<[T, number]>
  let roll = rand() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[0][0]
}

// ── Fictional people ──────────────────────────────────────────────────────────
const FIRST = ['Maya', 'Jordan', 'Priya', 'Luis', 'Grace', 'Owen', 'Fatima', 'Ethan', 'Chloe', 'Marcus', 'Elena', 'Noah',
  'Aisha', 'Ben', 'Sofia', 'Caleb', 'Hannah', 'Diego', 'Rachel', 'Tom', 'Nina', 'Victor', 'Leah', 'Andre', 'Claire', 'Raj',
  'Ivy', 'Samuel', 'Monica', 'Kevin']
const LAST = ['Patel', 'Brooks', 'Nguyen', 'Garcia', 'Kim', 'Sullivan', 'Rahman', 'Cole', 'Martinez', 'Reed', 'Okafor',
  'Bennett', 'Lopez', 'Fischer', 'Hayes', 'Romero', 'Walsh', 'Chen', 'Morgan', 'Price']
const STREETS = ['Oak St', 'Maple Ave', 'Harbor Rd', 'Pine Ct', 'Willow Way', 'Elm Dr', 'Lakeview Blvd', 'Birch Ln', 'Ridge Rd']
const OWNERS = ['Maria (Office)', 'Jake (Dispatch)', 'Sam Harbor']

// ── Conversation templates (home services) ────────────────────────────────────
type Template = {
  service: string
  category: string
  intent: 'buying_interest' | 'support' | 'information' | 'meeting_request' | 'complaint'
  quality: Record<'hot' | 'warm' | 'cold', number>
  urgency: 'high' | 'medium' | 'low'
  ask: string
  answer: string
  summary: (name: string, street: string) => string
  keyPoints: string[]
  nextSteps: string[]
  weight: number
}

const TEMPLATES: Template[] = [
  {
    service: 'Emergency plumbing', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 5,
    quality: { hot: 8, warm: 2, cold: 0 },
    ask: 'A pipe under my kitchen sink burst and water is everywhere. Can you send someone tonight?',
    answer: 'I am sorry! Shut the valve under the sink if you can. Our on-call plumber can be there within the hour. Can I get your name, phone and address?',
    summary: (n, s) => `${n} reported a burst pipe under the kitchen sink at ${s} and needed same-night service. Shut-off guidance was given and the on-call plumber was requested.`,
    keyPoints: ['Burst pipe, active leak', 'Same-night emergency visit requested', 'Shut-off steps given'],
    nextSteps: ['Dispatch on-call plumber', 'Call customer with ETA'],
  },
  {
    service: 'Water heater repair & replacement', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'medium', weight: 5,
    quality: { hot: 5, warm: 4, cold: 1 },
    ask: 'My water heater is 14 years old and the water is only lukewarm. Should I repair it or replace it?',
    answer: 'At 14 years, replacement is often the better value, but the technician will check it and give you an upfront quote for both. Shall I book a free estimate?',
    summary: (n, s) => `${n} has a 14-year-old water heater producing lukewarm water at ${s} and wants advice on repair versus replacement. A free replacement estimate was offered.`,
    keyPoints: ['Aging unit (14 years)', 'Interested in replacement options', 'Asked about financing'],
    nextSteps: ['Book free estimate', 'Send financing information'],
  },
  {
    service: 'Furnace tune-up', category: 'general_inquiry', intent: 'meeting_request', urgency: 'low', weight: 4,
    quality: { hot: 2, warm: 6, cold: 2 },
    ask: 'Can I schedule a furnace tune-up before winter? Do you have anything next week?',
    answer: 'Yes! We have mornings and afternoons open next week. Which day works best, and what is the service address?',
    summary: (n, s) => `${n} wants a pre-winter furnace tune-up at ${s} next week and asked about available times.`,
    keyPoints: ['Seasonal maintenance', 'Flexible on timing next week'],
    nextSteps: ['Confirm appointment day', 'Offer maintenance plan'],
  },
  {
    service: 'AC repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 3,
    quality: { hot: 6, warm: 3, cold: 1 },
    ask: 'My AC is running but blowing warm air. It is really hot in here. How soon can someone come?',
    answer: 'That is no fun in this heat. Check that the thermostat is on cool and the filter is not clogged. Our earliest slot is tomorrow 11 AM to 1 PM. Want it?',
    summary: (n, s) => `${n}'s AC at ${s} is blowing warm air. Basic checks were suggested and the next-day midday window was offered.`,
    keyPoints: ['AC blowing warm air', 'Wants earliest appointment', 'Elderly parent at home'],
    nextSteps: ['Confirm tomorrow 11 AM-1 PM', 'Text technician ETA'],
  },
  {
    service: 'Drain cleaning', category: 'support_request', intent: 'support', urgency: 'medium', weight: 3,
    quality: { hot: 3, warm: 5, cold: 2 },
    ask: 'Our basement floor drain keeps backing up after it rains. Is that something you fix?',
    answer: 'Yes, we clear and camera-inspect drains so we can find the cause. Can I take your details and book an inspection?',
    summary: (n, s) => `${n} has a basement floor drain at ${s} that backs up after rain and wants it inspected and cleared.`,
    keyPoints: ['Recurring backup after rain', 'Camera inspection suggested'],
    nextSteps: ['Book drain inspection', 'Quote camera inspection'],
  },
  {
    service: 'New HVAC system quote', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'low', weight: 3,
    quality: { hot: 4, warm: 5, cold: 1 },
    ask: 'We are thinking about replacing our whole heating and cooling system. Do you do free quotes?',
    answer: 'We do! A comfort advisor visits, measures your home and gives you options with upfront pricing. Financing is available too. When is a good time?',
    summary: (n, s) => `${n} is considering a full HVAC replacement at ${s} and requested a free in-home quote, with interest in financing.`,
    keyPoints: ['Full system replacement', 'Free in-home quote requested', 'Interested in financing'],
    nextSteps: ['Schedule comfort advisor visit', 'Send financing options'],
  },
  {
    service: 'Emergency plumbing', category: 'general_inquiry', intent: 'information', urgency: 'low', weight: 3,
    quality: { hot: 0, warm: 3, cold: 7 },
    ask: 'Do you work on weekends? Just asking for future reference.',
    answer: 'Yes, emergency plumbing and no-heat calls are covered 24/7, including weekends. Regular appointments are Monday to Friday.',
    summary: (n) => `${n} asked about weekend availability for future reference. Emergency 24/7 coverage was explained.`,
    keyPoints: ['General question about hours', 'No immediate job'],
    nextSteps: ['Add to newsletter list'],
  },
  {
    service: 'Water heater repair & replacement', category: 'support_request', intent: 'complaint', urgency: 'medium', weight: 1,
    quality: { hot: 1, warm: 5, cold: 4 },
    ask: 'Your tech replaced my water heater last month and now there is a small drip at the valve.',
    answer: 'I am sorry about that. Your workmanship is guaranteed for a year, so we will send someone back at no charge. What day works?',
    summary: (n, s) => `${n} reported a small drip at the valve of a water heater installed last month at ${s}. A no-charge warranty revisit was offered.`,
    keyPoints: ['Warranty revisit', 'Minor drip at valve', 'Customer was polite but concerned'],
    nextSteps: ['Book warranty visit', 'Manager follow-up call'],
  },
]

type Status = 'new' | 'reviewing' | 'qualified' | 'proposal' | 'won' | 'lost'

const TEMPLATE_POOL = TEMPLATES.flatMap((tpl) => Array<Template>(tpl.weight).fill(tpl))

function conversationDoc(index: number, createdAt: Date, now: Date): Document {
  const t = pick(TEMPLATE_POOL)
  const first = pick(FIRST)
  const lastName = pick(LAST)
  const name = `${first} ${lastName}`
  const street = `${10 + Math.floor(rand() * 890)} ${pick(STREETS)}`
  const captured = t.intent === 'information' ? rand() < 0.35 : rand() < 0.9
  const quality = captured ? weighted(t.quality) : 'unknown'
  const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000

  // Older conversations have moved further through the pipeline.
  const status: Status =
    !captured ? (rand() < 0.7 ? 'reviewing' : 'lost')
    : ageDays < 2 ? weighted({ new: 6, reviewing: 3, qualified: 1, proposal: 0, won: 0, lost: 0 })
    : ageDays < 14 ? weighted({ new: 1, reviewing: 3, qualified: 4, proposal: 2, won: 2, lost: 1 })
    : weighted({ new: 0, reviewing: 1, qualified: 2, proposal: 2, won: 6, lost: 2 })

  const sentiment = t.intent === 'complaint' ? 'neutral' : weighted({ positive: 7, neutral: 3, negative: 0.4 })
  const lead = captured
    ? {
        name,
        email: `${first}.${lastName}`.toLowerCase() + '@example.com',
        phone: `(555) 01${Math.floor(rand() * 10)}-${String(1000 + Math.floor(rand() * 8999))}`,
        company: null,
        country: rand() < 0.93 ? 'United States' : 'Canada',
        purpose: t.service,
      }
    : { name: null, email: null, phone: null, company: null, country: null, purpose: t.service }

  const transcript = [
    { role: 'assistant', content: DEMO_TENANT.greeting },
    { role: 'user', content: t.ask },
    { role: 'assistant', content: t.answer },
    ...(captured
      ? [
          { role: 'user', content: `${name}, ${lead.phone}, ${lead.email}. ${street}.` },
          { role: 'assistant', content: `Thanks, ${first}! You're all set. Our team will confirm by text shortly.` },
        ]
      : [{ role: 'user', content: 'Great, thanks!' }]),
  ]

  const open = status !== 'won' && status !== 'lost'
  const owner = status === 'new' ? null : pick(OWNERS)
  // A handful of overdue follow-ups gives the AI insights tab something useful to flag.
  const followUpAt = open && owner
    ? new Date(now.getTime() + (rand() < 0.3 ? -1 : 1) * (6 + rand() * 60) * 3_600_000)
    : null

  const statusHistory = [{ status: 'new', changedAt: createdAt }]
  if (status !== 'new') statusHistory.push({ status, changedAt: new Date(createdAt.getTime() + 3_600_000 * (2 + rand() * 30)) })

  const maturity = calculateMaturityScore({
    status, leadQuality: quality, urgency: t.urgency, sentiment, lead, messageCount: transcript.length, hasLead: captured,
  })

  return {
    conversationId: `demo-${index}`,
    tenant: { id: DEMO_TENANT.tenantId, companyName: DEMO_TENANT.companyName, agentName: DEMO_TENANT.agentName },
    user: lead,
    lead,
    hasLead: captured,
    requirement: {
      summary: t.summary(name, street),
      detectedNeed: t.service,
      servicesInterested: [t.service],
      urgency: t.urgency,
      budgetMentioned: t.category === 'pricing_inquiry',
      timelineMentioned: t.urgency !== 'low',
    },
    classification: { category: t.category, subcategory: null, intent: t.intent, leadQuality: quality, sentiment },
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
    summary: { text: t.summary(captured ? name : 'A visitor', street), keyPoints: t.keyPoints },
    callSummary: { summary: t.summary(captured ? name : 'A visitor', street), keyPoints: t.keyPoints, nextSteps: t.nextSteps },
    transcript,
    messageCount: transcript.length,
    status,
    statusHistory,
    owner,
    followUpAt,
    notes: owner && rand() < 0.4 ? 'Prefers text messages. Gate code in notes on the work order.' : null,
    source: { mode: 'conversation', language: rand() < 0.12 ? 'spanish' : 'english' },
    email: { sent: true, recipients: ['dispatch@harborline-demo.test'] },
    finalizedAt: new Date(createdAt.getTime() + 4 * 60_000),
    createdAt,
    updatedAt: statusHistory.at(-1)!.changedAt,
  }
}

function heroDoc(now: Date): Document {
  const createdAt = new Date(now.getTime() - 3 * 60_000)
  const transcript = [
    { role: 'assistant', content: DEMO_TENANT.greeting },
    ...HERO_TURNS.flatMap((turn) => [
      { role: 'user', content: turn.user },
      { role: 'assistant', content: turn.reply },
    ]),
  ]
  const maturity = calculateMaturityScore({
    status: 'new', leadQuality: 'hot', urgency: 'high', sentiment: 'positive', lead: HERO_LEAD,
    messageCount: transcript.length, hasLead: true,
  })
  return {
    _id: new ObjectId(HERO_RECORD_ID),
    conversationId: 'demo-hero',
    tenant: { id: DEMO_TENANT.tenantId, companyName: DEMO_TENANT.companyName, agentName: DEMO_TENANT.agentName },
    user: HERO_LEAD,
    lead: HERO_LEAD,
    hasLead: true,
    requirement: {
      summary: HERO_SUMMARY.summary,
      detectedNeed: 'Water heater leak',
      servicesInterested: ['Water heater repair & replacement', 'Furnace tune-up'],
      urgency: 'high',
      budgetMentioned: false,
      timelineMentioned: true,
    },
    classification: { category: 'support_request', subcategory: 'water_heater', intent: 'buying_interest', leadQuality: 'hot', sentiment: 'positive' },
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
    summary: { text: HERO_SUMMARY.summary, keyPoints: HERO_SUMMARY.keyPoints },
    callSummary: HERO_SUMMARY,
    transcript,
    messageCount: transcript.length,
    status: 'new',
    statusHistory: [{ status: 'new', changedAt: createdAt }],
    owner: null,
    followUpAt: null,
    notes: null,
    source: { mode: 'conversation', language: 'english' },
    email: { sent: true, recipients: ['dispatch@harborline-demo.test'] },
    finalizedAt: now,
    createdAt,
    updatedAt: now,
  }
}

/** Growth story: more conversations every month (oldest month first). */
const PER_MONTH = [9, 12, 15, 19, 24, 30]

async function main(): Promise<void> {
  assertLocalDatabase()
  const db = await getMongoDb()
  if (!db) throw new Error('Could not connect to MongoDB.')
  const tenantId = DEMO_TENANT.tenantId
  const now = new Date()

  // 1. Clean previous demo data (only this tenant).
  await Promise.all([
    ...Object.values(TENANT_COLLECTIONS).map((name) => db.collection(name).deleteMany({ tenantId })),
    db.collection(AUTH_COLLECTIONS.users).deleteMany({ tenantId }),
    db.collection(AUTH_COLLECTIONS.users).deleteMany({ email: DEMO_OWNER.email }),
    db.collection(env.MONGODB_CALLS_COLLECTION).deleteMany({ 'tenant.id': tenantId }),
  ])

  // 2. Tenant, settings, knowledge base, owner login (through the app's own functions).
  await createManagedTenant({
    tenantId,
    companyName: DEMO_TENANT.companyName,
    agentName: DEMO_TENANT.agentName,
    greeting: DEMO_TENANT.greeting,
    tone: DEMO_TENANT.tone,
    services: [...DEMO_TENANT.services],
    domains: [DEMO_TENANT.domain, 'http://localhost:3000'],
    embedToken: process.env.DEMO_EMBED_TOKEN || 'harborline-demo-token',
    subscriptionStatus: 'active',
    subscriptionType: 'growth',
    billingCycle: 'monthly',
  })
  await updateManagedTenantSettings({
    tenantId,
    companyName: DEMO_TENANT.companyName,
    agentName: DEMO_TENANT.agentName,
    greeting: DEMO_TENANT.greeting,
    tone: DEMO_TENANT.tone,
    services: [...DEMO_TENANT.services],
    customInstructions: DEMO_TENANT.customInstructions,
    knowledgeBase: DEMO_TENANT.knowledgeBase.map((e) => ({ ...e })),
  })
  await db.collection(TENANT_COLLECTIONS.settings).updateOne(
    { tenantId },
    { $set: { languageMode: 'auto', supportedLanguages: [...DEMO_TENANT.languages], voiceProfile: { gender: 'female', style: 'warm and calm' } } }
  )
  // Mark domains verified so no verification tokens appear on screen.
  await db.collection(TENANT_COLLECTIONS.domains).updateMany(
    { tenantId, status: 'active' },
    { $set: { verificationStatus: 'verified', verifiedAt: now }, $unset: { verificationToken: '' } }
  )
  await createManagedTenantUser({
    tenantId,
    email: DEMO_OWNER.email,
    password: DEMO_OWNER.password,
    name: DEMO_OWNER.name,
    role: 'tenant_owner',
  })

  // 3. Optional: store an OpenAI key for live (non-mocked) recordings. Only the masked
  //    form (e.g. "sk-p...abcd") is ever shown in the UI.
  if (process.env.DEMO_OPENAI_API_KEY && env.PLATFORM_ENCRYPTION_KEY) {
    await upsertTenantSecretInDb(db, { tenantId, kind: 'openai_api_key', value: process.env.DEMO_OPENAI_API_KEY })
  }

  // 4. Conversations: six months, growing, plus tonight's hero lead.
  const docs: Document[] = []
  let index = 0
  PER_MONTH.forEach((count, i) => {
    const monthsAgo = PER_MONTH.length - 1 - i
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const monthEnd = monthsAgo === 0 ? new Date(now.getTime() - 3_600_000) : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23)
    for (let k = 0; k < count; k++) {
      const at = new Date(monthStart.getTime() + rand() * (monthEnd.getTime() - monthStart.getTime()))
      // About a third of inquiries arrive after hours: the point of the product.
      if (rand() < 0.35) at.setHours(19 + Math.floor(rand() * 4), Math.floor(rand() * 60))
      docs.push(conversationDoc(index++, at, now))
    }
  })
  docs.push(heroDoc(now))
  await db.collection(env.MONGODB_CALLS_COLLECTION).insertMany(docs)

  console.info('[demo:seed] done', {
    tenantId,
    conversations: docs.length,
    login: `${DEMO_OWNER.email} (password from DEMO_PASSWORD or the default in demo/fixtures/demo-tenant.ts)`,
    heroRecordId: HERO_RECORD_ID,
  })
  console.info('[demo:seed] Restart `npm run dev` if it was already running, so cached tenant data refreshes.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[demo:seed] failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
