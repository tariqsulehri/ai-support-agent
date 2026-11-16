import { useEffect, useState } from 'react'
import { AbsoluteFill, OffthreadVideo, Sequence, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, SCENES } from '../../scenes'

type Segment = { id: string; start: number; end: number }

function LowerThird({ text, index }: { text: string; index: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame, fps, config: { damping: 200 } })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 70px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 30px', borderRadius: 18,
        background: 'rgba(11,42,69,.88)', color: 'white', fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
        fontSize: 40, fontWeight: 700, boxShadow: '0 12px 40px rgba(0,0,0,.3)',
        opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: BRAND.accent, display: 'grid', placeItems: 'center', fontSize: 24 }}>
          {index}
        </span>
        {text}
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
      {(timeline ?? []).map((seg, i) => {
        const scene = SCENES.find((s) => s.id === seg.id)
        if (!scene) return null
        const from = Math.round((seg.start + offsetSeconds + 0.6) * fps)
        const length = Math.max(1, Math.round(Math.min(5, seg.end - seg.start - 1) * fps))
        return (
          <Sequence key={seg.id} from={from} durationInFrames={length}>
            <LowerThird text={scene.caption} index={i + 1} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
