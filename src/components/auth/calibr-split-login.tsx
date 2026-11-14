'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TkxelCalibrLogo } from '@/components/brand/calibr-logo'
import { CalibrOwlMascot } from '@/components/auth/calibr-mascot'

interface CalibrSplitLoginProps {
  scope: 'tenant' | 'platform'
  next: string
  error?: string
  errorMessage?: string
}

export function CalibrSplitLogin({
  scope,
  next,
  error,
  errorMessage,
}: CalibrSplitLoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isTenant = scope === 'tenant'

  return (
    <main className="min-h-screen w-screen flex flex-col md:flex-row bg-[#121417] text-white overflow-x-hidden select-none">
      {/* Left Blue Hero Banner */}
      <section className="relative flex flex-col justify-between w-full md:w-[42%] lg:w-[38%] min-h-[480px] md:min-h-screen bg-[#0052ff] p-8 sm:p-12 lg:p-14 text-white shrink-0 overflow-hidden">
        {/* Subtle background ambient blur circles */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <TkxelCalibrLogo variant="light" />
        </div>

        {/* Hero Copy & Mascot */}
        <div className="relative z-10 my-auto py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            {isTenant ? 'WE ENGINEER SOFTWARE SOLUTIONS' : 'ENTERPRISE PLATFORM OPERATIONS'}
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight leading-[1.15]">
            Calibr – capability, calibrated
            <span className="text-[#ff5e1a]">.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/90 font-normal">
            Grow on evidence, not opinion.
          </p>

          {/* Owl Mascot holding analytics tray */}
          <div className="mt-8 flex justify-center md:justify-start">
            <CalibrOwlMascot className="h-48 w-48 sm:h-56 sm:w-56 drop-shadow-2xl" />
          </div>
        </div>

        {/* Footer Tag */}
        <div className="relative z-10 pt-4 text-xs font-medium text-white/75">
          {isTenant ? 'Skills Readiness App' : 'Platform Control System'}
        </div>
      </section>

      {/* Right Dark Sign-in Form */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#121417] min-h-[500px]">
        <div className="w-full max-w-[390px] space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to continue
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/60 p-3.5 text-xs font-medium text-rose-300">
              {errorMessage || 'Invalid email or password.'}
            </div>
          )}

          <form action="/api/admin/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="next" value={next} />

            {/* Email / Username Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your username"
                  className="h-11 w-full rounded-lg border border-slate-700/80 bg-[#1c1f24] px-3.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  <span className="rounded bg-slate-800/80 px-1 py-0.5 text-[10px] font-mono tracking-tighter">
                    •••
                  </span>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-lg border border-slate-700/80 bg-[#1c1f24] pl-10 pr-18 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-2.5 flex items-center gap-1.5 text-slate-500">
                  <span className="rounded bg-slate-800/80 px-1 py-0.5 text-[10px] font-mono tracking-tighter">
                    •••
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-white transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="mt-2 h-11 w-full rounded-lg bg-[#1040a0] font-semibold text-sm text-white shadow-sm hover:bg-[#0c3384] transition active:scale-[0.99]"
            >
              Sign In
            </button>
          </form>

          {/* Switch Portal Link */}
          <div className="pt-2 text-center text-xs text-slate-400">
            {isTenant ? (
              <p>
                Platform administrator?{' '}
                <Link
                  href="/admin/login"
                  className="font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  Sign in as super admin
                </Link>
              </p>
            ) : (
              <p>
                Tenant owner or admin?{' '}
                <Link
                  href="/tenant/login"
                  className="font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  Sign in as tenant
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
