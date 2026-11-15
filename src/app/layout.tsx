import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

// Self-hosted at build time: no render-blocking request to Google Fonts, no layout shift.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'AI Support Agent',
  description: 'Intelligent AI-powered support agent — available 24/7',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0052ff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
