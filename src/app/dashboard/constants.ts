import type { LeadStatus } from '@/lib/db/call-records'

export type DashboardTabId = 'overview' | 'communications' | 'leads' | 'ai' | 'capabilities' | 'configuration' | 'tenants'

export type CountItem = {
  label: string
  count: number
}

export const baseTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'communications', label: 'Communications' },
  { id: 'leads', label: 'Lead Status' },
  { id: 'ai', label: 'AI Assisted' },
  { id: 'capabilities', label: 'Capabilities' },
] as const

export const tenantConfigurationTab = { id: 'configuration', label: 'Configuration' } as const
export const platformTenantTab = { id: 'tenants', label: 'Tenants' } as const

export const statusOptions: LeadStatus[] = ['new', 'reviewing', 'qualified', 'proposal', 'won', 'lost']
export const chartColors = ['#0891b2', '#059669', '#f59e0b', '#d946ef', '#f43f5e', '#6366f1']
export const barClasses = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-indigo-500']
export const softClasses = [
  'border-cyan-100 bg-cyan-50 text-cyan-800',
  'border-emerald-100 bg-emerald-50 text-emerald-800',
  'border-amber-100 bg-amber-50 text-amber-900',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800',
  'border-rose-100 bg-rose-50 text-rose-800',
  'border-indigo-100 bg-indigo-50 text-indigo-800',
]

export const capabilityCards = [
  {
    title: 'Conversation Intelligence',
    summary: 'Turns completed voice-agent sessions into searchable management records.',
    points: ['Transcript review', 'Intent and category classification', 'Sentiment and urgency signals', 'AI-generated summaries and key points'],
  },
  {
    title: 'Lead Operations',
    summary: 'Keeps captured prospects moving through a simple sales workflow.',
    points: ['Lead detail workspace', 'Status updates and history', 'Owner assignment', 'Follow-up dates and notes'],
  },
  {
    title: 'Executive Reporting',
    summary: 'Surfaces high-level performance indicators for leadership decisions.',
    points: ['Completed calls and captured leads', 'Hot lead volume', 'Pipeline readiness', 'Readiness score and follow-up queue'],
  },
]

export const featureCards = [
  {
    title: 'Dashboard Features',
    items: ['Date-range, search, status, quality, and urgency filters', 'CSV export for filtered records', 'Lead quality, intent, service, country, and sentiment breakdowns', 'Communication timeline with transcript previews'],
  },
  {
    title: 'Management Tools',
    items: ['Lead status selector', 'Follow-up owner and due date fields', 'Management notes', 'AI next-step recommendations and risk signals'],
  },
  {
    title: 'Voice Agent Capabilities',
    items: ['Voice and text conversations', 'Lead capture fields', 'Multilingual response behavior', 'Email call-summary notifications'],
  },
]

export const technologyGroups = [
  {
    title: 'Frontend',
    items: ['Next.js App Router', 'React 19', 'TypeScript', 'Tailwind CSS'],
  },
  {
    title: 'AI And Voice',
    items: ['OpenAI chat completions', 'OpenAI Whisper transcription', 'OpenAI TTS', 'ElevenLabs TTS option'],
  },
  {
    title: 'Data And Messaging',
    items: ['MongoDB call records', 'Nodemailer SMTP delivery', 'Server Actions', 'CSV export route'],
  },
  {
    title: 'Validation And Tooling',
    items: ['Zod validation', 'ESLint', 'PostCSS', 'tsx CLI tools'],
  },
]
