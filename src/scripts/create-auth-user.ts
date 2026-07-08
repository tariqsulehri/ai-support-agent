import './load-env'
import { upsertAuthUser } from '../lib/auth/users'
import type { AuthRole } from '../lib/auth/types'

function readRole(value: string | undefined): AuthRole {
  const role = value as AuthRole | undefined
  if (
    role === 'platform_admin' ||
    role === 'tenant_owner' ||
    role === 'tenant_admin' ||
    role === 'tenant_viewer'
  ) {
    return role
  }
  return 'platform_admin'
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME
  const role = readRole(process.env.ADMIN_ROLE)
  const tenantId = process.env.ADMIN_TENANT_ID
  const minPasswordLength = process.env.NODE_ENV === 'production' ? 10 : 4

  if (!email?.trim()) throw new Error('ADMIN_EMAIL is required.')
  if (!password || password.length < minPasswordLength) {
    throw new Error(`ADMIN_PASSWORD is required and must be at least ${minPasswordLength} characters.`)
  }
  if (role !== 'platform_admin' && !tenantId?.trim()) {
    throw new Error('ADMIN_TENANT_ID is required for tenant roles.')
  }

  const user = await upsertAuthUser({
    email,
    password,
    name,
    role,
    tenantId,
  })

  console.info('[auth:user:create] saved', {
    userId: user.userId,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  })
}

main().catch((err) => {
  console.error('[auth:user:create] failed', err)
  process.exitCode = 1
})
