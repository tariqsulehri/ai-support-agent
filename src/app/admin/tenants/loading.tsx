// Skeleton mirrors the page layout (gradient header, four KPI tiles, tab bar,
// panel) so the swap to real content does not shift the layout.
export default function TenantsLoading() {
  return (
    <main
      className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e8efff_0%,_#f6f8fb_45%,_#f6f8fb_100%)] px-3.5 pb-6 pt-4 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading tenants…</span>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#0052ff] via-[#1d4ed8] to-[#133cb4] px-5 py-6 sm:px-8 sm:py-7">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-white/20" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/30" />
            <div className="h-7 w-64 max-w-full animate-pulse rounded-lg bg-white/30" />
            <div className="h-3 w-96 max-w-full animate-pulse rounded bg-white/20" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-xl bg-slate-200/80" />
          ))}
        </div>
        <div className="h-[54px] animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
      </div>
    </main>
  )
}
