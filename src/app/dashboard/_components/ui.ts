/**
 * Shared class tokens for the dashboard. Keeping them in one place keeps buttons,
 * inputs and cards visually consistent and avoids 300-character class strings
 * being copy-pasted (and drifting) across components.
 */
export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052ff]/40 focus-visible:ring-offset-1'

export const card = 'rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]'

export const btnBase = cx(
  'inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors duration-100',
  'disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px',
  focusRing
)

export const btnPrimary = cx(btnBase, 'h-9 px-4 bg-[#0052ff] text-white shadow-sm hover:bg-[#0047e1]')
export const btnSecondary = cx(
  btnBase,
  'h-9 px-4 border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300'
)
export const btnGhost = cx(btnBase, 'h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-900')

export const fieldLabel = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500'

export const inputBase = cx(
  'w-full rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 shadow-xs',
  'outline-none transition-colors hover:border-slate-300 focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/15',
  'disabled:opacity-60'
)
export const input = cx(inputBase, 'h-9 px-3')
export const select = cx(inputBase, 'h-9 px-3 cursor-pointer')

export const sectionTitle = 'text-base font-semibold tracking-tight text-slate-950'
export const muted = 'text-xs text-slate-500'
