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
    <section className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-blue-50/30 via-white to-white px-6 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-950 font-sans">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 leading-relaxed font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}
