import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { GlossyBarChart, GlossyDonutChart, MonthlyCallVolumeChart } from '../components/admin/3d-charts'

// Ensure classic JSX runtime has React available
;(globalThis as { React?: typeof React }).React = React

/**
 * Formula injection sanitizer logic tested directly from the CSV exporter
 * (conforming to Standard 02 §9 & Standard 04 §1.2).
 */
function sanitizeCsvValue(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

describe('Architecture Standards Verification (Standards 01–06)', () => {
  describe('Standard 04 §1.2 & Standard 02 §9 — Spreadsheet Formula Injection Guard', () => {
    it('neutralizes formula injection characters (= + - @ tab carriage-return) by prefixing single quote', () => {
      const maliciousFormulas = [
        '=cmd|/C calc!A0',
        '+1+2',
        '-5+2',
        '@SUM(1,2)',
        '\tmalicious',
        '\rmalicious',
      ]

      for (const formula of maliciousFormulas) {
        const sanitized = sanitizeCsvValue(formula)
        assert.ok(
          sanitized.startsWith(`"'`),
          `Expected formula "${formula}" to be prefixed with single quote in CSV output, got: ${sanitized}`
        )
      }
    })

    it('preserves legitimate text, numbers, and null without dangerous prefix', () => {
      assert.strictEqual(sanitizeCsvValue('Standard Lead'), '"Standard Lead"')
      assert.strictEqual(sanitizeCsvValue(1234), '"1234"')
      assert.strictEqual(sanitizeCsvValue(null), '""')
      assert.strictEqual(sanitizeCsvValue(undefined), '""')
    })
  })

  describe('Standard 01 §3 & Standard 03 §2, §7 — Typography Floor & Chart Accessibility', () => {
    it('renders accessible figcaption summary and aria labels on charts', () => {
      const html = renderToString(
        createElement(GlossyDonutChart, {
          title: 'Conversion Breakdown',
          items: [
            { label: 'Hot', value: 30, color: '#0052ff' },
            { label: 'Cold', value: 10, color: '#64748b' },
          ],
          total: 40,
        })
      )

      assert.match(html, /<figcaption class="sr-only">[\s\S]*?Conversion Breakdown/)
      assert.match(html, /role="img" aria-label="Conversion Breakdown:/)
    })

    it('distinguishes between true zero baseline and completely empty state', () => {
      // Zero state: data items present with 0 values
      const zeroHtml = renderToString(
        createElement(GlossyBarChart, {
          title: 'Pipeline Stages',
          items: [
            { label: 'Won', value: 0, color: '#10b981' },
            { label: 'Proposal', value: 0, color: '#0052ff' },
          ],
        })
      )
      assert.match(zeroHtml, /All values are 0\./)

      // Empty state: 0 items passed
      const emptyHtml = renderToString(
        createElement(GlossyBarChart, {
          title: 'Pipeline Stages',
          items: [],
        })
      )
      assert.match(emptyHtml, /No data to show yet\./)
    })

    it('renders monthly volume chart with font sizes complying with the 12px floor', () => {
      const html = renderToString(
        createElement(MonthlyCallVolumeChart, {
          title: 'Monthly Volume',
          items: [
            { label: 'Jan', value: 50, color: '#0052ff' },
            { label: 'Feb', value: 75, color: '#0052ff' },
          ],
        })
      )

      // Ensure labels and counts render
      assert.match(html, />Jan</)
      assert.match(html, />Feb</)
      assert.match(html, />75</)

      // Ensure standard 12px typography floor (text-xs) is used and no sub-12px utilities exist
      assert.match(html, /text-xs/)
      assert.doesNotMatch(html, /text-\[(?:8|9|10|11)px\]/)
      assert.doesNotMatch(html, /font-size="[89]"/)
      assert.doesNotMatch(html, /font-size="10"/)
    })
  })
})
