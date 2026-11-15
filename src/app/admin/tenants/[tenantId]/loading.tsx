export default function TenantDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f8fafc]" aria-busy="true" aria-live="polite">
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
        <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-6">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-blue-50" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-56 max-w-full animate-pulse rounded-lg bg-slate-200" />
                <div className="h-3 w-80 max-w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-36 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-slate-200/90 bg-white" />
        </main>
      </div>
    </div>
  )
}
