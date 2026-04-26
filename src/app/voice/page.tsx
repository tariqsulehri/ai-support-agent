import { VoiceAgent } from '@/components/voice-agent'
import { isEmbedAuthEnabled, validateEmbedQuery } from '@/lib/security/embed-auth'

interface VoicePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function VoicePage({ searchParams }: VoicePageProps) {
  const params = (await searchParams) ?? {}
  const tenant = typeof params.tenant === 'string' ? params.tenant : undefined
  const token  = typeof params.token  === 'string' ? params.token  : undefined

  const auth = validateEmbedQuery(tenant, token)

  if (isEmbedAuthEnabled() && !auth.ok) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-xl border border-red-700 bg-red-900/30 px-5 py-4 text-red-200">
          <h1 className="text-base font-semibold">Access denied</h1>
          <p className="mt-2 text-sm">
            This embed link is invalid or expired. Please contact support for a valid tenant URL.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-start py-8">
      {/* tenant + token are forwarded as data attrs so the client hook can
          include them in every API request header automatically */}
      <VoiceAgent tenantId={tenant} token={token} />
    </main>
  )
}
