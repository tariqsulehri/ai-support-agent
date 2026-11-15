import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import { card, cx } from './ui'

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
const STAT_TONES: Record<StatTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-[#0052ff]',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
}
const STAT_BAR: Record<StatTone, string> = {
  blue: 'bg-[#0052ff]',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
}

/**
 * KPI tile. `progress` (0–100) renders a real proportion bar; omit it when the
 * metric is not a ratio rather than drawing a decorative bar.
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
    <div className={cx(card, 'flex flex-col justify-between p-3.5 sm:p-4')}>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', STAT_TONES[tone])}>
            <Icon name={icon} className="h-3 w-3" />
          </span>
          <span className="truncate text-xs font-semibold text-slate-700">{label}</span>
        </div>
        {tooltip && <InfoTip label={label} text={tooltip} />}
      </div>

      <div className="mt-2">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-slate-950 tabular-nums sm:text-2xl">{value}</span>
          {context && <span className="text-xs font-medium text-slate-400">{context}</span>}
        </div>
        {typeof progress === 'number' && (
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={label}
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cx('h-full rounded-full transition-[width] duration-500', STAT_BAR[tone])}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      <p className="mt-1.5 truncate text-xs font-medium text-slate-500" title={detail}>
        {detail}
      </p>
    </div>
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
