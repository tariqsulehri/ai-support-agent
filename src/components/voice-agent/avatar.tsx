'use client'

import type { Phase } from '@/types'

interface AvatarProps {
  phase: Phase
  size?: 'sm' | 'lg'
}

export function AnimatedAvatar({ phase, size = 'lg' }: AvatarProps) {
  const isSpeaking   = phase === 'speaking'
  const isListening  = phase === 'listening' || phase === 'transcribing'
  const isThinking   = phase === 'thinking'
  const isIdle       = phase === 'idle'
  const dim          = size === 'lg' ? 140 : 42

  return (
    <div className="relative flex items-center justify-center select-none"
         style={{ width: dim, height: dim }}>

      {/* ── Orbital rings (lg only) ─────────────────────────────────────── */}
      {size === 'lg' && (
        <>
          <div className={`absolute rounded-full border border-cyan-400/20
                          ${isSpeaking ? 'robot-orbit-fast' : 'robot-orbit-slow'}`}
               style={{ width: dim + 28, height: dim + 28 }} />
          <div className={`absolute rounded-full border border-purple-500/15
                          ${isListening ? 'robot-orbit-fast' : 'robot-orbit-slow'}`}
               style={{ width: dim + 48, height: dim + 48, animationDirection: 'reverse' }} />
        </>
      )}

      {/* ── Pulse rings ─────────────────────────────────────────────────── */}
      {isSpeaking && size === 'lg' && <>
        <div className="absolute rounded-full robot-pulse-ring robot-pulse-1"
             style={{ width: dim, height: dim }} />
        <div className="absolute rounded-full robot-pulse-ring robot-pulse-2"
             style={{ width: dim, height: dim }} />
        <div className="absolute rounded-full robot-pulse-ring robot-pulse-3"
             style={{ width: dim, height: dim }} />
      </>}

      {isListening && size === 'lg' && (
        <div className="absolute rounded-full robot-listen-ring"
             style={{ width: dim, height: dim }} />
      )}

      {/* ── Main SVG ────────────────────────────────────────────────────── */}
      <div className={`relative z-10 ${
        isSpeaking  ? 'robot-bob-speak'  :
        isListening ? 'robot-bob-listen' :
        isThinking  ? 'robot-bob-think'  :
        'robot-float'
      }`} style={{ width: dim, height: dim }}>

        <svg viewBox="0 0 140 140" width={dim} height={dim}
             xmlns="http://www.w3.org/2000/svg">
          <defs>

            {/* ── Gradients ─────────────────────────────────────────────── */}
            <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
              <stop offset="0%"   stopColor="#0D1B3E" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>

            <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#1E3A5F" />
              <stop offset="50%"  stopColor="#162B46" />
              <stop offset="100%" stopColor="#0D1B2E" />
            </linearGradient>

            <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#1A3050" />
              <stop offset="100%" stopColor="#0F1F35" />
            </linearGradient>

            <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#00F5FF" stopOpacity="1" />
              <stop offset="60%"  stopColor="#00BFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="eyeGlowR" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#00F5FF" stopOpacity="1" />
              <stop offset="60%"  stopColor="#00BFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#00FF88" />
              <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
            </radialGradient>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="strongGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="headClip">
              <rect x="28" y="30" width="84" height="88" rx="14" />
            </clipPath>
          </defs>

          {/* ── Background circle ─────────────────────────────────────────── */}
          <circle cx="70" cy="70" r="70" fill="url(#bgGrad)" />

          {/* ── Circuit trace lines (bg decoration) ─────────────────────── */}
          <g stroke="#00D4FF" strokeOpacity="0.07" strokeWidth="0.8" fill="none">
            <path d="M20 40 H40 V25 H60" />
            <path d="M120 40 H100 V25 H80" />
            <path d="M15 80 H30 V95 H20" />
            <path d="M125 80 H110 V95 H120" />
            <circle cx="60" cy="25" r="2" fill="#00D4FF" fillOpacity="0.2" stroke="none" />
            <circle cx="80" cy="25" r="2" fill="#00D4FF" fillOpacity="0.2" stroke="none" />
          </g>

          {/* ── Antenna ───────────────────────────────────────────────────── */}
          <line x1="70" y1="30" x2="70" y2="14" stroke="#2A4A6B" strokeWidth="2.5"
                strokeLinecap="round" />
          <circle cx="70" cy="11" r="5" fill="#0D1B2E" stroke="#1E3A5F" strokeWidth="1" />
          <circle cx="70" cy="11" r="3" fill="url(#antennaGlow)"
                  className={isThinking ? 'robot-antenna-think' : 'robot-antenna-idle'} />

          {/* ── Head shell ────────────────────────────────────────────────── */}
          <rect x="28" y="30" width="84" height="88" rx="14"
                fill="url(#headGrad)" stroke="#1E3A5F" strokeWidth="1.5" />

          {/* ── Head shine ────────────────────────────────────────────────── */}
          <rect x="28" y="30" width="84" height="88" rx="14"
                fill="url(#shineGrad)" />

          {/* ── Panel lines ───────────────────────────────────────────────── */}
          <line x1="28" y1="72" x2="112" y2="72"
                stroke="#00D4FF" strokeOpacity="0.1" strokeWidth="0.8" />
          <rect x="34" y="36" width="72" height="3" rx="1.5"
                fill="#00D4FF" fillOpacity="0.06" />

          {/* ── Ear panels ────────────────────────────────────────────────── */}
          <rect x="17" y="52" width="11" height="24" rx="4"
                fill="#162B46" stroke="#1E3A5F" strokeWidth="1" />
          <rect x="20" y="57" width="5" height="4" rx="1" fill="#00D4FF" fillOpacity="0.3" />
          <rect x="20" y="64" width="5" height="4" rx="1" fill="#7C3AED" fillOpacity="0.3" />

          <rect x="112" y="52" width="11" height="24" rx="4"
                fill="#162B46" stroke="#1E3A5F" strokeWidth="1" />
          <rect x="115" y="57" width="5" height="4" rx="1" fill="#00D4FF" fillOpacity="0.3" />
          <rect x="115" y="64" width="5" height="4" rx="1" fill="#7C3AED" fillOpacity="0.3" />

          {/* ── Forehead status strip ─────────────────────────────────────── */}
          <rect x="38" y="38" width="64" height="8" rx="3"
                fill="#0A1628" stroke="#1E3A5F" strokeWidth="0.8" />
          <rect x="41" y="40.5" width="10" height="3" rx="1"
                fill="#00FF88" fillOpacity="0.7" />
          <rect x="54" y="40.5" width="6"  height="3" rx="1"
                fill="#00D4FF" fillOpacity="0.5" />
          <rect x="63" y="40.5" width="6"  height="3" rx="1"
                fill="#7C3AED" fillOpacity="0.5" />
          <rect x="72" y="40.5" width="6"  height="3" rx="1"
                fill="#00D4FF" fillOpacity="0.3" />
          <rect x="81" y="40.5" width="10" height="3" rx="1"
                fill="#1E3A5F" />

          {/* ── Eye sockets ───────────────────────────────────────────────── */}
          <rect x="38" y="52" width="26" height="18" rx="5"
                fill="#060E1C" stroke="#1E3A5F" strokeWidth="1" />
          <rect x="76" y="52" width="26" height="18" rx="5"
                fill="#060E1C" stroke="#1E3A5F" strokeWidth="1" />

          {/* ── Eye glow base ─────────────────────────────────────────────── */}
          <rect x="40" y="54" width="22" height="14" rx="3.5"
                fill="#00D4FF" fillOpacity="0.08" />
          <rect x="78" y="54" width="22" height="14" rx="3.5"
                fill="#00D4FF" fillOpacity="0.08" />

          {/* ── Eye iris (LED) ────────────────────────────────────────────── */}
          {!isThinking ? (
            <>
              {/* Normal / speaking / listening eyes */}
              <rect x="43" y="56" width="16" height="10" rx="2"
                    fill="#003366" filter="url(#glow)" />
              <rect x="81" y="56" width="16" height="10" rx="2"
                    fill="#003366" filter="url(#glow)" />

              {/* Scan line */}
              <rect className="robot-eye-scan" x="43" y="56" width="4" height="10" rx="1"
                    fill="#00F5FF" fillOpacity="0.9" filter="url(#glow)" />
              <rect className="robot-eye-scan" x="81" y="56" width="4" height="10" rx="1"
                    fill="#00F5FF" fillOpacity="0.9" filter="url(#glow)" />

              {/* Eye shine */}
              <rect x="43" y="57" width="16" height="3" rx="1"
                    fill="#FFFFFF" fillOpacity="0.05" />
              <rect x="81" y="57" width="16" height="3" rx="1"
                    fill="#FFFFFF" fillOpacity="0.05" />
            </>
          ) : (
            <>
              {/* Thinking eyes — loading bar */}
              <rect x="43" y="58" width="16" height="4" rx="2"
                    fill="#1E3A5F" />
              <rect className="robot-eye-load" x="43" y="58" width="4" height="4" rx="2"
                    fill="#7C3AED" filter="url(#glow)" />
              <rect x="81" y="58" width="16" height="4" rx="2"
                    fill="#1E3A5F" />
              <rect className="robot-eye-load" x="81" y="58" width="4" height="4" rx="2"
                    fill="#7C3AED" filter="url(#glow)" />
            </>
          )}

          {/* ── Nose dot ──────────────────────────────────────────────────── */}
          <circle cx="70" cy="77" r="2" fill="#1E3A5F" />
          <circle cx="70" cy="77" r="1" fill="#00D4FF" fillOpacity="0.4" />

          {/* ── Mouth panel ───────────────────────────────────────────────── */}
          <rect x="42" y="83" width="56" height="20" rx="6"
                fill="#060E1C" stroke="#1E3A5F" strokeWidth="1" />

          {/* ── Mouth — idle curved LED strip ─────────────────────────────── */}
          {(isIdle || phase === 'connecting' || phase === 'ended') && (
            <path d="M50 96 Q70 103 90 96"
                  stroke="#00D4FF" strokeWidth="2" fill="none"
                  strokeLinecap="round" filter="url(#glow)"
                  strokeOpacity="0.85" />
          )}

          {/* ── Mouth — speaking equalizer bars ───────────────────────────── */}
          {isSpeaking && (
            <g filter="url(#glow)">
              {[
                { x: 49,  delay: '0s'    },
                { x: 56,  delay: '0.1s'  },
                { x: 63,  delay: '0.05s' },
                { x: 70,  delay: '0.15s' },
                { x: 77,  delay: '0.08s' },
                { x: 84,  delay: '0.12s' },
                { x: 91,  delay: '0.04s' },
              ].map((bar, i) => (
                <rect
                  key={i}
                  x={bar.x} y="86" width="4" height="14" rx="2"
                  fill="#00F5FF"
                  className="robot-eq-bar"
                  style={{ animationDelay: bar.delay, transformOrigin: `${bar.x + 2}px 100px` }}
                />
              ))}
            </g>
          )}

          {/* ── Mouth — listening scan line ────────────────────────────────── */}
          {isListening && (
            <g>
              <rect x="48" y="90" width="44" height="6" rx="3"
                    fill="#F59E0B" fillOpacity="0.12" />
              <rect className="robot-listen-scan" x="48" y="91" width="12" height="4" rx="2"
                    fill="#F59E0B" fillOpacity="0.9" filter="url(#glow)" />
            </g>
          )}

          {/* ── Mouth — thinking dots ─────────────────────────────────────── */}
          {isThinking && (
            <g filter="url(#glow)">
              {[58, 68, 78].map((cx, i) => (
                <circle key={i} cx={cx} cy="93" r="3.5"
                        fill="#7C3AED" fillOpacity="0.9"
                        className="robot-think-dot"
                        style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </g>
          )}

          {/* ── Bottom neck connector ─────────────────────────────────────── */}
          <rect x="55" y="118" width="30" height="10" rx="4"
                fill="#162B46" stroke="#1E3A5F" strokeWidth="1" />
          <rect x="62" y="120" width="16" height="2" rx="1"
                fill="#00D4FF" fillOpacity="0.25" />

          {/* ── Corner screws ─────────────────────────────────────────────── */}
          {[[35,37],[105,37],[35,111],[105,111]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3.5" fill="#0A1628" stroke="#1E3A5F" strokeWidth="0.8" />
              <line x1={cx-1.5} y1={cy} x2={cx+1.5} y2={cy}
                    stroke="#2A4A6B" strokeWidth="0.8" />
              <line x1={cx} y1={cy-1.5} x2={cx} y2={cy+1.5}
                    stroke="#2A4A6B" strokeWidth="0.8" />
            </g>
          ))}

        </svg>
      </div>
    </div>
  )
}
