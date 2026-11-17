'use client'

import { useEffect } from 'react'
import { embedThemeVars, normalizeFont, normalizeHex, normalizeMode, normalizeRadius } from '@/lib/theme/embed-theme'

export interface ThemeColors {
  primary?:   string  // hex, e.g. '#007bff'
  primaryDk?: string
  primaryLt?: string
  primaryMd?: string
}

interface ThemeMessage {
  colors?: ThemeColors
  font?:   string
  radius?: number | string
  mode?:   string
}

function hexToChannels(hex: string | undefined): string | null {
  const v = normalizeHex(hex)
  return v ? `${parseInt(v.slice(1, 3), 16)} ${parseInt(v.slice(3, 5), 16)} ${parseInt(v.slice(5, 7), 16)}` : null
}

function applyTheme(message: ThemeMessage) {
  const root = document.documentElement
  const colors = message.colors && typeof message.colors === 'object' ? message.colors : {}

  const vars = embedThemeVars({
    primary: normalizeHex(colors.primary),
    font:    normalizeFont(message.font),
    radius:  normalizeRadius(message.radius),
    mode:    normalizeMode(message.mode),
  })
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)

  // Explicit shade overrides from the parent page win over derived shades.
  const overrides: [string, string | undefined][] = [
    ['-dk', colors.primaryDk], ['-lt', colors.primaryLt], ['-md', colors.primaryMd],
  ]
  for (const [suffix, hex] of overrides) {
    const ch = hexToChannels(hex)
    if (!ch) continue
    root.style.setProperty(`--va-primary${suffix}`, ch)
    root.style.setProperty(`--va-teal${suffix}`, ch)
  }
}

/**
 * Receives live theme updates from the embedding page. The initial theme is
 * rendered server-side from URL params (see app/voice/page.tsx), so this only
 * handles `voice-agent:theme` messages, e.g. from the legacy embed.js loader.
 */
export function ThemeProvider() {
  useEffect(() => {
    const isEmbedded = window.parent && window.parent !== window
    if (isEmbedded) window.parent.postMessage({ type: 'voice-agent:ready' }, '*')

    function onMessage(e: MessageEvent) {
      // Only the embedding page may restyle the widget.
      if (!isEmbedded || e.source !== window.parent) return
      if (e.data?.type === 'voice-agent:theme' && e.data && typeof e.data === 'object') {
        applyTheme(e.data as ThemeMessage)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return null
}
