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
    <main className="min-h-dvh bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-md place-items-center">
        <section className="w-full rounded-lg border border-white/75 bg-white p-6 shadow-2xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tenant Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Tenant sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your tenant owner or tenant admin email and password to manage your agent dashboard and configuration.
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
