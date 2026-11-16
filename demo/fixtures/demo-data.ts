/**
 * Fictional US demo data shared by the seed (demo/seed/seed-demo.ts) and the recorder
 * (demo/record.ts). Every company, person, email (example.com / .test) and phone number
 * (555-01xx, the range reserved for fiction) is made up.
 *
 * Logins come from .env.local (git-ignored) so real credentials never enter the repo:
 *   DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD     platform admin (multi-tenant console)
 *   DEMO_TENANT_EMAIL / DEMO_TENANT_PASSWORD   owner of the hero tenant
 */

export type Trade = 'hvac' | 'plumbing' | 'electrical' | 'roofing' | 'pest' | 'dental' | 'locksmith' | 'moving'

export interface DemoTenant {
  tenantId: string
  companyName: string
  agentName: string
  city: string
  state: string
  areaCodes: string[]
  zipPrefix: string
  trades: Trade[]
  services: string[]
  status: 'active' | 'disabled' | 'archived'
  subscription: { status: 'trial' | 'active' | 'past_due' | 'canceled'; type: 'free' | 'starter' | 'growth' | 'enterprise'; billingCycle: 'monthly' | 'yearly' }
  /** Conversations per month, oldest first (six months). */
  volume: number[]
  domain: string
  hasOpenAiKey: boolean
}

export const PLATFORM_ADMIN = {
  email: process.env.DEMO_ADMIN_EMAIL || 'admin@demo.test',
  password: process.env.DEMO_ADMIN_PASSWORD || 'admin-demo-2026',
  name: process.env.DEMO_ADMIN_NAME || 'Platform Admin',
}

export const TENANT_OWNER = {
  email: process.env.DEMO_TENANT_EMAIL || 'owner@summit-demo.test',
  password: process.env.DEMO_TENANT_PASSWORD || 'summit-demo-2026',
  name: process.env.DEMO_TENANT_NAME || 'Alex Morgan',
}

/** The tenant whose website and dashboard star in the video. */
export const HERO = {
  tenantId: process.env.DEMO_TENANT_ID || 'summit-home-services',
  companyName: 'Summit Pro Home Services',
  agentName: 'Riley',
  primaryColor: '#e8590c',
  domain: 'https://www.summitpro-demo.test',
  greeting:
    "Hi, I'm Riley with Summit Pro Home Services. Heating, cooling, plumbing or electrical, I can help right now. What's going on?",
  tone: 'warm, upbeat, reassuring and practical; short sentences; never pushy',
  customInstructions:
    'You are the 24/7 front desk for a Dallas-Fort Worth home services company (HVAC, plumbing, electrical). ' +
    'Give a simple safety tip first for emergencies. Always collect full name, phone, email and service address. ' +
    'Do not quote exact prices; the technician gives an upfront quote before work starts. ' +
    'Offer the next available arrival window and say the dispatcher confirms by text.',
  knowledgeBase: [
    { topic: 'Hours', content: 'Office 7 AM-7 PM Mon-Sat. Emergency HVAC, plumbing and electrical 24/7 including holidays.' },
    { topic: 'Service area', content: 'Dallas, Fort Worth, Plano, Frisco, McKinney, Arlington, Irving, Richardson and nearby DFW cities.' },
    { topic: 'Arrival windows', content: '8-10 AM, 10 AM-12 PM, 12-2 PM, 2-4 PM, 4-6 PM. Same-day slots often available.' },
    { topic: 'Pricing policy', content: 'No exact prices over chat. Upfront, flat-rate quote before any work. Free estimates on new systems.' },
    { topic: 'AC not cooling', content: 'Check the thermostat is on Cool and the breaker is on; replace a clogged filter. Treat as urgent above 90°F.' },
    { topic: 'Membership', content: 'Summit Comfort Club: two tune-ups a year, priority scheduling and no overtime fees.' },
    { topic: 'Financing', content: 'Financing on new HVAC systems, water heaters and panel upgrades, subject to credit approval.' },
    { topic: 'Licensing', content: 'Licensed Texas HVAC (TACLA), Master Plumber and Master Electrician on staff. Insured.' },
  ],
  languages: ['english', 'spanish'],
} as const

export const TENANTS: DemoTenant[] = [
  {
    tenantId: HERO.tenantId, companyName: HERO.companyName, agentName: HERO.agentName, city: 'Dallas', state: 'TX',
    areaCodes: ['214', '972', '469', '817'], zipPrefix: '752', trades: ['hvac', 'plumbing', 'electrical'],
    services: ['AC repair', 'Heating & furnace repair', 'New HVAC system', 'Plumbing repair', 'Water heater install', 'Electrical repair', 'Panel upgrade', 'EV charger install'],
    status: 'active', subscription: { status: 'active', type: 'growth', billingCycle: 'monthly' },
    volume: [14, 19, 26, 33, 41, 52], domain: HERO.domain, hasOpenAiKey: true,
  },
  {
    tenantId: 'lone-star-plumbing', companyName: 'Lone Star Plumbing Co.', agentName: 'Jess', city: 'Austin', state: 'TX',
    areaCodes: ['512', '737'], zipPrefix: '787', trades: ['plumbing'],
    services: ['Plumbing repair', 'Water heater install', 'Drain cleaning', 'Sewer line repair'],
    status: 'active', subscription: { status: 'active', type: 'starter', billingCycle: 'monthly' },
    volume: [6, 8, 9, 12, 14, 17], domain: 'https://www.lonestarplumbing-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'peachtree-electric', companyName: 'Peachtree Electric', agentName: 'Morgan', city: 'Atlanta', state: 'GA',
    areaCodes: ['404', '678', '770'], zipPrefix: '303', trades: ['electrical'],
    services: ['Electrical repair', 'Panel upgrade', 'EV charger install', 'Generator install'],
    status: 'active', subscription: { status: 'active', type: 'growth', billingCycle: 'yearly' },
    volume: [5, 7, 10, 11, 15, 19], domain: 'https://www.peachtreeelectric-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'desert-breeze-hvac', companyName: 'Desert Breeze Heating & Air', agentName: 'Sky', city: 'Phoenix', state: 'AZ',
    areaCodes: ['602', '480', '623'], zipPrefix: '850', trades: ['hvac'],
    services: ['AC repair', 'Heating & furnace repair', 'New HVAC system', 'HVAC maintenance plan'],
    status: 'active', subscription: { status: 'active', type: 'enterprise', billingCycle: 'yearly' },
    volume: [11, 13, 18, 24, 30, 36], domain: 'https://www.desertbreeze-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'lakeside-family-dental', companyName: 'Lakeside Family Dental', agentName: 'Ava', city: 'Chicago', state: 'IL',
    areaCodes: ['312', '773'], zipPrefix: '606', trades: ['dental'],
    services: ['New patient exam', 'Teeth cleaning', 'Emergency dental visit', 'Invisalign consultation'],
    status: 'active', subscription: { status: 'active', type: 'starter', billingCycle: 'monthly' },
    volume: [4, 6, 7, 9, 10, 13], domain: 'https://www.lakesidedental-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'bayside-roofing', companyName: 'Bayside Roofing & Gutters', agentName: 'Casey', city: 'Tampa', state: 'FL',
    areaCodes: ['813', '727'], zipPrefix: '336', trades: ['roofing'],
    services: ['Roof inspection', 'Storm damage repair', 'Roof replacement', 'Gutter install'],
    status: 'active', subscription: { status: 'trial', type: 'free', billingCycle: 'monthly' },
    volume: [0, 0, 0, 0, 3, 8], domain: 'https://www.baysideroofing-demo.test', hasOpenAiKey: false,
  },
  {
    tenantId: 'rocky-mountain-pest', companyName: 'Rocky Mountain Pest Control', agentName: 'Jordan', city: 'Denver', state: 'CO',
    areaCodes: ['303', '720'], zipPrefix: '802', trades: ['pest'],
    services: ['General pest control', 'Termite inspection', 'Rodent removal', 'Quarterly protection plan'],
    status: 'active', subscription: { status: 'active', type: 'starter', billingCycle: 'yearly' },
    volume: [3, 5, 8, 10, 9, 11], domain: 'https://www.rockymountainpest-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'windy-city-locksmith', companyName: 'Windy City Locksmith', agentName: 'Sam', city: 'Chicago', state: 'IL',
    areaCodes: ['312', '872'], zipPrefix: '606', trades: ['locksmith'],
    services: ['Lockout service', 'Rekey locks', 'Smart lock install'],
    status: 'disabled', subscription: { status: 'past_due', type: 'starter', billingCycle: 'monthly' },
    volume: [4, 5, 4, 3, 0, 0], domain: 'https://www.windycitylocksmith-demo.test', hasOpenAiKey: true,
  },
  {
    tenantId: 'golden-gate-movers', companyName: 'Golden Gate Movers', agentName: 'Taylor', city: 'San Francisco', state: 'CA',
    areaCodes: ['415', '628'], zipPrefix: '941', trades: ['moving'],
    services: ['Local move', 'Long-distance move', 'Packing service'],
    status: 'archived', subscription: { status: 'canceled', type: 'starter', billingCycle: 'monthly' },
    volume: [3, 2, 0, 0, 0, 0], domain: 'https://www.goldengatemovers-demo.test', hasOpenAiKey: false,
  },
]

/** Tenant created live on camera in the admin walkthrough (deleted by every seed run). */
export const LIVE_TENANT = {
  tenantId: 'gulf-coast-electric',
  companyName: 'Gulf Coast Electric',
  agentName: 'Jamie',
  services: 'Electrical repair\nPanel upgrade\nEV charger install\nWhole-home generator',
  domain: 'https://www.gulfcoastelectric-demo.test',
}

/** Fixed id so the recorder can open this exact lead in the pipeline. */
export const HERO_RECORD_ID = 'de30da7a0000000000000001'

export const HERO_LEAD = {
  name: 'Mike Johnson',
  email: 'mike.johnson@example.com',
  phone: '(972) 555-0147',
  company: null,
  country: 'United States',
  purpose: 'AC not cooling (98°F inside), same-day repair 2-4 PM at 2214 Preston Meadow Dr, Plano, TX 75093',
}

/** The 30-second website conversation (two visitor messages). */
export const HERO_TURNS = [
  {
    user: "Hi! Our AC stopped cooling and it's 98 degrees inside. Can someone come out today? We're in Plano.",
    reply:
      "Oh no, that's miserable in this heat! Quick check: make sure the thermostat is set to Cool and the AC breaker is on. " +
      'Good news, I have a technician in Plano today between 2 and 4 PM. ' +
      'Can I get your name, phone, email and address to lock that in?',
  },
  {
    user: 'Mike Johnson, (972) 555-0147, mike.johnson@example.com, 2214 Preston Meadow Dr, Plano TX 75093',
    reply:
      "You're all set, Mike! A Summit technician will arrive today between 2 and 4 PM, and we'll text you when they're on the way. Stay cool!",
    lead: {
      name: HERO_LEAD.name,
      email: HERO_LEAD.email,
      phone: HERO_LEAD.phone,
      country: HERO_LEAD.country,
      purpose: HERO_LEAD.purpose,
    },
    endCall: true,
  },
] as const

export const HERO_SUMMARY = {
  summary:
    'Mike Johnson in Plano, TX reported his AC is not cooling with 98°F inside and asked for same-day service. ' +
    'Riley shared quick safety checks and booked today 2-4 PM at 2214 Preston Meadow Dr.',
  keyPoints: [
    'Urgent: AC not cooling, 98°F inside',
    'Booked today 2-4 PM, Plano, TX 75093',
    'Text updates to (972) 555-0147',
    'Upsell: Summit Comfort Club membership',
  ],
  nextSteps: [
    'Dispatch nearest HVAC technician for the 2-4 PM window',
    'Text Mike when the technician is on the way',
    'Offer Comfort Club membership after the repair',
  ],
}
