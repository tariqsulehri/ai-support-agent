'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[dashboard] render failed', error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
      <div role="alert" className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-semibold text-slate-950">The dashboard could not load</h1>
        <p className="mt-2 text-xs text-slate-500">
          This is usually a temporary database or network issue. Your data is safe.
          {error.digest && <span className="mt-1 block font-mono text-[10px] text-slate-400">Ref: {error.digest}</span>}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-[#0052ff] px-4 text-xs font-semibold text-white hover:bg-[#0047e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052ff]/40"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
