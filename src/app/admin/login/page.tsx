import { redirect } from 'next/navigation'
import { getVerifiedSession } from '@/lib/auth/session'
import { SupportAgentSplitLogin } from '@/components/auth/support-agent-split-login'

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const session = await getVerifiedSession()
  if (session?.role === 'platform_admin') redirect('/admin/tenants')
  if (session) redirect('/dashboard')

  const params = await searchParams
  const error = params?.error
  const next = params?.next ?? '/admin/tenants'
  const errorMessage =
    error === 'role'
      ? 'This login is only for the super admin account.'
      : error === 'rate_limit'
        ? 'Too many failed login attempts. Please wait 15 minutes before trying again.'
        : 'Invalid admin credentials.'

  return (
    <SupportAgentSplitLogin
      scope="platform"
      next={next}
      error={error}
      errorMessage={errorMessage}
    />
  )
}
