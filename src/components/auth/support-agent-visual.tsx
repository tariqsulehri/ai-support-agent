export function SupportAgentVisual({
  className = 'h-56 w-56',
}: {
  className?: string
}) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background glow halo */}
      <div className="absolute h-48 w-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />

      {/* Main Vector SVG */}
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Support Agent Conversational AI"
      >
        {/* Outer orbital rings */}
        <circle cx="120" cy="120" r="95" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="120" cy="120" r="75" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />

        {/* Central Speech & Audio Orb */}
        <circle cx="120" cy="120" r="54" fill="url(#orbGradient)" filter="url(#glow)" />
        <circle cx="120" cy="120" r="50" fill="#0043d9" />

        {/* Dynamic Voice Waveform Equalizer inside Orb */}
        <g fill="#ffffff">
          <rect x="88" y="112" width="4" height="16" rx="2" opacity="0.8" />
          <rect x="96" y="102" width="4" height="36" rx="2" opacity="0.9" />
          <rect x="104" y="94" width="4" height="52" rx="2" />
          <rect x="112" y="86" width="4" height="68" rx="2" />
          <rect x="120" y="80" width="4" height="80" rx="2" />
          <rect x="128" y="86" width="4" height="68" rx="2" />
          <rect x="136" y="94" width="4" height="52" rx="2" />
          <rect x="144" y="102" width="4" height="36" rx="2" opacity="0.9" />
          <rect x="152" y="112" width="4" height="16" rx="2" opacity="0.8" />
        </g>

        {/* Sound pulse arcs */}
        <path
          d="M 52 105 A 72 72 0 0 0 52 135"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 40 92 A 90 90 0 0 0 40 148"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <path
          d="M 188 105 A 72 72 0 0 1 188 135"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 200 92 A 90 90 0 0 1 200 148"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Neural AI sparkles */}
        <circle cx="65" cy="65" r="3" fill="#60a5fa" />
        <circle cx="175" cy="65" r="3.5" fill="#93c5fd" />
        <circle cx="180" cy="175" r="2.5" fill="#60a5fa" />
        <circle cx="60" cy="170" r="3" fill="#93c5fd" />

        <defs>
          <linearGradient id="orbGradient" x1="80" y1="80" x2="160" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa" />
            <stop offset="0.5" stopColor="#0052ff" />
            <stop offset="1" stopColor="#002bb8" />
          </linearGradient>
          <filter id="glow" x="60" y="60" width="120" height="120" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
