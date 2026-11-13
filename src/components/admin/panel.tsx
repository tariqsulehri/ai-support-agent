import type { ReactNode } from 'react'

export function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
      <div className="h-1 bg-[linear-gradient(90deg,#194ad9,#6e19eb,#06b6d4)]" />
      <div className="p-5">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}
