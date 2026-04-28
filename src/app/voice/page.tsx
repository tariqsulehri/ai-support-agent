import { isEmbedAuthEnabled, validateEmbedQuery } from '@/lib/security/embed-auth'
import { VoiceAgentWidget } from '@/components/voice-agent/widget'

interface VoicePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function VoicePage({ searchParams }: VoicePageProps) {
  const params   = (await searchParams) ?? {}
  const tenantId = typeof params.tenant === 'string' ? params.tenant : undefined
  const token    = typeof params.token  === 'string' ? params.token  : undefined
  const modeParam = typeof params.mode === 'string' ? params.mode : undefined
  const launcherParam = typeof params.launcher === 'string' ? params.launcher : undefined
  const marginParam = typeof params.margin === 'string' ? params.margin : undefined
  const mode = modeParam === 'inline' || launcherParam === 'false' ? 'inline' : 'floating'
  const margin = marginParam === 'none' || marginParam === 'sm' || marginParam === 'md'
    ? marginParam
    : undefined

  const auth = validateEmbedQuery(tenantId, token)

  if (isEmbedAuthEnabled() && !auth.ok) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-surface p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-ms-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-ms-text mb-1">Access Denied</h1>
          <p className="text-sm text-ms-sub">
            This link is invalid or has expired. Please contact support for a valid access link.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-surface">
      <VoiceAgentWidget tenantId={tenantId} token={token} mode={mode} margin={margin} />
    </main>
  )
}
