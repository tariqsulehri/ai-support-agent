import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          card:    '#1a1d27',
          raised:  '#1e2235',
          border:  '#2a2d3a',
        },
      },
      keyframes: {
        pulse_dot: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.3' },
        },
        ring: {
          '0%':   { boxShadow: '0 0 0 0 rgba(239,68,68,0.45)' },
          '70%':  { boxShadow: '0 0 0 16px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
      },
      animation: {
        pulse_dot: 'pulse_dot 1.2s ease-in-out infinite',
        ring:      'ring 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
