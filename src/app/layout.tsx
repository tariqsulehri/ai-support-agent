import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Tariq — Support Agent Voice Assistant',
  description: 'AI-powered voice sales and support agent for Support Agent',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
