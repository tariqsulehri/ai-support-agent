import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND } from '../../scenes'

const font = "Inter, 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"

function Backdrop({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame()
  const drift = interpolate(frame, [0, 300], [0, 40], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill
      style={{
        fontFamily: font,
        color: 'white',
        background: `radial-gradient(1200px 700px at ${70 - drift / 4}% ${20 + drift / 8}%, rgba(76,186,171,.28), transparent 60%),
                     linear-gradient(135deg, #0b2a45 0%, #133cb4 55%, ${BRAND.primary} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, background: BRAND.accent }} />
    </AbsoluteFill>
  )
}

/** Fades and slides in after `delay` frames. */
function Reveal({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } })
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)`, ...style }}>{children}</div>
}

export function IntroCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Backdrop>
      <div style={{ textAlign: 'center' }}>
        <Reveal><div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>{title}</div></Reveal>
        <Reveal delay={12}><div style={{ fontSize: 48, marginTop: 20, color: '#C7D7FE' }}>{subtitle}</div></Reveal>
      </div>
    </Backdrop>
  )
}

export function BenefitsCard({ headline, points }: { headline: string; points: string[] }) {
  return (
    <Backdrop>
      <div style={{ width: 1400 }}>
        <Reveal><div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -2, marginBottom: 60 }}>{headline}</div></Reveal>
        {points.map((point, i) => (
          <Reveal key={point} delay={20 + i * 22} style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 34 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: BRAND.accent, display: 'grid', placeItems: 'center', fontSize: 38, fontWeight: 800 }}>✓</div>
            <div style={{ fontSize: 54, fontWeight: 600, color: '#E0E8FF' }}>{point}</div>
          </Reveal>
        ))}
      </div>
    </Backdrop>
  )
}

export function CtaCard({ cta, sub, url }: { cta: string; sub: string; url: string }) {
  const frame = useCurrentFrame()
  const pulse = 1 + Math.sin(frame / 8) * 0.02
  return (
    <Backdrop>
      <div style={{ textAlign: 'center', width: 1500 }}>
        <Reveal><div style={{ fontSize: 100, fontWeight: 800, letterSpacing: -2 }}>{cta}</div></Reveal>
        <Reveal delay={12}><div style={{ fontSize: 44, marginTop: 28, color: '#C7D7FE' }}>{sub}</div></Reveal>
        <Reveal delay={26}>
          <div style={{ display: 'inline-block', marginTop: 64, padding: '28px 56px', borderRadius: 24, background: 'white',
            color: BRAND.primary, fontSize: 56, fontWeight: 800, transform: `scale(${pulse})`, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            {url}
          </div>
        </Reveal>
      </div>
    </Backdrop>
  )
}
