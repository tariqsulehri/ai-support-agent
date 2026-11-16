import { useId, type ReactNode } from 'react'
import { cardHeaderBand, cardSurface } from './surface'

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
      className={`overflow-hidden ${cardSurface} ${className}`}
    >
      {/* Same header treatment as SectionCard: brand stripe + tinted header band. */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0052ff] via-[#1d4ed8] to-[#133cb4]" aria-hidden="true" />
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 ${cardHeaderBand}`}>
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
