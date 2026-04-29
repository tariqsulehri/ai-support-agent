import { franc } from 'franc'

// ISO 639-3 → human-readable name (matches language.ts / tenants supportedLanguages)
const ISO3_TO_NAME: Record<string, string> = {
  eng: 'english',
  urd: 'urdu',
  hin: 'hindi',
  ara: 'arabic',
  spa: 'spanish',
  fra: 'french',
  deu: 'german',
  zho: 'chinese',
  jpn: 'japanese',
  por: 'portuguese',
  tur: 'turkish',
  rus: 'russian',
  ita: 'italian',
  nld: 'dutch',
  kor: 'korean',
  ben: 'bengali',
  pan: 'punjabi',
}

/**
 * Detect the language of a text string.
 * Returns the language name (e.g. "urdu") or null when undetermined.
 * If `supported` is provided, only returns a value when it matches the list.
 */
export function detectLanguage(text: string, supported?: string[]): string | null {
  const code = franc(text, { minLength: 8 })
  if (code === 'und') return null

  const name = ISO3_TO_NAME[code] ?? null
  if (!name) return null

  if (supported && supported.length > 0 && !supported.includes(name)) return null

  return name
}
