export function TkxelCalibrLogo({
  variant = 'light',
  className = '',
}: {
  variant?: 'light' | 'dark'
  className?: string
}) {
  const isLight = variant === 'light'

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* tkxel wordmark */}
      <div className="flex items-center">
        <span
          className={`text-2xl font-black italic tracking-tighter ${
            isLight ? 'text-white' : 'text-[#0052ff]'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          tkxel
        </span>
      </div>

      {/* Divider */}
      <span className={`text-xl font-light ${isLight ? 'text-white/40' : 'text-slate-300'}`}>
        |
      </span>

      {/* Calibr Brand mark & text */}
      <div className="flex items-center gap-2">
        {/* Clock/Dial Gauge Icon */}
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            isLight ? 'border-white text-white' : 'border-[#0052ff] text-[#0052ff]'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-4a.75.75 0 01.75.75v3.19l1.72 1.72a.75.75 0 11-1.06 1.06l-2-2A.75.75 0 017 8.25v-3.5A.75.75 0 018 4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <span
          className={`text-xl font-bold tracking-tight ${
            isLight ? 'text-white' : 'text-slate-900'
          }`}
        >
          Calibr
        </span>
      </div>
    </div>
  )
}
