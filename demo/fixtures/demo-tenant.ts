/**
 * Fictional demo business + the scripted "hero" conversation shown in the video.
 * Shared by demo/seed/seed-demo.ts (dashboard data) and demo/record.ts (widget mocks)
 * so the lead the viewer watches being captured is the same one opened in the dashboard.
 *
 * All people, emails (example.com / .test) and phone numbers (555-01xx) are fake.
 */

export const DEMO_TENANT = {
  tenantId: process.env.DEMO_TENANT_ID || 'harborline-demo',
  companyName: 'Harborline Heating & Plumbing',
  agentName: 'Riley',
  primaryColor: '#0f5c99',
  domain: 'https://www.harborline-demo.test',
  greeting:
    "Hi, I'm Riley from Harborline Heating & Plumbing. Whether it's a leak, no heat, or a quote, I can help right now. What's going on?",
  tone: 'warm, calm, reassuring and practical; short sentences; never pushy',
  services: [
    'Emergency plumbing',
    'Water heater repair & replacement',
    'Furnace tune-up',
    'AC repair',
    'Drain cleaning',
    'New HVAC system quote',
  ],
  customInstructions:
    'You are the after-hours and daytime front desk for a family-owned home services company. ' +
    'Be empathetic about emergencies and give simple safety steps first. ' +
    'Always collect full name, phone, email and service address before ending. ' +
    'Do not quote exact prices; explain that the technician gives an upfront quote before any work starts. ' +
    'Offer the next available appointment window and say the dispatcher confirms by text.',
  knowledgeBase: [
    { topic: 'Hours', content: 'Office 8 AM-5 PM Mon-Fri. Emergency plumbing and no-heat calls 24/7, including weekends.' },
    { topic: 'Service area', content: 'Harbor Valley and surrounding towns within 30 miles.' },
    { topic: 'Appointments', content: 'Morning window 8-10 AM, midday 11 AM-1 PM, afternoon 2-4 PM. Dispatcher confirms by text.' },
    { topic: 'Pricing policy', content: 'No exact prices over chat. Technician gives an upfront quote before work. Free estimates on replacements.' },
    { topic: 'Water heater leak', content: 'Safety: turn the cold-water valve on top to off, and switch the power or gas to off. Treat as urgent.' },
    { topic: 'Add-on visits', content: 'No extra trip fee when a second service is added to an existing visit.' },
    { topic: 'Financing', content: 'Financing available on new water heaters and HVAC systems, subject to approval.' },
    { topic: 'Warranty', content: 'Workmanship guaranteed for 1 year. Manufacturer warranties registered for you.' },
  ],
  languages: ['english', 'spanish'],
} as const

export const DEMO_OWNER = {
  email: process.env.DEMO_EMAIL || 'owner@harborline-demo.test',
  // Local throwaway database only. Override with DEMO_PASSWORD.
  password: process.env.DEMO_PASSWORD || 'harborline-demo-2026',
  name: 'Sam Harbor',
}

/** Fixed id so the recorder can open this exact record in the lead pipeline. */
export const HERO_RECORD_ID = 'de30da7a0000000000000001'

export const HERO_LEAD = {
  name: 'Dana Whitfield',
  email: 'dana.whitfield@example.com',
  phone: '(555) 014-2290',
  company: null,
  country: 'United States',
  purpose: 'Leaking water heater, no hot water: emergency visit tomorrow 8-10 AM, plus furnace check',
}

export const HERO_TURNS = [
  {
    user: "Hi, my water heater is leaking all over the basement and we have no hot water. Can someone come out tomorrow morning?",
    reply:
      "I'm sorry, that's stressful, especially at night. If it's safe, turn the cold-water valve on top of the heater to off, " +
      'and switch its power or gas to off. That stops the leak from getting worse. ' +
      'Good news: our first window tomorrow is 8 to 10 AM. ' +
      'Can I get your name, phone number, email and the service address so I can request it for you?',
  },
  {
    user: 'Dana Whitfield, (555) 014-2290, dana.whitfield@example.com. 41 Cedar Lane.',
    reply:
      "Thank you, Dana. I've requested the 8 to 10 AM window tomorrow for a leaking water heater at 41 Cedar Lane. " +
      'Our dispatcher will confirm by text first thing in the morning. Is there anything else I can help with?',
    lead: {
      name: HERO_LEAD.name,
      email: HERO_LEAD.email,
      phone: HERO_LEAD.phone,
      country: HERO_LEAD.country,
      purpose: 'Leaking water heater, no hot water: emergency visit tomorrow 8-10 AM',
    },
  },
  {
    // Spoken via the mic in the video (mocked transcription).
    user: '¿También revisan calefacciones? La mía hace un ruido extraño.',
    reply:
      '¡Claro que sí! Le pido al técnico que revise también su calefacción en la misma visita de mañana, ' +
      'sin cargo de traslado adicional. ¿Algo más en lo que le pueda ayudar?',
    lead: { purpose: HERO_LEAD.purpose },
  },
  {
    user: "No, that's everything. Thank you so much!",
    reply: "You're very welcome, Dana. Help is on the way, and we'll text you in the morning. Have a good night!",
    endCall: true,
  },
] as const

export const HERO_SUMMARY = {
  summary:
    'Dana Whitfield reported a leaking water heater with no hot water at 41 Cedar Lane and asked for a visit tomorrow morning. ' +
    'Riley shared safety steps, requested the 8-10 AM window, and added a furnace check after Dana asked about a noisy heater in Spanish.',
  keyPoints: [
    'Urgent: active water heater leak, no hot water',
    'Requested tomorrow 8-10 AM window at 41 Cedar Lane',
    'Add-on: furnace inspection (no extra trip fee)',
    'Customer switched to Spanish; reply in Spanish if needed',
    'Dispatcher to confirm by text at (555) 014-2290',
  ],
  nextSteps: [
    'Confirm the 8-10 AM slot by text before 7:30 AM',
    'Send a technician with water heater replacement quote options',
    'Check the furnace noise during the same visit',
  ],
}
