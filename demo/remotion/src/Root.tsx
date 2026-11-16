import { Composition, staticFile } from 'remotion'
import { getVideoMetadata } from '@remotion/media-utils'
import { BRAND, SCENES } from '../../scenes'
import { BenefitsCard, CtaCard, IntroCard } from './Cards'
import { Captioned } from './Captioned'

const FPS = 30
const seconds = (id: string, fallback: number) => {
  const scene = SCENES.find((s) => s.id === id)
  return Math.round((scene?.minSeconds ?? fallback) * FPS)
}

/**
 * Compositions (all 1920x1080 @ 30fps):
 *   intro      4s logo/title sting before the screen recording (optional)
 *   results    benefits card ("results" scene)
 *   cta        call-to-action card ("cta" scene)
 *   captioned  final-demo.mp4 with animated lower-third captions per scene
 *
 * Render the cards to out/<id>.mp4. demo/build-video.ts picks them up automatically.
 */
export function Root() {
  return (
    <>
      <Composition id="intro" component={IntroCard} durationInFrames={4 * FPS} fps={FPS} width={1920} height={1080}
        defaultProps={{ title: BRAND.product, subtitle: 'Your website, answered 24/7' }} />
      <Composition id="results" component={BenefitsCard} durationInFrames={seconds('results', 12)} fps={FPS} width={1920} height={1080}
        defaultProps={{
          headline: 'Never miss a website lead again',
          points: ['Every visitor answered, 24/7', 'Every lead captured with contact details', 'Instant summaries for your team'],
        }} />
      <Composition id="cta" component={CtaCard} durationInFrames={seconds('cta', 10)} fps={FPS} width={1920} height={1080}
        defaultProps={{ cta: BRAND.cta, sub: BRAND.ctaSub, url: BRAND.ctaUrl }} />
      <Composition id="captioned" component={Captioned} durationInFrames={60 * FPS} fps={FPS} width={1920} height={1080}
        defaultProps={{ src: 'final-demo.mp4', timelineFile: 'timeline.json', offsetSeconds: 0 }}
        calculateMetadata={async ({ props }) => {
          // Match the composition length to the assembled video.
          const { durationInSeconds } = await getVideoMetadata(staticFile(props.src))
          return { durationInFrames: Math.ceil(durationInSeconds * FPS) }
        }} />
    </>
  )
}
