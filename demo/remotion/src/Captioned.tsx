import { useEffect, useState } from 'react'
import { AbsoluteFill, OffthreadVideo, Sequence, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, SCENES } from '../../scenes'

type Segment = { id: string; start: number; end: number }

function LowerThird({ text, part, frames }: { text: string; part: string; frames: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 200 } })
  const exit = spring({ frame: frame - (frames - 12), fps, config: { damping: 200 } })
  const p = enter - exit
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 64px 64px' }}>
      <div style={{ padding: '16px 28px 18px', borderRadius: 18, background: 'rgba(11,31,58,.92)', color: 'white',
        fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", boxShadow: '0 12px 40px rgba(0,0,0,.3)',
        borderLeft: `8px solid ${BRAND.accent}`, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#7FE3D4' }}>{part}</div>
        <div style={{ fontSize: 38, fontWeight: 700, marginTop: 4 }}>{text}</div>
      </div>
    </AbsoluteFill>
  )
}

/**
 * Plays output/final-demo.mp4 and overlays the scene captions from scenes.ts at the
 * times recorded in output/timeline.json (screen scenes only; cards have their own text).
 * If build-video.ts prepended an intro, pass its length as `offsetSeconds`
 * (e.g. --props='{"offsetSeconds":4}').
 */
export function Captioned({ src, timelineFile, offsetSeconds = 0 }: { src: string; timelineFile: string; offsetSeconds?: number }) {
  const { fps } = useVideoConfig()
  const [timeline, setTimeline] = useState<Segment[] | null>(null)
  const [handle] = useState(() => delayRender('timeline'))

  useEffect(() => {
    fetch(staticFile(timelineFile))
      .then((r) => r.json())
      .then((t: Segment[]) => setTimeline(t))
      .catch(() => setTimeline([]))
      .finally(() => continueRender(handle))
  }, [handle, timelineFile])

  return (
    <AbsoluteFill style={{ background: 'black' }}>
      <OffthreadVideo src={staticFile(src)} />
      {(timeline ?? []).map((seg) => {
        const scene = SCENES.find((s) => s.id === seg.id)
        if (!scene) return null
        const from = Math.round((seg.start + offsetSeconds + 0.6) * fps)
        const length = Math.max(fps, Math.round(Math.min(6, seg.end - seg.start - 1) * fps))
        return (
          <Sequence key={seg.id} from={from} durationInFrames={length}>
            <LowerThird text={scene.caption} part={scene.part} frames={length} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
