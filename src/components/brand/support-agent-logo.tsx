export function SupportAgentLogo({
  variant = 'dark',
  className = '',
}: {
  variant?: 'light' | 'dark'
  className?: string
}) {
  const isLight = variant === 'light'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon: Voice soundwave inside rounded badge */}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-xs ${
          isLight
            ? 'bg-white text-[#0052ff]'
            : 'bg-[#0052ff] text-white'
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          {/* Audio soundwave equalizer representing conversational voice agent */}
          <rect x="3" y="10" width="2" height="4" rx="1" />
          <rect x="7" y="6" width="2" height="12" rx="1" />
          <rect x="11" y="3" width="2" height="18" rx="1" />
          <rect x="15" y="7" width="2" height="10" rx="1" />
          <rect x="19" y="10" width="2" height="4" rx="1" />
        </svg>
      </div>

      {/* Brand Text: Support Agent */}
      <div className="flex items-center gap-1.5">
        <span
          className={`text-lg font-bold tracking-tight ${
            isLight ? 'text-white' : 'text-slate-950'
          }`}
        >
          Support
        </span>
        <span
          className={`text-lg font-extrabold tracking-tight ${
            isLight ? 'text-blue-200' : 'text-[#0052ff]'
          }`}
        >
          Agent
        </span>
        <span
          className={`ml-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest uppercase ${
            isLight
              ? 'bg-white/20 text-white'
              : 'bg-blue-50 text-[#0052ff] border border-blue-200/80'
          }`}
        >
          AI
        </span>
      </div>
    </div>
  )
}
