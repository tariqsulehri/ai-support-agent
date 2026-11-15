import type { LeadStatus } from '@/lib/db/call-records'

export type DashboardTabId = 'overview' | 'communications' | 'leads' | 'ai' | 'capabilities' | 'configuration' | 'tenants'

export type CountItem = {
  label: string
  count: number
}

export interface TabDefinition {
  id: DashboardTabId
  label: string
  num: number
  description: string
  badgeText: string
}

export const baseTabs: TabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    num: 1,
    description: 'Executive summary of voice-agent conversations, lead readiness, and volume metrics.',
    badgeText: 'Metrics',
  },
  {
    id: 'communications',
    label: 'Communications',
    num: 2,
    description: 'Recorded conversations with transcripts, summaries, and sentiment signals.',
    badgeText: 'Call Intelligence',
  },
  {
    id: 'leads',
    label: 'Lead Status',
    num: 3,
    description: 'Captured prospect pipelines, urgency scoring, and follow-up commitments.',
    badgeText: 'Pipeline Operations',
  },
  {
    id: 'ai',
    label: 'AI Assisted',
    num: 4,
    description: 'Recommendations, risk signals, and the priority follow-up queue derived from your data.',
    badgeText: 'Automation Layer',
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    num: 5,
    description: 'What the voice agent and dashboard can do, and the technology behind them.',
    badgeText: 'Platform Core',
  },
]

export const tenantConfigurationTab: TabDefinition = {
  id: 'configuration',
  label: 'Configuration',
  num: 6,
  description: 'Tenant profile, OpenAI API keys, MongoDB URL, and website embed snippets.',
  badgeText: 'Tenant Settings',
}

export const platformTenantTab: TabDefinition = {
  id: 'tenants',
  label: 'Tenants',
  num: 6,
  description: 'Global tenant management, subscription tiers, and domain whitelist governance.',
  badgeText: 'Platform Control',
}

export const statusOptions: LeadStatus[] = ['new', 'reviewing', 'qualified', 'proposal', 'won', 'lost']
export const chartColors = ['#0052ff', '#6e19eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']
export const barClasses = ['bg-[#0052ff]', 'bg-[#6e19eb]', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-blue-500']
export const softClasses = [
  'border-blue-100 bg-blue-50 text-[#0052ff]',
  'border-purple-100 bg-purple-50 text-[#6e19eb]',
  'border-cyan-100 bg-cyan-50 text-cyan-800',
  'border-emerald-100 bg-emerald-50 text-emerald-800',
  'border-amber-100 bg-amber-50 text-amber-900',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-800',
  'border-blue-100 bg-blue-50 text-blue-800',
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
