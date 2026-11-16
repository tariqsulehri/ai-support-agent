import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/app/dashboard/_components/icons'
import { cardSurface } from './surface'

// Server-safe presentational primitives for admin overview screens:
// gradient KPI tiles and a matching section card. One source for the look so
// every admin screen gets the same tile and card treatment.

export type GradientTone = 'blue' | 'emerald' | 'amber' | 'slate' | 'violet' | 'rose'

// Tone stops are dark enough that white label text keeps ≥ 4.5:1 contrast.
const TILE_TONES: Record<GradientTone, { tile: string; glow: string }> = {
  blue: { tile: 'from-[#0052ff] via-[#1d4ed8] to-[#133cb4]', glow: 'shadow-[0_10px_28px_-10px_rgba(0,82,255,0.55)]' },
  emerald: { tile: 'from-emerald-700 via-emerald-700 to-teal-800', glow: 'shadow-[0_10px_28px_-10px_rgba(5,150,105,0.55)]' },
  amber: { tile: 'from-amber-700 via-orange-700 to-orange-800', glow: 'shadow-[0_10px_28px_-10px_rgba(234,88,12,0.55)]' },
  slate: { tile: 'from-slate-600 via-slate-700 to-slate-900', glow: 'shadow-[0_10px_28px_-10px_rgba(51,65,85,0.55)]' },
  violet: { tile: 'from-violet-600 via-violet-700 to-indigo-800', glow: 'shadow-[0_10px_28px_-10px_rgba(109,40,217,0.55)]' },
  rose: { tile: 'from-rose-600 via-rose-700 to-rose-800', glow: 'shadow-[0_10px_28px_-10px_rgba(225,29,72,0.55)]' },
}

const ICON_TONES: Record<GradientTone, string> = {
  blue: 'from-[#0052ff] to-[#133cb4] shadow-[0_4px_12px_rgba(0,82,255,0.35)]',
  emerald: 'from-emerald-500 to-teal-700 shadow-[0_4px_12px_rgba(5,150,105,0.35)]',
  amber: 'from-amber-500 to-orange-700 shadow-[0_4px_12px_rgba(234,88,12,0.35)]',
  slate: 'from-slate-500 to-slate-800 shadow-[0_4px_12px_rgba(51,65,85,0.35)]',
  violet: 'from-violet-500 to-indigo-700 shadow-[0_4px_12px_rgba(109,40,217,0.35)]',
  rose: 'from-rose-500 to-rose-700 shadow-[0_4px_12px_rgba(225,29,72,0.35)]',
}

// Tinted header band per tone so a card's header reads clearly as a header.
const HEADER_TONES: Record<GradientTone, string> = {
  blue: 'from-blue-50 via-indigo-50/70 to-slate-50 border-blue-100',
  emerald: 'from-emerald-50 via-teal-50/70 to-slate-50 border-emerald-100',
  amber: 'from-amber-50 via-orange-50/70 to-slate-50 border-amber-100',
  slate: 'from-slate-100 via-slate-50 to-slate-50 border-slate-200',
  violet: 'from-violet-50 via-indigo-50/70 to-slate-50 border-violet-100',
  rose: 'from-rose-50 via-pink-50/70 to-slate-50 border-rose-100',
}

const clamp = (value: number) => Math.min(100, Math.max(0, value))

/** Compact share ring for KPI tiles; percentage is drawn in the middle. */
function ShareRing({ value, label }: { value: number; label: string }) {
  const size = 48
  const stroke = 4.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = clamp(value)
  return (
    <div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center"
      role="progressbar"
      aria-label={`${label} share`}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums">{Math.round(pct)}%</span>
    </div>
  )
}

/** Keyboard- and hover-reachable info tip styled for gradient backgrounds. */
function TileInfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group/tip relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`About ${label}: ${text}`}
        className="rounded-full p-0.5 text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm.75 3.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-52 rounded-lg bg-slate-900 p-2.5 text-xs font-medium normal-case leading-relaxed tracking-normal text-white shadow-xl group-focus-within/tip:block group-hover/tip:block"
      >
        {text}
      </span>
    </span>
  )
}

/**
 * Gradient KPI tile in a dashboard layout: icon + label header, value with
 * context on the left, share ring on the right, and a status footer.
 */
export function GradientStatTile({
  label,
  value,
  context,
  detail,
  tone = 'blue',
  icon,
  progress,
  tooltip,
}: {
  label: string
  value: number | string
  /** Small text after the value, e.g. "of 6". */
  context?: string
  detail?: string
  tone?: GradientTone
  icon: IconName
  progress?: number
  /** Explains how the metric is calculated; shown on hover/focus of an info icon. */
  tooltip?: string
}) {
  const { tile, glow } = TILE_TONES[tone]
  return (
    <div
      className={`relative isolate flex h-full flex-col rounded-xl bg-gradient-to-br p-3.5 text-white transition-transform duration-200 hover:-translate-y-0.5 sm:p-4 ${tile} ${glow}`}
    >
      {/* Decorative light blooms, clipped to the tile so tooltips can still overflow it. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl">
        <span className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10" />
        <span className="absolute -bottom-14 right-10 h-24 w-24 rounded-full bg-black/10" />
      </span>

      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
          <Icon name={icon} className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-white/90">{label}</p>
        {tooltip && <TileInfoTip label={label} text={tooltip} />}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-2xl font-bold leading-none tabular-nums tracking-tight sm:text-3xl">{value}</span>
          {context && <span className="truncate text-xs font-medium text-white/80">{context}</span>}
        </p>
        {typeof progress === 'number' && <ShareRing value={progress} label={label} />}
      </div>

      {detail && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-white/15 pt-2 text-xs font-medium text-white/85">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" aria-hidden="true" />
          <span className="truncate" title={detail}>{detail}</span>
        </p>
      )}
    </div>
  )
}

/** Gradient icon badge used in section card headers and tab chips. */
export function GradientIcon({ icon, tone = 'blue', size = 'md' }: { icon: IconName; tone?: GradientTone; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl'
  const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <span className={`flex shrink-0 items-center justify-center bg-gradient-to-br text-white ${box} ${ICON_TONES[tone]}`} aria-hidden="true">
      <Icon name={icon} className={glyph} />
    </span>
  )
}

/** Component card with a gradient-accented header: icon, title, description, badge and actions. */
export function SectionCard({
  title,
  description,
  icon,
  tone = 'blue',
  badge,
  actions,
  toolbar,
  children,
}: {
  title: string
  description?: ReactNode
  icon: IconName
  tone?: GradientTone
  badge?: ReactNode
  actions?: ReactNode
  /** Controls (filters, search) shown in the header band under the title row. */
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={`overflow-hidden ${cardSurface}`}>
      <div className={`h-1 w-full bg-gradient-to-r ${TILE_TONES[tone].tile}`} aria-hidden="true" />
      <header className={`border-b bg-gradient-to-r px-4 py-4 sm:px-6 ${HEADER_TONES[tone]}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <GradientIcon icon={icon} tone={tone} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-slate-950">{title}</h2>
              {badge}
            </div>
            {description && <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {toolbar && <div className="mt-4 border-t border-white/80 pt-4">{toolbar}</div>}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  )
}

/** Small count pill for card headers and tabs. */
export function CountPill({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        inverted ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </span>
  )
}
