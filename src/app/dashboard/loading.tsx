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
        <div className="min-w-0 flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="h-[86px] animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="h-[84px] animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
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
