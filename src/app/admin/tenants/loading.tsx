export default function TenantsLoading() {
  return (
    <main className="min-h-dvh bg-[#f6f8fb] px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading tenants…</span>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="rounded-xl border border-slate-200/90 bg-white p-6">
          <div className="h-3 w-24 animate-pulse rounded bg-blue-100" />
          <div className="mt-2 h-7 w-64 max-w-full animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-2 h-3 w-96 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200/90 bg-white" />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-xl border border-slate-200/90 bg-white" />
        <div className="h-96 animate-pulse rounded-xl border border-slate-200/90 bg-white" />
      </div>
    </main>
  )
}
