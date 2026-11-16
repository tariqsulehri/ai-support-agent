/**
 * Instant navigation feedback. Because this boundary exists, <Link> prefetches the
 * dashboard shell, so tab, filter and pagination clicks paint this skeleton
 * immediately instead of waiting for the server render.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>
      <div className="h-14 border-b border-slate-200/80 bg-white" />
      <div className="flex flex-1">
        <div className="hidden w-60 shrink-0 border-r border-slate-200/80 bg-white p-4 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3.5 px-3.5 pb-5 pt-3 sm:px-4 lg:px-5">
          {/* Unified header: gradient title area + attached filter toolbar. */}
          <div>
            <div className="h-[86px] animate-pulse rounded-t-2xl bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] opacity-80" />
            <div className="h-[58px] animate-pulse rounded-b-2xl border border-t-0 border-slate-200/80 bg-white" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
