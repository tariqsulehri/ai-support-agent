import { Composition, staticFile, type CalculateMetadataFunction } from 'remotion'
import { getVideoMetadata } from '@remotion/media-utils'
import { SCENES, type SceneId } from '../../scenes'
import { CtaCard, IntroCard, ProblemCard, SolutionCard } from './Cards'
import { Captioned } from './Captioned'

const FPS = 30

/**
 * Card length = max(minSeconds, narration + 1.2 s), the same rule as demo/build-video.ts,
 * read from output/audio/durations.json (written by `npm run demo:voiceover`).
 */
function cardLength(id: SceneId): CalculateMetadataFunction<Record<string, unknown>> {
  return async () => {
    const scene = SCENES.find((s) => s.id === id)!
    let spoken = 0
    try {
      const durations = (await fetch(staticFile('audio/durations.json')).then((r) => r.json())) as Record<string, number>
      spoken = durations[id] ?? 0
    } catch {
      // No narration yet: fall back to the scene minimum.
    }
    return { durationInFrames: Math.ceil(Math.max(scene.minSeconds, spoken + 1.2) * FPS) }
  }
}

/**
 * Card compositions (1920x1080 @ 30 fps), rendered to out/<id>.mp4 and picked up by
 * demo/build-video.ts: intro, problem, solution, cta. "captioned" overlays animated
 * lower thirds on a finished video (optional; the build already draws captions).
 */
export function Root() {
  const card = { fps: FPS, width: 1920, height: 1080, durationInFrames: 10 * FPS, defaultProps: {} }
  return (
    <>
      <Composition id="intro" component={IntroCard} {...card} calculateMetadata={cardLength('intro')} />
      <Composition id="problem" component={ProblemCard} {...card} calculateMetadata={cardLength('problem')} />
      <Composition id="solution" component={SolutionCard} {...card} calculateMetadata={cardLength('solution')} />
      <Composition id="cta" component={CtaCard} {...card} calculateMetadata={cardLength('cta')} />
      <Composition id="captioned" component={Captioned} durationInFrames={60 * FPS} fps={FPS} width={1920} height={1080}
        defaultProps={{ src: 'final-demo.mp4', timelineFile: 'timeline.json', offsetSeconds: 0 }}
        calculateMetadata={async ({ props }) => {
          const { durationInSeconds } = await getVideoMetadata(staticFile(props.src))
          return { durationInFrames: Math.ceil(durationInSeconds * FPS) }
        }} />
    </>
  )
}
