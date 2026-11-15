import { useId, type ReactNode } from 'react'

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
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={`overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-blue-50/30 via-white to-white px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id={headingId} className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-3.5 sm:p-5">{children}</div>
    </section>
  )
}
