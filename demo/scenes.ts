/**
 * Single source of truth for the demo video.
 *
 * - demo/voiceover.ts reads `voiceover` to generate one audio file per scene.
 * - demo/record.ts reads `minSeconds` (or the generated audio length, whichever is
 *   longer) to decide how long to hold each scene on screen.
 * - demo/remotion reads `caption` for the on-screen lower-third captions.
 *
 * Edit the words here, then re-run voiceover -> record -> build.
 *
 * Everything shown is fictional: "Harborline Heating & Plumbing" is a made-up demo
 * company, and all names, emails (example.com) and phone numbers (555-01xx) are fake.
 */

export type SceneId =
  | 'hook'
  | 'solution'
  | 'answers'
  | 'lead-capture'
  | 'voice-language'
  | 'summary'
  | 'dashboard'
  | 'pipeline'
  | 'insights'
  | 'customize'
  | 'results'
  | 'cta'

export interface Scene {
  id: SceneId
  title: string
  /** Minimum time on screen. The recorder extends this to fit the narration audio. */
  minSeconds: number
  /** Short on-screen caption (lower third). Keep it under ~60 characters. */
  caption: string
  /** What the viewer sees. Documentation only. */
  onScreen: string
  /** Exact action the recorder performs. Documentation only. */
  action: string
  /** Narration: simple, benefit-first, no jargon. */
  voiceover: string
  /** Rendered by Remotion/ffmpeg as a full-screen card instead of a screen recording. */
  card?: boolean
}

export const BRAND = {
  product: 'AI Front Desk',
  demoCompany: 'Harborline Heating & Plumbing',
  agentName: 'Riley',
  cta: 'Book a free 15-minute demo',
  ctaSub: 'We set it up on your website, trained on your services.',
  ctaUrl: 'yourdomain.com/demo', // TODO: replace with your booking link (Calendly, HubSpot, etc.)
  primary: '#194ad9',
  accent: '#4CBAAB',
} as const

export const SCENES: Scene[] = [
  {
    id: 'hook',
    title: 'The missed call',
    minSeconds: 14,
    caption: '9:47 PM. The office is closed.',
    onScreen: 'Harborline website at night; "Office hours 8am-5pm" banner; phone icon shows "Missed call".',
    action: 'Open demo site, slow scroll over the hero and the closed-hours banner.',
    voiceover:
      "It's nine forty-seven at night. A customer's water heater just burst. " +
      "They visit your website, call, and get voicemail. So they call the next company on the list. " +
      'That job is gone, and it happens more often than you think.',
  },
  {
    id: 'solution',
    title: 'Meet your AI front desk',
    minSeconds: 12,
    caption: 'Answers every visitor, 24/7',
    onScreen: 'Cursor clicks "Chat with us"; the assistant opens and greets the visitor by company name.',
    action: 'Click the "Chat with us" launcher; wait for the greeting.',
    voiceover:
      'Now imagine someone answered, every time. ' +
      'This is your AI front desk. It sits on your website and greets every visitor in seconds, day or night, ' +
      'like a friendly member of your team.',
  },
  {
    id: 'answers',
    title: 'Real answers about your business',
    minSeconds: 18,
    caption: 'Knows your services, hours and policies',
    onScreen: 'Visitor types their problem; the assistant replies with emergency options and a booking window.',
    action: 'Type the leak message, send, let the reply stream in.',
    voiceover:
      'Customers describe their problem in their own words. ' +
      'The assistant answers using your services, your hours and your policies, ' +
      'and it moves the conversation toward a booking instead of a dead end.',
  },
  {
    id: 'lead-capture',
    title: 'Every lead captured',
    minSeconds: 16,
    caption: 'Name, phone, email and the job, captured automatically',
    onScreen: 'Visitor shares contact details; the Contact Details card fills in live.',
    action: 'Type name/phone/email/address, send; pause on the Contact Details card.',
    voiceover:
      'While it helps, it collects what your team needs: name, phone, email and exactly what the job is. ' +
      'No forms, and nobody slips away without leaving their details.',
  },
  {
    id: 'voice-language',
    title: 'Talk or type, in their language',
    minSeconds: 15,
    caption: 'Voice or text, in 15+ languages',
    onScreen: 'Visitor holds the mic and asks in Spanish; the assistant replies in Spanish.',
    action: 'Hold the mic button for about 2.5s, release; the Spanish question and reply appear.',
    voiceover:
      'Visitors can type or just talk. ' +
      'And if they switch to Spanish, or many other languages, the assistant switches with them.',
  },
  {
    id: 'summary',
    title: 'Instant summary for your team',
    minSeconds: 13,
    caption: 'A clear summary lands in your inbox',
    onScreen: 'Conversation wraps up; a call summary with key points appears.',
    action: 'Type the thank-you message; wait for the summary card and scroll to it.',
    voiceover:
      'When the chat ends, your team gets a short summary: who it was, what they need, and how urgent it is. ' +
      'Your morning starts with booked jobs, not voicemails.',
  },
  {
    id: 'dashboard',
    title: 'One dashboard for every conversation',
    minSeconds: 16,
    caption: 'See every inquiry, lead and hot opportunity',
    onScreen: 'Owner signs in; Overview shows conversations, lead capture rate, hot leads and charts.',
    action: 'Sign in as the demo owner; hover the KPI cards; slow scroll to the charts.',
    voiceover:
      'Everything flows into one simple dashboard. ' +
      'See how many people reached out, how many became leads, and which ones are ready to book right now.',
  },
  {
    id: 'pipeline',
    title: 'Follow up, assign, close',
    minSeconds: 17,
    caption: 'Assign, schedule follow-ups, track every job',
    onScreen: "Lead pipeline opens on tonight's water-heater lead; status moves from New to Qualified.",
    action: 'Open the lead pipeline on the hero lead; change status to Qualified.',
    voiceover:
      "Open tonight's lead and everything is there, including the full conversation. " +
      'Assign it to your dispatcher, set a follow-up time, and move it through your pipeline. Nothing slips through the cracks.',
  },
  {
    id: 'insights',
    title: 'It tells you what needs attention',
    minSeconds: 13,
    caption: 'Smart reminders: who to call back first',
    onScreen: 'AI insights tab: recommendations, risk signals and the priority follow-up queue.',
    action: 'Open the AI insights tab; slow scroll through recommendations and the follow-up queue.',
    voiceover:
      'It even points out what needs attention, like overdue callbacks and your hottest leads, ' +
      'so the right customer gets a call first.',
  },
  {
    id: 'customize',
    title: 'Sounds like your business',
    minSeconds: 13,
    caption: 'Your services, your tone, your brand colors',
    onScreen: 'Agent setup: name, greeting, tone, services and knowledge base entries.',
    action: 'Open the agent settings page; slow scroll over services and knowledge base.',
    voiceover:
      'You stay in control. Set the greeting, the tone, your services and your answers to common questions. ' +
      'It matches your brand and goes live on your site with one small snippet.',
  },
  {
    id: 'results',
    title: 'What you get',
    minSeconds: 12,
    caption: 'Never miss a website lead again',
    onScreen: 'Full-screen card: three benefit lines.',
    action: 'Title card (rendered, not recorded).',
    voiceover:
      'Every visitor answered, around the clock. Every lead captured with real contact details. ' +
      'And a team that spends its time on jobs, not chasing missed calls.',
    card: true,
  },
  {
    id: 'cta',
    title: 'Call to action',
    minSeconds: 10,
    caption: 'Book a free 15-minute demo',
    onScreen: 'Full-screen CTA card with the booking link.',
    action: 'Title card (rendered, not recorded).',
    voiceover:
      "Want to see it answering your customers? Book a free fifteen-minute demo. " +
      "We'll set it up with your services, so you can try it on your own website.",
    card: true,
  },
]

/** Scenes captured by the Playwright recorder (cards are rendered separately). */
export const RECORDED_SCENES = SCENES.filter((s) => !s.card)
