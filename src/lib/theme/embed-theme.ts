/**
 * Embed theme: lets the /voice widget borrow the look of the site it is embedded on.
 *
 * agent.js reads the parent page's brand colour, font, corner radius and light/dark
 * mode (or explicit data-* overrides) and passes them as URL params. Every value is
 * untrusted, so it is validated here before it reaches a CSS string.
 *
 * Pure and dependency-free: used by the server page (zero-FOUC <style>) and the
 * client ThemeProvider (postMessage updates).
 */

export type EmbedMode = 'light' | 'dark'

export interface EmbedTheme {
  primary?: string  // '#rrggbb'
  font?:    string  // single family name, e.g. 'Inter'
  radius?:  number  // px, clamped to 0..MAX_RADIUS_PX
  mode?:    EmbedMode
}

export const MAX_RADIUS_PX = 24

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const SHORT_HEX_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/
// Letters, digits, spaces and hyphens only: nothing that can escape a CSS string or URL.
const FONT_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{0,47}$/

const GENERIC_FONTS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif',
  'ui-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', 'inherit', 'initial',
])

// Fonts every visitor already has: never request these from Google Fonts.
const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'helvetica neue', 'segoe ui', 'roboto', 'georgia', 'times', 'times new roman',
  'verdana', 'tahoma', 'trebuchet ms', 'courier', 'courier new', 'garamond', 'apple system',
  'blinkmacsystemfont', '-apple-system', 'sf pro', 'sf pro text', 'sf pro display',
])

// ── Parsing ───────────────────────────────────────────────────────────────────

export function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (HEX_RE.test(v)) return v.toLowerCase()
  const m = SHORT_HEX_RE.exec(v)
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toLowerCase() : undefined
}

export function normalizeFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().replace(/\s+/g, ' ')
  if (!FONT_RE.test(v) || GENERIC_FONTS.has(v.toLowerCase())) return undefined
  return v
}

export function normalizeRadius(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(Math.min(n, MAX_RADIUS_PX))
}

export function normalizeMode(value: unknown): EmbedMode | undefined {
  return value === 'dark' || value === 'light' ? value : undefined
}

/** Builds a validated theme from raw (untrusted) query params. */
export function parseEmbedTheme(params: Record<string, string | string[] | undefined>): EmbedTheme {
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined)
  return {
    primary: normalizeHex(str('primaryColor')),
    font:    normalizeFont(str('font')),
    radius:  normalizeRadius(str('radius')),
    mode:    normalizeMode(str('mode')),
  }
}

export function hasEmbedTheme(theme: EmbedTheme): boolean {
  return Boolean(theme.primary || theme.font || theme.radius !== undefined || theme.mode)
}

// ── Colour maths ──────────────────────────────────────────────────────────────

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function channels(rgb: Rgb): string {
  return rgb.map((c) => Math.round(Math.max(0, Math.min(255, c)))).join(' ')
}

/** Moves `rgb` toward `target` by factor f (0 = unchanged, 1 = target). */
function mix(rgb: Rgb, target: Rgb, f: number): Rgb {
  return [0, 1, 2].map((i) => rgb[i] + (target[i] - rgb[i]) * f) as Rgb
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]
const DARK_TEXT: Rgb = [17, 24, 39] // #111827
const DARK_SURFACE: Rgb = [27, 27, 27]

/** Text colour (white or near-black) that reads best on the given background. */
export function readableOn(hex: string): '#ffffff' | '#111827' {
  const bg = toRgb(hex)
  return contrast(bg, WHITE) >= contrast(bg, DARK_TEXT) ? '#ffffff' : '#111827'
}

// ── CSS output ────────────────────────────────────────────────────────────────

const DARK_NEUTRALS: Record<string, string> = {
  '--va-surface':   '27 27 27',
  '--va-surface-2': '36 36 36',
  '--va-surface-3': '20 20 20',
  '--va-canvas':    '18 18 18',
  '--va-text':      '236 236 236',
  '--va-sub':       '200 200 200',
  '--va-muted':     '150 150 150',
  '--va-border':    '58 58 58',
}

/** CSS custom properties (RGB channel format for colours) for a validated theme. */
export function embedThemeVars(theme: EmbedTheme): Record<string, string> {
  const vars: Record<string, string> = {}
  const dark = theme.mode === 'dark'

  if (dark) Object.assign(vars, DARK_NEUTRALS)

  if (theme.primary) {
    const p = toRgb(theme.primary)
    const tintBase = dark ? DARK_SURFACE : WHITE
    const shades = {
      '':    channels(p),
      '-dk': channels(mix(p, BLACK, 0.12)),
      '-lt': channels(mix(p, tintBase, dark ? 0.8 : 0.92)),
      '-md': channels(mix(p, tintBase, dark ? 0.65 : 0.8)),
    }
    // The widget has two accent families (blue + teal); a site theme drives both.
    for (const [suffix, value] of Object.entries(shades)) {
      vars[`--va-primary${suffix}`] = value
      vars[`--va-teal${suffix}`] = value
    }
    vars['--va-on-primary'] = channels(toRgb(readableOn(theme.primary)))
  }

  if (theme.font) vars['--va-font'] = `"${theme.font}"`

  if (theme.radius !== undefined) {
    vars['--va-radius'] = `${theme.radius}px`
    vars['--va-radius-sm'] = `${Math.min(12, Math.round(theme.radius * 0.75))}px`
  }

  return vars
}

/** A `:root{...}` rule for server-side injection, or null when there is nothing to apply. */
export function embedThemeCss(theme: EmbedTheme): string | null {
  const entries = Object.entries(embedThemeVars(theme))
  if (!entries.length) return null
  return `:root{${entries.map(([k, v]) => `${k}:${v}`).join(';')}}`
}

/** Google Fonts stylesheet URL for a web font, or null for system fonts. */
export function googleFontHref(font: string | undefined): string | null {
  const name = normalizeFont(font)
  if (!name || SYSTEM_FONTS.has(name.toLowerCase())) return null
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`
}
