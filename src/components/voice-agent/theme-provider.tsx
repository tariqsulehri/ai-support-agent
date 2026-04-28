'use client'

import { useEffect } from 'react'

export interface ThemeColors {
  primary?:   string  // hex, e.g. '#007bff'
  primaryDk?: string
  primaryLt?: string
  primaryMd?: string
}

// Converts '#RRGGBB' → '255 255 255' (CSS var channel format)
function hexToChannels(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

// Darken a hex color by mixing with black (factor 0–1)
function darken(hex: string, factor = 0.12): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const ch = (i: number) => Math.round(Math.max(0, parseInt(m[i], 16) * (1 - factor)))
  return `#${ch(1).toString(16).padStart(2, '0')}${ch(2).toString(16).padStart(2, '0')}${ch(3).toString(16).padStart(2, '0')}`
}

// Lighten a hex color by mixing with white (factor 0–1 = 0=same, 1=white)
function lighten(hex: string, factor = 0.92): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const ch = (i: number) => Math.round(parseInt(m[i], 16) + (255 - parseInt(m[i], 16)) * factor)
  return `#${ch(1).toString(16).padStart(2, '0')}${ch(2).toString(16).padStart(2, '0')}${ch(3).toString(16).padStart(2, '0')}`
}

function applyTheme(colors: ThemeColors) {
  const root = document.documentElement
  const set = (varName: string, hex: string) => {
    const ch = hexToChannels(hex)
    if (ch) root.style.setProperty(varName, ch)
  }

  if (colors.primary) {
    set('--va-primary', colors.primary)
    set('--va-primary-dk', colors.primaryDk ?? darken(colors.primary, 0.12))
    set('--va-primary-lt', colors.primaryLt ?? lighten(colors.primary, 0.92))
    set('--va-primary-md', colors.primaryMd ?? lighten(colors.primary, 0.80))
  } else {
    if (colors.primaryDk) set('--va-primary-dk', colors.primaryDk)
    if (colors.primaryLt) set('--va-primary-lt', colors.primaryLt)
    if (colors.primaryMd) set('--va-primary-md', colors.primaryMd)
  }
}

export function ThemeProvider({ initial }: { initial?: ThemeColors }) {
  useEffect(() => {
    // Apply server-derived theme (no-op if server already injected <style>)
    if (initial) applyTheme(initial)

    // Tell parent we're ready — it can reply with voice-agent:theme
    window.parent?.postMessage({ type: 'voice-agent:ready' }, '*')

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'voice-agent:theme' && e.data.colors) {
        applyTheme(e.data.colors as ThemeColors)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
