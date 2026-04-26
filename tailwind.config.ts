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
          'Segoe UI', '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        // Page / shell
        surface: {
          DEFAULT: '#F0F2F5',
          card:    '#FFFFFF',
          raised:  '#F3F2F1',
          border:  '#EDEBE9',
          hover:   '#F5F5F5',
        },
        // Microsoft blue palette
        ms: {
          blue:      '#0078D4',
          'blue-dk': '#106EBE',
          'blue-lt': '#EFF6FC',
          'blue-md': '#DEECF9',
          text:      '#323130',
          sub:       '#605E5C',
          muted:     '#8A8886',
          border:    '#EDEBE9',
          red:       '#C4314B',
          green:     '#107C10',
          amber:     '#F7630C',
        },
      },
      boxShadow: {
        card:   '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
        bubble: '0 1px 2px rgba(0,0,0,0.08)',
        header: '0 2px 6px rgba(0,0,0,0.12)',
        input:  '0 -1px 0 #EDEBE9',
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
