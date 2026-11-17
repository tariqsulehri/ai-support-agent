import { isEmbedAuthEnabled, validateEmbedQuery } from '@/lib/security/embed-auth'
import { getDefaultTenant } from '@/lib/tenants/registry'
import { VoiceAgentWidget } from '@/components/voice-agent/widget'
import { ThemeProvider } from '@/components/voice-agent/theme-provider'
import { embedThemeCss, googleFontHref, parseEmbedTheme } from '@/lib/theme/embed-theme'

interface VoicePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function VoicePage({ searchParams }: VoicePageProps) {
  const params          = (await searchParams) ?? {}
  const requestedTenant = typeof params.tenant === 'string' ? params.tenant : undefined
  const defaultTenant   = !requestedTenant ? await getDefaultTenant() : null
  const tenantId        = requestedTenant ?? defaultTenant?.id ?? 'ai-scripto'
  const token           = typeof params.token        === 'string' ? params.token        : undefined
  const sessionToken = typeof params.session     === 'string' ? params.session      : undefined
  const modeParam = typeof params.mode === 'string' ? params.mode : undefined
  const launcherParam = typeof params.launcher === 'string' ? params.launcher : undefined
  const marginParam = typeof params.margin === 'string' ? params.margin : undefined
  const mode = modeParam === 'floating' || launcherParam === 'true' ? 'floating' : 'inline'
  const margin = marginParam === 'none' || marginParam === 'sm' || marginParam === 'md' ? marginParam : undefined

  // ── Theme borrowed from the embedding site (validated; see lib/theme/embed-theme.ts) ──
  const theme      = parseEmbedTheme(params)
  const themeStyle = embedThemeCss(theme)
  const fontHref   = googleFontHref(theme.font)

  const auth = await validateEmbedQuery(tenantId, token, sessionToken)

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
    <>
      {/* Zero-FOUC theme injection — applied before JS hydrates */}
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      {fontHref && <link rel="stylesheet" href={fontHref} precedence="default" />}

      {/* Listens for voice-agent:theme postMessage from the parent page */}
      <ThemeProvider />

      <main className="min-h-dvh bg-ms-surface">
        <VoiceAgentWidget tenantId={tenantId} token={token} sessionToken={sessionToken} mode={mode} margin={margin} />
      </main>
    </>
  )
}
