import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  embedThemeCss,
  embedThemeVars,
  googleFontHref,
  normalizeFont,
  normalizeHex,
  normalizeRadius,
  parseEmbedTheme,
  readableOn,
} from '../lib/theme/embed-theme'
import { GET as agentScript } from '../app/agent.js/route'

describe('embed theme: parsing untrusted params', () => {
  it('accepts 6- and 3-digit hex and rejects anything else', () => {
    assert.equal(normalizeHex('#FF8800'), '#ff8800')
    assert.equal(normalizeHex('#f80'), '#ff8800')
    assert.equal(normalizeHex('red'), undefined)
    assert.equal(normalizeHex('#ff8800;}body{display:none'), undefined)
  })

  it('rejects fonts that could escape a CSS string or URL', () => {
    assert.equal(normalizeFont('Open Sans'), 'Open Sans')
    assert.equal(normalizeFont('  Inter  '), 'Inter')
    assert.equal(normalizeFont('sans-serif'), undefined)
    assert.equal(normalizeFont('Inter"; } body { x'), undefined)
    assert.equal(normalizeFont('Inter</style><script>'), undefined)
    assert.equal(normalizeFont('a'.repeat(60)), undefined)
  })

  it('clamps radius to 0..24px', () => {
    assert.equal(normalizeRadius('8'), 8)
    assert.equal(normalizeRadius('9999'), 24)
    assert.equal(normalizeRadius('-4'), undefined)
    assert.equal(normalizeRadius('abc'), undefined)
    assert.equal(normalizeRadius(''), undefined)
  })

  it('builds a theme from query params and drops invalid fields', () => {
    assert.deepEqual(
      parseEmbedTheme({ primaryColor: '#10b981', font: 'Inter', radius: '6', mode: 'dark' }),
      { primary: '#10b981', font: 'Inter', radius: 6, mode: 'dark' },
    )
    assert.deepEqual(
      parseEmbedTheme({ primaryColor: 'javascript:x', font: ['a', 'b'], radius: 'x', mode: 'neon' }),
      { primary: undefined, font: undefined, radius: undefined, mode: undefined },
    )
  })
})

describe('embed theme: CSS output', () => {
  it('returns null when there is nothing to apply (defaults stay untouched)', () => {
    assert.equal(embedThemeCss({}), null)
  })

  it('drives both accent families from the site colour', () => {
    const vars = embedThemeVars({ primary: '#ff0000' })
    assert.equal(vars['--va-primary'], '255 0 0')
    assert.equal(vars['--va-teal'], '255 0 0')
    assert.equal(vars['--va-teal-dk'], '224 0 0')
    assert.ok(vars['--va-teal-lt'])
  })

  it('picks readable text for light and dark brand colours', () => {
    assert.equal(readableOn('#1e3a8a'), '#ffffff')
    assert.equal(readableOn('#facc15'), '#111827')
    assert.equal(embedThemeVars({ primary: '#facc15' })['--va-on-primary'], '17 24 39')
  })

  it('switches neutrals for dark mode only', () => {
    assert.equal(embedThemeVars({ mode: 'light' })['--va-surface'], undefined)
    assert.equal(embedThemeVars({ mode: 'dark' })['--va-surface'], '27 27 27')
  })

  it('emits font and radius variables', () => {
    const css = embedThemeCss({ font: 'Open Sans', radius: 20 })
    assert.equal(css, ':root{--va-font:"Open Sans";--va-radius:20px;--va-radius-sm:12px}')
  })
})

describe('embed theme: Google Fonts', () => {
  it('loads web fonts but not system fonts', () => {
    assert.equal(
      googleFontHref('Open Sans'),
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
    )
    assert.equal(googleFontHref('Arial'), null)
    assert.equal(googleFontHref(undefined), null)
  })
})

describe('agent.js loader', () => {
  it('serves syntactically valid JavaScript with theme overrides wired in', async () => {
    const req = { headers: new Headers({ host: 'agent.example.com' }) }
    const res = await agentScript(req as never)
    const js = await res.text()
    assert.doesNotThrow(() => new Function(js), 'generated agent.js must parse')
    for (const attr of ['data-primary-color', 'data-font', 'data-radius', 'data-theme']) {
      assert.ok(js.includes(attr), `agent.js should read ${attr}`)
    }
  })
})
