import type { ReactNode } from 'react'

export function AdminPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}
