import { env } from './env'

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
  name: string         // e.g. "Urdu"
  whisperCode: string  // e.g. "ur"
}

export function getLangConfig(): LangConfig {
  const raw = env.LANGUAGE.trim().toLowerCase()
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
