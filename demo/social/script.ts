/**
 * The ~75-second social cut (TikTok, Instagram Reels/feed, YouTube Shorts/video, Facebook,
 * LinkedIn, X). Reuses the long demo's recording (demo/output/screen-1080p.mp4): each
 * footage scene points at a time range in that file and is sped up to fit its narration.
 *
 * Built by demo/social/build-social.ts into 9:16, 4:5 and 16:9 versions.
 */

export type SocialFormat = '9x16' | '4x5' | '16x9'

export const FORMATS: Record<SocialFormat, { width: number; height: number; label: string }> = {
  '9x16': { width: 1080, height: 1920, label: 'Vertical: TikTok, Reels, Shorts, Stories, Snapchat' },
  '4x5': { width: 1080, height: 1350, label: 'Portrait feed: Instagram, Facebook, LinkedIn' },
  '16x9': { width: 1920, height: 1080, label: 'Landscape: YouTube, LinkedIn, Facebook, X, website' },
}

export interface SocialScene {
  id: string
  /** Remotion card (rendered per format) or a range of the long demo's screen recording. */
  source: { card: 'hook' | 'problem' | 'solution' | 'cta' } | { from: number; to: number; focus: 'chat' | 'app' }
  /** Region of the 1920x1080 recording to show in portrait formats [x, y, w, h]. Default: main panel without the sidebar. */
  crop?: [number, number, number, number]
  /** Big headline above the footage in the vertical/portrait layouts. */
  headline?: string
  minSeconds: number
  voiceover: string
}

export const SOCIAL_SCENES: SocialScene[] = [
  { id: 's-hook', source: { card: 'hook' }, minSeconds: 3,
    voiceover: 'Still sending your customers to voicemail?' },
  { id: 's-problem', source: { card: 'problem' }, minSeconds: 6,
    voiceover: 'Missed calls. Slow replies. Lost leads. Every one of them is money walking out the door.' },
  { id: 's-solution', source: { card: 'solution' }, minSeconds: 5,
    voiceover: "Meet AI Scripto's AI Support Voice and Chatbot. It answers every customer, twenty-four seven." },
  { id: 's-chat', source: { from: 4.5, to: 31.0, focus: 'chat' }, headline: 'Instant answers. Booked jobs.', minSeconds: 14,
    voiceover: 'A customer asks for help and gets an instant answer and a booked appointment. Name, phone and email are captured automatically, with a summary for your team.' },
  { id: 's-overview', source: { from: 62.0, to: 73.0, focus: 'app' }, headline: 'Every lead in one dashboard', minSeconds: 6.5,
    voiceover: 'Your dashboard shows every conversation, every lead and every hot opportunity.' },
  { id: 's-conversations', source: { from: 82.0, to: 94.0, focus: 'app' }, headline: 'Every conversation saved', crop: [300, 0, 1340, 1080], minSeconds: 6,
    voiceover: 'Read AI summaries, sentiment and full transcripts in seconds.' },
  { id: 's-leads', source: { from: 103.0, to: 118.0, focus: 'app' }, headline: 'Close more deals', crop: [580, 0, 1320, 1080], minSeconds: 7,
    voiceover: 'Assign leads, add notes and track every deal all the way to won.' },
  { id: 's-insights', source: { from: 127.0, to: 136.0, focus: 'app' }, headline: 'Know who to call first', minSeconds: 5,
    voiceover: 'AI insights tell your team exactly who to call first.' },
  { id: 's-admin', source: { from: 41.0, to: 50.0, focus: 'app' }, headline: 'Manage every client', crop: [140, 0, 1640, 1080], minSeconds: 5,
    voiceover: 'Agencies manage every client business from one console.' },
  { id: 's-cta', source: { card: 'cta' }, minSeconds: 7,
    voiceover: 'Never miss a customer again. Book your free demo at aiscripto dot com.' },
]

/** Voice direction for the social cut: faster and more energetic than the long demo. */
export const SOCIAL_TTS_STYLE =
  'High-energy, upbeat and confident female narrator for a social media ad. Punchy, fast-paced and excited, ' +
  'with a big smile in the voice and crisp diction. Short, snappy delivery with almost no pauses. ' +
  'Hit the hook like a question that grabs attention.'

/** Length of a social scene: its minimum, or narration plus a short tail. Shared with Remotion. */
export const segmentSeconds = (scene: SocialScene, narration: number | undefined) =>
  Math.max(scene.minSeconds, (narration ?? 0) + 0.45)
