/**
 * Seeds a LOCAL MongoDB with a fictional US multi-tenant platform for the demo video:
 *   - platform admin login (DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD)
 *   - 9 US service-business tenants (TX, GA, AZ, IL, FL, CO, CA) with plans, statuses,
 *     domains, masked API keys and usage counters, so the admin console shows real
 *     multi-tenant management (active, trial, disabled/past-due, archived)
 *   - hero tenant "Summit Pro Home Services" (Dallas-Fort Worth) with its owner login
 *     (DEMO_TENANT_EMAIL / DEMO_TENANT_PASSWORD), knowledge base and ~185 conversations
 *   - ~580 realistic US conversations in total, growing month over month
 *
 *   npm run demo:seed
 *
 * Re-run before every take (the recording edits a lead and creates a tenant). It
 * deletes and recreates only the demo tenants/users listed in demo/fixtures, and refuses
 * a non-local database unless DEMO_SEED_ALLOW_REMOTE=true.
 */
import '../../src/scripts/load-env'
import { ObjectId, type Document } from 'mongodb'
import { env } from '@/lib/config/env'
import { getMongoDb } from '@/lib/db/mongodb'
import { AUTH_COLLECTIONS } from '@/lib/auth/types'
import { upsertAuthUser } from '@/lib/auth/users'
import { TENANT_COLLECTIONS } from '@/lib/tenants/db-types'
import { calculateMaturityScore } from '@/lib/ai/maturity-score'
import { upsertTenantSecretInDb } from '@/lib/tenants/secrets'
import {
  archiveManagedTenant,
  createManagedTenant,
  createManagedTenantUser,
  disableManagedTenant,
  updateManagedTenantSettings,
} from '@/lib/tenants/management'
import {
  HERO,
  HERO_LEAD,
  HERO_RECORD_ID,
  HERO_SUMMARY,
  HERO_TURNS,
  LIVE_TENANT,
  PLATFORM_ADMIN,
  TENANT_OWNER,
  TENANTS,
  type DemoTenant,
} from '../fixtures/demo-data'
import { COMPANIES, FIRST_NAMES, LAST_NAMES, STREET_NAMES, STREET_TYPES, SUBURBS, TEMPLATES, type Template } from '../fixtures/templates'

// ── Safety ────────────────────────────────────────────────────────────────────
function assertLocalDatabase(): void {
  const uri = env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set. Point it at a local MongoDB (see demo/README.md).')
  if (process.env.DEMO_SEED_ALLOW_REMOTE === 'true') return
  const host = uri.replace(/^mongodb(\+srv)?:\/\//, '').replace(/^[^@]*@/, '').split(/[/?,:]/)[0]
  if (!['localhost', '127.0.0.1', '::1', 'mongo', 'mongodb', 'host.docker.internal'].includes(host)) {
    throw new Error(`Refusing to seed demo data into "${host}". Use a local database, or set DEMO_SEED_ALLOW_REMOTE=true if you are sure.`)
  }
}

// ── Deterministic randomness ──────────────────────────────────────────────────
let seed = 20261116
function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0
  let x = seed
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]
function weighted<T extends string>(table: Record<T, number>): T {
  const entries = Object.entries(table) as Array<[T, number]>
  let roll = rand() * entries.reduce((s, [, w]) => s + w, 0)
  for (const [v, w] of entries) if ((roll -= w) <= 0) return v
  return entries[0][0]
}
function weightedTemplate(pool: Template[]): Template {
  let roll = rand() * pool.reduce((s, x) => s + x.weight, 0)
  for (const x of pool) if ((roll -= x.weight) <= 0) return x
  return pool[0]
}
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')

type Status = 'new' | 'reviewing' | 'qualified' | 'proposal' | 'won' | 'lost'
const OWNERS = ['Maria (Office)', 'Jake (Dispatch)', 'Carlos (Sales)', 'Dana (Service Manager)']

function conversation(tenant: DemoTenant, index: number, createdAt: Date, now: Date): Document {
  const pool = TEMPLATES.filter((x) => tenant.trades.includes(x.trade) && (tenant.services.includes(x.service) || x.service === 'General question' || x.service === 'Careers'))
  const tpl = weightedTemplate(pool)
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const name = `${first} ${last}`
  const city = pick(SUBURBS[tenant.city] ?? [tenant.city])
  const zip = `${tenant.zipPrefix}${String(Math.floor(rand() * 90) + 10)}`
  const street = `${100 + Math.floor(rand() * 9800)} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}, ${city}, ${tenant.state} ${zip}`
  const company = tpl.commercial ? pick(COMPANIES) : null
  const captured = tpl.intent === 'information' ? rand() < 0.4 : rand() < 0.92
  const quality = captured ? weighted(tpl.quality) : 'unknown'
  const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000
  const status: Status =
    !captured ? (rand() < 0.7 ? 'reviewing' : 'lost')
    : ageDays < 2 ? weighted({ new: 6, reviewing: 3, qualified: 1, proposal: 0, won: 0, lost: 0 })
    : ageDays < 14 ? weighted({ new: 1, reviewing: 3, qualified: 4, proposal: 2, won: 2, lost: 1 })
    : weighted({ new: 0, reviewing: 1, qualified: 2, proposal: 2, won: 6, lost: 2 })
  const sentiment = tpl.intent === 'complaint' ? 'neutral' : weighted({ positive: 7, neutral: 3, negative: 0.4 })
  const phone = `(${pick(tenant.areaCodes)}) 555-01${String(Math.floor(rand() * 100)).padStart(2, '0')}`
  const email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.com'
  const lead = captured
    ? { name, email, phone, company, country: 'United States', purpose: `${tpl.service} in ${city}, ${tenant.state}` }
    : { name: null, email: null, phone: null, company: null, country: 'United States', purpose: tpl.service }
  const vars = { name: captured ? name : 'A visitor', city, state: tenant.state, street, company: company ?? '' }
  const greeting = `Hi, I'm ${tenant.agentName} with ${tenant.companyName}. How can I help you today?`
  const transcript = [
    { role: 'assistant', content: greeting },
    { role: 'user', content: tpl.ask },
    { role: 'assistant', content: tpl.answer },
    ...(captured
      ? [
          { role: 'user', content: `${name}${company ? `, ${company}` : ''}, ${phone}, ${email}. ${street}.` },
          { role: 'assistant', content: `Thanks, ${first}! You're all set. We'll text you a confirmation shortly.` },
        ]
      : [{ role: 'user', content: 'Great, thanks!' }]),
  ]
  const open = status !== 'won' && status !== 'lost'
  const owner = status === 'new' ? null : pick(OWNERS)
  const followUpAt = open && owner ? new Date(now.getTime() + (rand() < 0.12 ? -1 : 1) * (6 + rand() * 60) * 3_600_000) : null
  const statusHistory = [{ status: 'new', changedAt: createdAt }]
  if (status !== 'new') statusHistory.push({ status, changedAt: new Date(createdAt.getTime() + 3_600_000 * (2 + rand() * 30)) })
  const maturity = calculateMaturityScore({ status, leadQuality: quality, urgency: tpl.urgency, sentiment, lead, messageCount: transcript.length, hasLead: captured })
  const summary = fill(tpl.summary, vars)

  return {
    conversationId: `demo-${tenant.tenantId}-${index}`,
    tenant: { id: tenant.tenantId, companyName: tenant.companyName, agentName: tenant.agentName },
    user: lead,
    lead,
    hasLead: captured,
    requirement: {
      summary,
      detectedNeed: tpl.service,
      servicesInterested: tenant.services.includes(tpl.service) ? [tpl.service] : [],
      urgency: tpl.urgency,
      budgetMentioned: tpl.category === 'pricing_inquiry',
      timelineMentioned: tpl.urgency !== 'low',
    },
    classification: { category: tpl.category, subcategory: null, intent: tpl.intent, leadQuality: quality, sentiment },
    maturityScore: maturity.score,
    maturityLabel: maturity.label,
    summary: { text: summary, keyPoints: tpl.keyPoints },
    callSummary: { summary, keyPoints: tpl.keyPoints, nextSteps: tpl.nextSteps },
    transcript,
    messageCount: transcript.length,
    status,
    statusHistory,
    owner,
    followUpAt,
    notes: owner && rand() < 0.35 ? pick(['Prefers text messages.', 'Gate code on the work order.', 'Has a dog; call on arrival.', 'Asked for financing details.']) : null,
    source: { mode: 'conversation', language: rand() < 0.14 ? 'spanish' : 'english' },
    email: { sent: true, recipients: [`dispatch@${tenant.tenantId}.test`] },
    finalizedAt: new Date(createdAt.getTime() + 4 * 60_000),
    createdAt,
    updatedAt: statusHistory.at(-1)!.changedAt,
  }
}

function heroConversation(now: Date): Document {
  const createdAt = new Date(now.getTime() - 4 * 60_000)
  const transcript = [
    { role: 'assistant', content: HERO.greeting },
    ...HERO_TURNS.flatMap((turn) => [{ role: 'user', content: turn.user }, { role: 'assistant', content: turn.reply }]),
  ]
  const maturity = calculateMaturityScore({ status: 'new', leadQuality: 'hot', urgency: 'high', sentiment: 'positive', lead: HERO_LEAD, messageCount: transcript.length, hasLead: true })
  return {
    _id: new ObjectId(HERO_RECORD_ID),
    conversationId: 'demo-hero',
    tenant: { id: HERO.tenantId, companyName: HERO.companyName, agentName: HERO.agentName },
    user: HERO_LEAD,
    lead: HERO_LEAD,
    hasLead: true,
    requirement: { summary: HERO_SUMMARY.summary, detectedNeed: 'AC not cooling', servicesInterested: ['AC repair'], urgency: 'high', budgetMentioned: false, timelineMentioned: true },
    classification: { category: 'support_request', subcategory: 'ac_repair', intent: 'buying_interest', leadQuality: 'hot', sentiment: 'positive' },
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
    email: { sent: true, recipients: [`dispatch@${HERO.tenantId}.test`] },
    finalizedAt: now,
    createdAt,
    updatedAt: now,
  }
}

async function main(): Promise<void> {
  assertLocalDatabase()
  const db = await getMongoDb()
  if (!db) throw new Error('Could not connect to MongoDB.')
  const now = new Date()
  const tenantIds = [...TENANTS.map((x) => x.tenantId), LIVE_TENANT.tenantId]

  // 1. Remove previous demo data (only demo tenants and demo logins).
  await Promise.all([
    ...Object.values(TENANT_COLLECTIONS).map((c) => db.collection(c).deleteMany({ tenantId: { $in: tenantIds } })),
    db.collection('tenant_usage_counters').deleteMany({ tenantId: { $in: tenantIds } }),
    db.collection(AUTH_COLLECTIONS.users).deleteMany({ $or: [{ tenantId: { $in: tenantIds } }, { email: { $in: [PLATFORM_ADMIN.email, TENANT_OWNER.email].map((e) => e.toLowerCase()) } }] }),
    db.collection(env.MONGODB_CALLS_COLLECTION).deleteMany({ 'tenant.id': { $in: tenantIds } }),
  ])

  // 2. Platform admin.
  await upsertAuthUser({ email: PLATFORM_ADMIN.email, password: PLATFORM_ADMIN.password, name: PLATFORM_ADMIN.name, role: 'platform_admin' })

  // 3. Tenants (through the app's own management functions).
  for (const tenant of TENANTS) {
    const isHero = tenant.tenantId === HERO.tenantId
    await createManagedTenant({
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      agentName: tenant.agentName,
      greeting: isHero ? HERO.greeting : `Hi, I'm ${tenant.agentName} with ${tenant.companyName}. How can I help you today?`,
      tone: isHero ? HERO.tone : 'friendly, professional and helpful',
      services: tenant.services,
      domains: isHero ? [tenant.domain, 'http://localhost:3000'] : [tenant.domain],
      embedToken: `${tenant.tenantId}-demo-token`,
      subscriptionStatus: tenant.subscription.status,
      subscriptionType: tenant.subscription.type,
      billingCycle: tenant.subscription.billingCycle,
    })
    if (isHero) {
      await updateManagedTenantSettings({
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        agentName: tenant.agentName,
        greeting: HERO.greeting,
        tone: HERO.tone,
        services: tenant.services,
        customInstructions: HERO.customInstructions,
        knowledgeBase: HERO.knowledgeBase.map((e) => ({ ...e })),
      })
      await db.collection(TENANT_COLLECTIONS.settings).updateOne(
        { tenantId: tenant.tenantId },
        { $set: { languageMode: 'auto', supportedLanguages: [...HERO.languages], voiceProfile: { gender: 'female', style: 'warm and upbeat' } } }
      )
      await createManagedTenantUser({ tenantId: tenant.tenantId, email: TENANT_OWNER.email, password: TENANT_OWNER.password, name: TENANT_OWNER.name, role: 'tenant_owner' })
      await createManagedTenantUser({ tenantId: tenant.tenantId, email: `dispatch@${tenant.tenantId}.test`, password: `${tenant.tenantId}-staff`, name: 'Jake (Dispatch)', role: 'tenant_admin' })
      await createManagedTenantUser({ tenantId: tenant.tenantId, email: `office@${tenant.tenantId}.test`, password: `${tenant.tenantId}-staff`, name: 'Maria (Office)', role: 'tenant_viewer' })
    }
    // Verified domains: no verification tokens on screen.
    await db.collection(TENANT_COLLECTIONS.domains).updateMany(
      { tenantId: tenant.tenantId, status: 'active' },
      { $set: { verificationStatus: 'verified', verifiedAt: now }, $unset: { verificationToken: '' } }
    )
    // Placeholder keys so "OpenAI ready" looks configured. Only the masked form is ever shown.
    // The demo conversation is mocked, so these never reach OpenAI.
    if (tenant.hasOpenAiKey && env.PLATFORM_ENCRYPTION_KEY) {
      const real = isHero ? process.env.DEMO_OPENAI_API_KEY : undefined
      await upsertTenantSecretInDb(db, { tenantId: tenant.tenantId, kind: 'openai_api_key', value: real || `sk-demo-placeholder-${tenant.tenantId}` })
    }
    if (tenant.status === 'disabled') await disableManagedTenant(tenant.tenantId)
    if (tenant.status === 'archived') await archiveManagedTenant(tenant.tenantId)
  }

  // 4. Conversations per tenant over six months (growing), plus the hero lead.
  const docs: Document[] = []
  const usage: Document[] = []
  for (const tenant of TENANTS) {
    let index = 0
    tenant.volume.forEach((count, i) => {
      const monthsAgo = tenant.volume.length - 1 - i
      const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
      const end = monthsAgo === 0 ? new Date(now.getTime() - 3_600_000) : new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23)
      for (let k = 0; k < count; k++) {
        const at = new Date(start.getTime() + rand() * (end.getTime() - start.getTime()))
        if (rand() < 0.35) at.setHours(18 + Math.floor(rand() * 5), Math.floor(rand() * 60)) // after-hours share
        docs.push(conversation(tenant, index++, at, now))
      }
    })
    const total = tenant.volume.reduce((a, b) => a + b, 0)
    if (total > 0) {
      const counters = {
        embed_session_created: total * 9,
        embed_session_denied: Math.round(total * 0.2),
        config_request: total * 11,
        chat_request: total * 6,
        transcription_request: Math.round(total * 1.8),
        tts_request: total * 7,
        conversation_completed: total,
      }
      usage.push({
        tenantId: tenant.tenantId,
        counters,
        total: Object.values(counters).reduce((a, b) => a + b, 0),
        firstEventAt: new Date(now.getTime() - 180 * 86_400_000),
        lastEventAt: now,
        createdAt: new Date(now.getTime() - 180 * 86_400_000),
        updatedAt: now,
      })
    }
  }
  docs.push(heroConversation(now))
  await db.collection(env.MONGODB_CALLS_COLLECTION).insertMany(docs)
  if (usage.length) await db.collection('tenant_usage_counters').insertMany(usage)

  console.info('[demo:seed] done', {
    tenants: TENANTS.length,
    conversations: docs.length,
    platformAdmin: PLATFORM_ADMIN.email,
    tenantOwner: `${TENANT_OWNER.email} (${HERO.companyName})`,
  })
  if (process.env.USAGE_EVENTS_ENABLED !== 'true') console.info('[demo:seed] Tip: set USAGE_EVENTS_ENABLED=true in .env.local to show the Usage charts.')
  if (!env.PLATFORM_ENCRYPTION_KEY) console.info('[demo:seed] Tip: set PLATFORM_ENCRYPTION_KEY so tenants show "OpenAI key configured".')
  console.info('[demo:seed] Restart `npm run dev` if it was running, so cached tenant data refreshes.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[demo:seed] failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
