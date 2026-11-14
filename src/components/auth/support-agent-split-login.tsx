'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SupportAgentLogo } from '@/components/brand/support-agent-logo'
import { SupportAgentVisual } from '@/components/auth/support-agent-visual'

interface SupportAgentSplitLoginProps {
  scope: 'tenant' | 'platform'
  next?: string
  error?: string
  errorMessage?: string
}

export function SupportAgentSplitLogin({
  scope,
  next = '/dashboard',
  error,
  errorMessage,
}: SupportAgentSplitLoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPlatform = scope === 'platform'

  return (
    <main className="min-h-screen w-screen flex flex-col md:flex-row bg-[#121417] text-white overflow-x-hidden select-none">
      {/* ── Left Pane: 38% Royal Blue Hero ─────────────────────────────────── */}
      <section className="relative flex flex-col justify-between w-full md:w-[42%] lg:w-[38%] min-h-[480px] md:min-h-screen bg-[#0052ff] p-8 sm:p-12 lg:p-14 text-white shrink-0 overflow-hidden">
        {/* Soft radial glow highlights */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />

        {/* Brand Logo Header */}
        <div className="relative z-10">
          <SupportAgentLogo variant="light" />
        </div>

        {/* Hero Title & Subhead */}
        <div className="relative z-10 my-auto py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            ENTERPRISE CONVERSATIONAL AI
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.15]">
            Support Agent – intelligence, vocalized<span className="text-[#60a5fa]">.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/90 font-normal">
            Real-time AI voice engagement, automated lead qualification, and instant CRM sync.
          </p>

          {/* Voice Waveform AI Graphic */}
          <div className="mt-8 flex justify-center md:justify-start">
            <SupportAgentVisual className="h-48 w-48 sm:h-56 sm:w-56 drop-shadow-2xl" />
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-4">
          <p className="text-xs text-white/70 font-medium">
            AI Voice & Chat Platform v2.0
          </p>
        </div>
      </section>

      {/* ── Right Pane: 62% Deep Dark Charcoal Form ───────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 min-h-[500px]">
        <div className="w-full max-w-sm sm:max-w-md space-y-7">
          {/* Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Sign in to continue to {isPlatform ? 'Platform Control Center' : 'Support Agent Dashboard'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{errorMessage || 'Invalid credentials. Please try again.'}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form action="/api/admin/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="next" value={next} />

            {/* Email / Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                USERNAME
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your username"
                  className="w-full h-11 rounded-lg border border-slate-700/80 bg-[#1c1f24] px-3.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/30"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                PASSWORD
              </label>
              <div className="relative">
                {/* Lock icon on left */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full h-11 rounded-lg border border-slate-700/80 bg-[#1c1f24] pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/30"
                />
                {/* Visibility Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.375l1.091 1.091a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-[#0052ff] hover:bg-[#0043d9] text-xs sm:text-sm font-semibold text-white shadow-md transition active:scale-[0.99]"
              >
                Sign In
              </button>
            </div>
          </form>

          {/* Scope Switching Links */}
          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            {isPlatform ? (
              <p>
                Need to access a tenant account?{' '}
                <Link href="/tenant/login" className="text-[#60a5fa] hover:underline font-medium">
                  Sign in as tenant admin
                </Link>
              </p>
            ) : (
              <p>
                Platform administrator?{' '}
                <Link href="/admin/login" className="text-[#60a5fa] hover:underline font-medium">
                  Sign in as super admin
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
