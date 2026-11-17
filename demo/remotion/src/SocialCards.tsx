import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND } from '../../scenes'
import logoWhite from '../../assets/aiscripto-logo-white.png'

/**
 * Fast, punchy cards for the social cut. Layouts adapt to 9:16, 4:5 and 16:9 from the
 * composition size: `u` is 1% of the shorter side, so type scales with the frame.
 */
const font = "Inter, 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif"

function useLayout() {
  const { width, height } = useVideoConfig()
  return { u: Math.min(width, height) / 100, portrait: height > width, tall: height / width > 1.5 }
}

function Backdrop({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'alert' }) {
  const frame = useCurrentFrame()
  const spin = interpolate(frame, [0, 300], [0, 40])
  const base = tone === 'alert'
    ? 'linear-gradient(160deg, #12051f 0%, #3b0a2a 55%, #7f1d1d 120%)'
    : `linear-gradient(160deg, #0b0a3a 0%, ${BRAND.primary} 55%, ${BRAND.blue} 110%)`
  return (
    <AbsoluteFill style={{ fontFamily: font, color: 'white', overflow: 'hidden', background: base }}>
      <AbsoluteFill style={{ background: `conic-gradient(from ${spin}deg at 70% 20%, transparent 0deg, rgba(76,186,171,.22) 40deg, transparent 90deg)` }} />
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
      {children}
    </AbsoluteFill>
  )
}

/** Pops in with a slight overshoot: social pacing. */
function Pop({ at = 0, children, style }: { at?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - at, fps, config: { damping: 12, mass: 0.6, stiffness: 160 } })
  return <div style={{ opacity: Math.min(1, Math.max(0, p)), transform: `scale(${0.7 + 0.3 * p}) translateY(${(1 - p) * 30}px)`, ...style }}>{children}</div>
}

function Logo({ width }: { width: number }) {
  return <Img src={logoWhite} style={{ width }} />
}

export function SocialHook() {
  const { u, portrait } = useLayout()
  const frame = useCurrentFrame()
  const shake = frame < 20 ? Math.sin(frame * 1.7) * (20 - frame) * 0.15 : 0
  return (
    <Backdrop tone="alert">
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${8 * u}px` }}>
        <Pop>
          <div style={{ fontSize: 22 * u, transform: `rotate(${shake}deg)` }}>📵</div>
        </Pop>
        <Pop at={4}>
          <div style={{ fontSize: (portrait ? 11 : 9) * u, fontWeight: 900, lineHeight: 1.02, letterSpacing: -0.3 * u, marginTop: 3 * u }}>
            Still sending customers to <span style={{ color: '#FB7185' }}>voicemail?</span>
          </div>
        </Pop>
      </AbsoluteFill>
    </Backdrop>
  )
}

export function SocialProblem() {
  const { u, portrait } = useLayout()
  const { durationInFrames } = useVideoConfig()
  const items = ['Missed calls', 'Slow replies', 'Lost leads']
  return (
    <Backdrop tone="alert">
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: portrait ? 'stretch' : 'center', padding: `0 ${9 * u}px` }}>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: 3.5 * u, justifyContent: 'center' }}>
          {items.map((item, i) => (
            <Pop key={item} at={Math.round(durationInFrames * (0.04 + i * 0.16))}
              style={{ display: 'flex', alignItems: 'center', gap: 3 * u, padding: `${4 * u}px ${5 * u}px`, borderRadius: 4 * u,
                background: 'rgba(225,29,72,.18)', border: `${0.4 * u}px solid rgba(251,113,133,.7)` }}>
              <span style={{ width: 11 * u, height: 11 * u, borderRadius: 3 * u, background: '#E11D48', display: 'grid', placeItems: 'center', fontSize: 7 * u, fontWeight: 900 }}>✕</span>
              <span style={{ fontSize: 8.5 * u, fontWeight: 900 }}>{item}</span>
            </Pop>
          ))}
        </div>
        <Pop at={Math.round(durationInFrames * 0.55)} style={{ textAlign: 'center', marginTop: 6 * u }}>
          <div style={{ fontSize: 6 * u, fontWeight: 800, color: '#FECACA' }}>= money walking out the door 💸</div>
        </Pop>
      </AbsoluteFill>
    </Backdrop>
  )
}

export function SocialSolution() {
  const { u, portrait } = useLayout()
  const { durationInFrames } = useVideoConfig()
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${7 * u}px` }}>
        <Pop><Logo width={(portrait ? 78 : 62) * u} /></Pop>
        <Pop at={8}><div style={{ fontSize: (portrait ? 8.4 : 7.5) * u, fontWeight: 900, marginTop: 5 * u, letterSpacing: -0.2 * u, lineHeight: 1.08 }}>AI Support Voice &amp; Chatbot</div></Pop>
        <Pop at={Math.round(durationInFrames * 0.5)}>
          <div style={{ marginTop: 5 * u, display: 'inline-flex', alignItems: 'center', gap: 2.5 * u, padding: `${2.6 * u}px ${5 * u}px`, borderRadius: 999,
            background: '#14B8A6', fontSize: 6 * u, fontWeight: 900, boxShadow: `0 ${2 * u}px ${6 * u}px rgba(0,0,0,.3)` }}>
            ⚡ Answers every customer 24/7
          </div>
        </Pop>
      </AbsoluteFill>
    </Backdrop>
  )
}

export function SocialCta() {
  const { u, portrait } = useLayout()
  const frame = useCurrentFrame()
  const pulse = 1 + Math.sin(frame / 6) * 0.03
  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${6 * u}px` }}>
        <Pop><Logo width={(portrait ? 66 : 50) * u} /></Pop>
        <Pop at={6}><div style={{ fontSize: (portrait ? 10 : 8.5) * u, fontWeight: 900, marginTop: 5 * u, lineHeight: 1.05, letterSpacing: -0.3 * u }}>Never miss a customer again</div></Pop>
        <Pop at={14}>
          <div style={{ marginTop: 5 * u, padding: `${3 * u}px ${6 * u}px`, borderRadius: 3.5 * u, background: '#fff', color: BRAND.primary,
            fontSize: 6.4 * u, fontWeight: 900, transform: `scale(${pulse})`, boxShadow: `0 ${2.5 * u}px ${8 * u}px rgba(0,0,0,.35)` }}>
            Book your free demo 👉
          </div>
        </Pop>
        <Pop at={22}><div style={{ marginTop: 4.5 * u, fontSize: (portrait ? 4.3 : 3.6) * u, fontWeight: 800 }}>aiscripto.com/ai-support-voice-chatbot</div></Pop>
        <Pop at={28}><div style={{ marginTop: 1.8 * u, fontSize: (portrait ? 4.3 : 3.6) * u, fontWeight: 700, color: '#99F6E4' }}>✉ {BRAND.email}</div></Pop>
      </AbsoluteFill>
    </Backdrop>
  )
}
