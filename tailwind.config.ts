import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-poppins)',
          'Poppins',
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Semantic design system tokens (Standard 01 §2.1)
        canvas: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2:       'rgb(var(--surface-2) / <alpha-value>)',
          3:       'rgb(var(--surface-3) / <alpha-value>)',
          inv:     'rgb(var(--surface-inv) / <alpha-value>)',
          card:    '#FFFFFF',
          raised:  '#F3F2F1',
          border:  '#EDEBE9',
          hover:   '#F5F5F5',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          2:       'rgb(var(--border-2) / <alpha-value>)',
        },
        content: {
          1:   'rgb(var(--text-1) / <alpha-value>)',
          2:   'rgb(var(--text-2) / <alpha-value>)',
          3:   'rgb(var(--text-3) / <alpha-value>)',
          inv: 'rgb(var(--text-inv) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          h:       'rgb(var(--accent-h) / <alpha-value>)',
          soft:    'rgb(var(--accent-soft) / <alpha-value>)',
          txt:     'rgb(var(--accent-txt) / <alpha-value>)',
          fg:      'rgb(var(--accent-fg) / <alpha-value>)',
          ring:    'rgb(var(--accent-ring) / <alpha-value>)',
        },
        semantic: {
          success:         'rgb(var(--success) / <alpha-value>)',
          'success-soft':  'rgb(var(--success-soft) / <alpha-value>)',
          'success-fg':    'rgb(var(--success-fg) / <alpha-value>)',
          warning:         'rgb(var(--warning) / <alpha-value>)',
          'warning-soft':  'rgb(var(--warning-soft) / <alpha-value>)',
          'warning-fg':    'rgb(var(--warning-fg) / <alpha-value>)',
          danger:          'rgb(var(--danger) / <alpha-value>)',
          'danger-soft':   'rgb(var(--danger-soft) / <alpha-value>)',
          'danger-fg':     'rgb(var(--danger-fg) / <alpha-value>)',
          info:            'rgb(var(--info) / <alpha-value>)',
          'info-soft':     'rgb(var(--info-soft) / <alpha-value>)',
        },
        ms: {
          // Primary — driven by CSS vars so parent-page theme is inherited
          blue:      'rgb(var(--va-primary)    / <alpha-value>)',
          'blue-dk': 'rgb(var(--va-primary-dk) / <alpha-value>)',
          'blue-lt': 'rgb(var(--va-primary-lt) / <alpha-value>)',
          'blue-md': 'rgb(var(--va-primary-md) / <alpha-value>)',
          // Secondary — teal
          teal:      '#4CBAAB',
          'teal-dk': '#3DA898',
          'teal-lt': '#EBF8F6',
          'teal-md': '#C8EDE9',
          // Neutrals
          text:      '#323130',
          sub:       '#605E5C',
          muted:     '#8A8886',
          border:    '#EDEBE9',
          red:       '#C4314B',
          green:     '#107C10',
          amber:     '#F7630C',
        },
      },
      // Tailwind v3 lacks the v4 `xs`/`2xs` scale used throughout the UI; define it so
      // those utilities actually render instead of being silently dropped.
      boxShadow: {
        '2xs': '0 1px rgba(15, 23, 42, 0.05)',
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        card:   '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
        bubble: '0 1px 2px rgba(0,0,0,0.08)',
        header: '0 2px 6px rgba(0,0,0,0.12)',
        input:  '0 -1px 0 #EDEBE9',
      },
      borderRadius: {
        xs: '0.125rem',
      },
      dropShadow: {
        xs: '0 1px 1px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        pulse_dot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
        ring: {
          '0%':   { boxShadow: '0 0 0 0 rgba(196,49,75,0.4)' },
          '70%':  { boxShadow: '0 0 0 12px rgba(196,49,75,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(196,49,75,0)' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':           { transform: 'translateY(-4px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse_dot: 'pulse_dot 1.4s ease-in-out infinite',
        ring:      'ring 1.4s ease-out infinite',
        typing:    'typing 1.2s ease-in-out infinite',
        'fade-up': 'fade-up 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
