import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedSession } from '@/lib/auth/session'

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export const dynamic = 'force-dynamic'

export default async function TenantLoginPage({ searchParams }: LoginPageProps) {
  const session = await getVerifiedSession()
  if (session?.role === 'platform_admin') redirect('/admin/tenants')
  if (session) redirect('/dashboard')

  const params = await searchParams
  const error = params?.error
  const next = params?.next ?? '/dashboard'
  const errorMessage = error === 'role'
    ? 'This login is only for tenant users.'
    : 'Invalid tenant email or password.'

  return (
    <main className="min-h-dvh bg-[#f6f8fb] px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-5xl overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1fr_430px]">
        <section className="flex min-h-[560px] flex-col justify-between bg-[linear-gradient(135deg,#0f766e,#0891b2)] p-8 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Tenant Workspace</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">Manage your agent, leads, email, and workspace settings.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-cyan-50">
              Tenant owner and admin accounts use this portal for their own dashboard and configuration.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {['Dashboard', 'Configuration', 'Lead Activity'].map((item) => (
              <div key={item} className="rounded-md border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">{item}</p>
                <p className="mt-1 text-xs text-cyan-50">Tenant level</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace Access</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Sign in as tenant</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your tenant owner or tenant admin credentials to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          )}

          <form action="/api/admin/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="scope" value="tenant" />
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Tenant email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Tenant password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <button className="h-11 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              Sign in as tenant
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Super admin?{' '}
            <Link href="/admin/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Open admin login
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
