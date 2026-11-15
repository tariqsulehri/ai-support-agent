import type { ReactNode } from 'react'

const pillTones = {
  blue: 'border-blue-200/90 bg-blue-50 text-[#0052ff]',
  indigo: 'border-indigo-200/90 bg-indigo-50 text-indigo-800',
  emerald: 'border-emerald-200/90 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200/90 bg-amber-50 text-amber-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
} as const

export function Pill({ tone = 'slate', children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${pillTones[tone]}`}>
      {children}
    </span>
  )
}

export function InfoList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-slate-100 text-xs">{children}</dl>
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-all text-right font-semibold text-slate-800">{children}</dd>
    </div>
  )
}

export function CodeBlock({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <pre
      className={`overflow-x-auto rounded-xl p-3.5 font-mono text-xs leading-relaxed ${
        tone === 'dark'
          ? 'border border-slate-800 bg-[#121417] text-blue-200'
          : 'border border-slate-200 bg-slate-50 text-slate-800'
      }`}
    >
      {children}
    </pre>
  )
}

export function MutedNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">{children}</p>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h3>
}

export function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return withTime
    ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
    : date.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
}
