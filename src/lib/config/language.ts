// Maps human-readable language names → ISO 639-1 codes used by Whisper
const WHISPER_CODES: Record<string, string> = {
  english:    'en',
  urdu:       'ur',
  arabic:     'ar',
  hindi:      'hi',
  spanish:    'es',
  french:     'fr',
  german:     'de',
  chinese:    'zh',
  japanese:   'ja',
  portuguese: 'pt',
  turkish:    'tr',
  russian:    'ru',
  italian:    'it',
  dutch:      'nl',
  korean:     'ko',
  bengali:    'bn',
  punjabi:    'pa',
}

export interface LangConfig {
  name:        string        // e.g. "Urdu" or "Auto"
  whisperCode: string | null // null = let Whisper auto-detect
}

/**
 * Converts a tenant languageMode to a LangConfig.
 * Pass "auto" to let Whisper detect the language automatically.
 */
export function getLangConfig(languageMode: string): LangConfig {
  const raw = languageMode.trim().toLowerCase()

  if (raw === 'auto') return { name: 'Auto', whisperCode: null }

  const code = WHISPER_CODES[raw]

  if (!code) {
    console.warn(
      `[lang] Unknown language "${raw}" — falling back to English.\n` +
      `       Supported: ${Object.keys(WHISPER_CODES).join(', ')}`
    )
    return { name: 'English', whisperCode: 'en' }
  }

  const name = raw.charAt(0).toUpperCase() + raw.slice(1)
  return { name, whisperCode: code }
}
