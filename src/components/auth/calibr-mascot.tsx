export function CalibrOwlMascot({ className = 'h-52 w-52' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Calibr Owl Mascot"
    >
      {/* Soft shadow */}
      <ellipse cx="110" cy="225" rx="75" ry="10" fill="rgba(0,0,0,0.18)" />

      {/* Feet */}
      <g fill="#ff5e1a">
        {/* Left Foot */}
        <ellipse cx="70" cy="216" rx="14" ry="7" />
        <ellipse cx="82" cy="216" rx="12" ry="7" />
        <ellipse cx="94" cy="216" rx="11" ry="6" />

        {/* Right Foot */}
        <ellipse cx="126" cy="216" rx="11" ry="6" />
        <ellipse cx="138" cy="216" rx="12" ry="7" />
        <ellipse cx="150" cy="216" rx="14" ry="7" />
      </g>

      {/* Left Wing (behind body slightly, resting on side) */}
      <path
        d="M38 126 C22 142 16 172 32 195 C46 205 62 190 56 168 Z"
        fill="#004cd9"
      />

      {/* Main Body */}
      <path
        d="M58 84 C48 54 62 38 78 44 C90 49 98 62 110 62 C122 62 130 49 142 44 C158 38 172 54 162 84 C178 114 176 175 155 204 C138 220 82 220 65 204 C44 175 42 114 58 84 Z"
        fill="#0062ff"
      />

      {/* Feather Highlights */}
      <path
        d="M65 88 C75 96 85 96 95 88"
        stroke="#3385ff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M125 88 C135 96 145 96 155 88"
        stroke="#3385ff"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Belly (white) */}
      <ellipse cx="110" cy="154" rx="46" ry="46" fill="#ffffff" />

      {/* Gauge / Speedometer on belly */}
      <g>
        {/* Speedometer Arc (green to orange to red) */}
        <path
          d="M80 162 A 32 32 0 0 1 140 162"
          stroke="#e2e8f0"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Green arc section */}
        <path
          d="M80 162 A 32 32 0 0 1 96 136"
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Yellow/Orange arc section */}
        <path
          d="M96 136 A 32 32 0 0 1 124 136"
          stroke="#f59e0b"
          strokeWidth="6"
          fill="none"
        />
        {/* Red arc section */}
        <path
          d="M124 136 A 32 32 0 0 1 140 162"
          stroke="#ef4444"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Tick marks */}
        <line x1="88" y1="150" x2="93" y2="152" stroke="#64748b" strokeWidth="1.5" />
        <line x1="110" y1="133" x2="110" y2="139" stroke="#64748b" strokeWidth="1.5" />
        <line x1="132" y1="150" x2="127" y2="152" stroke="#64748b" strokeWidth="1.5" />
        {/* Center pin & needle */}
        <circle cx="110" cy="162" r="5" fill="#0f172a" />
        <line
          x1="110"
          y1="162"
          x2="126"
          y2="140"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {/* Eyes Container */}
      <g>
        {/* Eye Base Outer White */}
        <ellipse cx="84" cy="98" rx="24" ry="24" fill="#ffffff" />
        <ellipse cx="136" cy="98" rx="24" ry="24" fill="#ffffff" />

        {/* Eye Border Rings */}
        <ellipse cx="84" cy="98" rx="24" ry="24" stroke="#004bd6" strokeWidth="2.5" />
        <ellipse cx="136" cy="98" rx="24" ry="24" stroke="#004bd6" strokeWidth="2.5" />

        {/* Irises (Electric Blue) */}
        <ellipse cx="88" cy="98" rx="15" ry="15" fill="#0284c7" />
        <ellipse cx="132" cy="98" rx="15" ry="15" fill="#0284c7" />

        {/* Pupils (Black) */}
        <ellipse cx="89" cy="98" rx="10" ry="10" fill="#090d16" />
        <ellipse cx="131" cy="98" rx="10" ry="10" fill="#090d16" />

        {/* White Eye Sparkles / Reflections */}
        <circle cx="86" cy="94" r="4.5" fill="#ffffff" />
        <circle cx="92" cy="101" r="2" fill="#ffffff" />
        <circle cx="128" cy="94" r="4.5" fill="#ffffff" />
        <circle cx="134" cy="101" r="2" fill="#ffffff" />
      </g>

      {/* Beak */}
      <path
        d="M104 114 L116 114 L110 128 Z"
        fill="#ff7700"
        stroke="#ea580c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Right Wing (Holding the platter with bar chart) */}
      <path
        d="M152 140 C172 135 190 142 198 156 C190 168 174 172 154 165 Z"
        fill="#0050e6"
      />
      {/* Platter hand curve */}
      <path
        d="M185 160 C194 162 208 162 215 158 C212 165 198 168 185 163 Z"
        fill="#003db3"
      />

      {/* Analytics Tray / Platter */}
      <rect
        x="180"
        y="152"
        width="44"
        height="5"
        rx="2.5"
        fill="#94a3b8"
      />

      {/* 3 Analytics Bar Charts on Tray */}
      {/* Bar 1 (Blue) */}
      <rect x="186" y="132" width="6" height="20" rx="1.5" fill="#0284c7" />
      {/* Bar 2 (Cyan) */}
      <rect x="196" y="122" width="6" height="30" rx="1.5" fill="#06b6d4" />
      {/* Bar 3 (Orange) */}
      <rect x="206" y="112" width="6" height="40" rx="1.5" fill="#f97316" />
    </svg>
  )
}

