export default function TenantDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_#e8efff_0%,_#f6f8fb_45%,_#f6f8fb_100%)]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading tenant settings…</span>
      <div className="h-14 border-b border-slate-200/80 bg-white" />
      <div className="flex flex-1">
        <div className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white p-4 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <main className="min-w-0 flex-1 space-y-4 px-3.5 pb-5 pt-3 sm:px-4 lg:px-5">
          <div className="rounded-2xl bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/20" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-56 max-w-full animate-pulse rounded-lg bg-white/30" />
                <div className="h-3 w-80 max-w-full animate-pulse rounded bg-white/20" />
              </div>
            </div>
          </div>
          <div className="h-[54px] animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
        </main>
      </div>
    </div>
  )
}
