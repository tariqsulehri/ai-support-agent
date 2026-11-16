// Shared button styles; server-safe (no 'use client') so both server and
// client components can use them.

const variants = {
  primary:
    'bg-[#0052ff] text-white shadow-[0_2px_8px_rgba(0,82,255,0.30)] hover:bg-[#0043d9] focus-visible:ring-[#0052ff]/40',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300',
  dark: 'bg-slate-800 text-white shadow-sm hover:bg-slate-900 focus-visible:ring-slate-400',
  warning:
    'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-300',
  success:
    'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-300',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-xs',
  lg: 'h-11 px-5 text-sm',
  /** Square icon-only button; pair with sr-only text for the accessible name. */
  icon: 'h-8 w-8 p-0 text-xs',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return `inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${extra}`
}
