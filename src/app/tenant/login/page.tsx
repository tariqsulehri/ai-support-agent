import { redirect } from 'next/navigation'
import { getVerifiedSession } from '@/lib/auth/session'
import { CalibrSplitLogin } from '@/components/auth/calibr-split-login'

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
  const errorMessage =
    error === 'role'
      ? 'This login is only for tenant accounts.'
      : error === 'rate_limit'
        ? 'Too many failed login attempts. Please wait 15 minutes before trying again.'
        : 'Invalid username or password.'

  return (
    <CalibrSplitLogin
      scope="tenant"
      next={next}
      error={error}
      errorMessage={errorMessage}
    />
  )
}
