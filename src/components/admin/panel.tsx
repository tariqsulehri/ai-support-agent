import type { ReactNode } from 'react'

export function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
