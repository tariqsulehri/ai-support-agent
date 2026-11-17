import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BENEFITS, BRAND, PROBLEMS } from '../../scenes'
import logoWhite from '../../assets/aiscripto-logo-white.png'

const font = "Inter, 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"

function Backdrop({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'dark' }) {
  const frame = useCurrentFrame()
  const drift = interpolate(frame, [0, 600], [0, 60], { extrapolateRight: 'clamp' })
  const base = tone === 'dark'
    ? 'linear-gradient(135deg, #0a0820 0%, #1a1046 55%, #2a0f3d 100%)'
    : `linear-gradient(135deg, #0b0a3a 0%, ${BRAND.primary} 55%, ${BRAND.blue} 100%)`
  return (
    <AbsoluteFill style={{ fontFamily: font, color: 'white', overflow: 'hidden',
      background: `radial-gradient(1100px 700px at ${75 - drift / 5}% ${15 + drift / 10}%, rgba(76,186,171,.22), transparent 60%), ${base}` }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1.5px, transparent 1.5px)', backgroundSize: '34px 34px' }} />
      {children}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.blue})` }} />
    </AbsoluteFill>
  )
}

function Reveal({ at = 0, children, style }: { at?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - at, fps, config: { damping: 200 } })
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)`, ...style }}>{children}</div>
}

function CornerLogo() {
  return <Img src={logoWhite} style={{ position: 'absolute', top: 56, left: 72, height: 58 }} />
}

function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 999, background: `${color}26`, border: `2px solid ${color}`,
      color, fontSize: 24, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>{children}</span>
  )
}

/** Spread reveals over the first ~70% of the scene so they land with the narration. */
const revealAt = (i: number, count: number, frames: number, start = 0.12, end = 0.72) =>
  Math.round(frames * (start + ((end - start) * i) / Math.max(1, count - 1)))

export function IntroCard() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const scale = interpolate(spring({ frame, fps, config: { damping: 18, mass: 0.8 } }), [0, 1], [0.85, 1])
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ transform: `scale(${scale})`, opacity: Math.min(1, frame / 12) }}>
          <Img src={logoWhite} style={{ width: 860 }} />
        </div>
        <Reveal at={18}><div style={{ fontSize: 64, fontWeight: 800, marginTop: 46, letterSpacing: -1 }}>{BRAND.product}</div></Reveal>
        <Reveal at={32}><div style={{ fontSize: 34, marginTop: 18, color: '#C7D7FE' }}>{BRAND.tagline}</div></Reveal>
      </AbsoluteFill>
    </Backdrop>
  )
}

function ListCard({ tone, label, labelColor, title, items, icon, iconBg, footer }: {
  tone: 'brand' | 'dark'; label: string; labelColor: string; title: string; items: readonly string[]
  icon: string; iconBg: string; footer: string
}) {
  const { durationInFrames } = useVideoConfig()
  return (
    <Backdrop tone={tone}>
      <CornerLogo />
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 170px' }}>
        <Reveal at={4}><Pill color={labelColor}>{label}</Pill></Reveal>
        <Reveal at={10}><div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, margin: '26px 0 48px' }}>{title}</div></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }}>
          {items.map((item, i) => (
            <Reveal key={item} at={revealAt(i, items.length, durationInFrames)}
              style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '28px 30px', borderRadius: 24,
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', backdropFilter: 'blur(4px)' }}>
              <span style={{ flex: '0 0 62px', height: 62, borderRadius: 18, background: iconBg, display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 900 }}>{icon}</span>
              <span style={{ fontSize: 38, fontWeight: 650, lineHeight: 1.2 }}>{item}</span>
            </Reveal>
          ))}
        </div>
        <Reveal at={Math.round(durationInFrames * 0.8)}>
          <div style={{ marginTop: 44, fontSize: 40, fontWeight: 800, color: labelColor }}>{footer}</div>
        </Reveal>
      </AbsoluteFill>
    </Backdrop>
  )
}

export function ProblemCard() {
  return <ListCard tone="dark" label="The problem" labelColor="#FB7185" title="Without an AI support agent" items={PROBLEMS}
    icon="✕" iconBg="#E11D48" footer="Every missed conversation is lost revenue." />
}

export function SolutionCard() {
  return <ListCard tone="brand" label="After deploying AI Scripto" labelColor="#5EEAD4" title={BRAND.product} items={BENEFITS}
    icon="✓" iconBg="#0D9488" footer="Let's see it in action →" />
}

export function CtaCard() {
  const frame = useCurrentFrame()
  const pulse = 1 + Math.sin(frame / 9) * 0.015
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Reveal><Img src={logoWhite} style={{ width: 640 }} /></Reveal>
        <Reveal at={12}><div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, marginTop: 44 }}>Book your free demo</div></Reveal>
        <Reveal at={22}><div style={{ fontSize: 36, color: '#C7D7FE', marginTop: 14 }}>{BRAND.product} · {BRAND.tagline}</div></Reveal>
        <Reveal at={34}>
          <div style={{ marginTop: 50, padding: '26px 48px', borderRadius: 26, background: 'white', color: BRAND.primary,
            fontSize: 46, fontWeight: 800, transform: `scale(${pulse})`, boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
            {BRAND.ctaUrl}
          </div>
        </Reveal>
        <Reveal at={46}>
          <div style={{ marginTop: 34, fontSize: 40, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
            <span style={{ width: 54, height: 54, borderRadius: 16, background: BRAND.accent, display: 'grid', placeItems: 'center', fontSize: 28 }}>✉</span>
            {BRAND.email}
          </div>
        </Reveal>
      </AbsoluteFill>
    </Backdrop>
  )
}
