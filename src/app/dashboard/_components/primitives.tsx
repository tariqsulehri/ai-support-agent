import type { ReactNode } from 'react'
import { GradientStatTile, type GradientTone } from '@/components/admin/gradient-tile'
import { cardHeaderBand } from '@/components/admin/surface'
import { Icon, type IconName } from './icons'
import { card, cx, sectionTitle } from './ui'

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'blue' | 'purple' | 'cyan' | 'indigo'

const BADGE_TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-400' },
  good: { pill: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  warn: { pill: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  bad: { pill: 'border-rose-200 bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
  blue: { pill: 'border-blue-200 bg-blue-50 text-[#0052ff]', dot: 'bg-[#0052ff]' },
  purple: { pill: 'border-purple-200 bg-purple-50 text-purple-800', dot: 'bg-purple-500' },
  indigo: { pill: 'border-indigo-200 bg-indigo-50 text-indigo-800', dot: 'bg-indigo-500' },
  cyan: { pill: 'border-cyan-200 bg-cyan-50 text-cyan-800', dot: 'bg-cyan-500' },
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: Tone }) {
  const t = BADGE_TONES[tone] ?? BADGE_TONES.blue
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', t.pill)}>
      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} aria-hidden="true" />
      {children}
    </span>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cx(card, 'overflow-hidden', className)}>{children}</section>
}

const HEADER_ICON_TONES = {
  blue: 'border-blue-200 bg-white text-[#0052ff]',
  rose: 'border-rose-200 bg-white text-rose-600',
  emerald: 'border-emerald-200 bg-white text-emerald-700',
  violet: 'border-violet-200 bg-white text-violet-700',
} as const

/** Tinted header band for a Panel: optional icon, title, description and actions. */
export function PanelHeader({
  title,
  description,
  icon,
  iconTone = 'blue',
  actions,
}: {
  title: string
  description?: ReactNode
  icon?: IconName
  iconTone?: keyof typeof HEADER_ICON_TONES
  actions?: ReactNode
}) {
  return (
    <div className={cx('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6', cardHeaderBand)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm', HEADER_ICON_TONES[iconTone])} aria-hidden="true">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className={sectionTitle}>{title}</h2>
          {description && <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className={cx(card, 'flex flex-col items-center gap-1 px-6 py-10 text-center')}>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** CSS-only tooltip, reachable by keyboard (focus) as well as hover. */
export function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group/tip relative inline-flex shrink-0">
      <button
        type="button"
        className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052ff]/40"
        aria-label={`About ${label}: ${text}`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm.75 3.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-52 rounded-lg bg-slate-900 p-2.5 text-xs font-medium leading-relaxed text-white shadow-xl group-focus-within/tip:block group-hover/tip:block"
      >
        {text}
      </span>
    </span>
  )
}

type StatTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple'
const STAT_GRADIENTS: Record<StatTone, GradientTone> = {
  blue: 'blue',
  emerald: 'emerald',
  amber: 'amber',
  rose: 'rose',
  purple: 'violet',
}

/**
 * KPI tile, rendered with the shared admin gradient tile so the dashboard and
 * admin screens share one look. `progress` (0–100) draws a real share ring;
 * omit it when the metric is not a ratio.
 */
export function StatCard({
  label,
  value,
  context,
  detail,
  tone = 'blue',
  icon = 'overview',
  tooltip,
  progress,
}: {
  label: string
  value: string | number
  context?: string
  detail: string
  tone?: StatTone
  icon?: IconName
  tooltip?: string
  progress?: number
}) {
  return (
    <GradientStatTile
      label={label}
      value={value}
      context={context}
      detail={detail}
      tone={STAT_GRADIENTS[tone]}
      icon={icon}
      tooltip={tooltip}
      progress={progress}
    />
  )
}

export function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

export function toneForQuality(value: string): Tone {
  if (value === 'hot') return 'warn'
  if (value === 'warm') return 'good'
  if (value === 'cold') return 'purple'
  return 'neutral'
}

export function toneForUrgency(value: string): Tone {
  if (value === 'high') return 'bad'
  if (value === 'medium') return 'warn'
  if (value === 'low') return 'cyan'
  return 'neutral'
}

export function toneForSentiment(value: string): Tone {
  if (value === 'positive') return 'good'
  if (value === 'negative') return 'bad'
  return 'neutral'
}
