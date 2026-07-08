import { redirect } from 'next/navigation'
import { getVerifiedSession } from '@/lib/auth/session'

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const session = await getVerifiedSession()
  if (session) redirect('/dashboard')

  const params = await searchParams
  const error = params?.error
  const next = params?.next ?? '/dashboard'

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-md place-items-center">
        <section className="w-full rounded-lg bg-white p-6 shadow-2xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Voice Agent Admin</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Access tenant dashboards and platform administration.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Invalid email or password.
            </div>
          )}

          <form action="/api/admin/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
            <button className="h-11 w-full rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700">
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
