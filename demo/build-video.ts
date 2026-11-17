/**
 * Assembles the final video with ffmpeg, in the order of SCENES (demo/scenes.ts):
 *   - card scenes (intro, problem, solution, cta) come from Remotion renders in
 *     demo/remotion/out/<id>.mp4, or simple ffmpeg title cards if those are missing,
 *   - the recorded scenes come from output/screen-1080p.mp4 (one continuous take),
 *   - each scene's narration (output/audio/<id>.mp3) is placed at that scene's start,
 *   - loudness is normalised (-16 LUFS), optional music is mixed underneath,
 *   - on-screen lower-third captions are drawn on every recorded scene.
 *
 *   npm run demo:build
 *
 * Output: output/final-demo.mp4 (with captions) and output/captions.srt.
 * Env: DEMO_MUSIC=track.mp3|none (default: assets/music-bed.mp3), DEMO_MUSIC_VOLUME=0.3, DEMO_LOWER_THIRDS=false, DEMO_FONT=/path/Bold.ttf
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { BENEFITS, BRAND, PROBLEMS, SCENES, type Scene, type SceneId } from './scenes'

const ROOT = __dirname
const OUT = path.join(ROOT, 'output')
const AUDIO = path.join(OUT, 'audio')
const WORK = path.join(OUT, 'build')
const REMOTION_OUT = path.join(ROOT, 'remotion', 'out')
const V = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30']
const A = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
/** Narration starts this long after its scene begins. */
const LEAD_IN = 0.4

function ff(args: string[]): void {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
}
function duration(file: string): number {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())
}
function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}
function findFont(): string {
  const font = [
    process.env.DEMO_FONT,
    '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
  ].find((f) => f && fs.existsSync(f))
  if (!font) throw new Error('No bold font found. Set DEMO_FONT=/path/to/a/Bold.ttf')
  return font
}
/** ffmpeg filter paths need ':' and '\' escaped. */
const esc = (p: string) => p.replace(/\\/g, '/').replace(/:/g, '\\:')

const narration = readJson<Record<string, number>>(path.join(AUDIO, 'durations.json'), {})
const audioFor = (id: SceneId) => {
  const f = path.join(AUDIO, `${id}.mp3`)
  return fs.existsSync(f) ? f : null
}
/** Length of a card scene: its minimum, or long enough for the narration. Remotion uses the same rule. */
export const cardSeconds = (scene: Scene) => Math.max(scene.minSeconds, (narration[scene.id] ?? 0) + 1.2)

type Timeline = Array<{ id: SceneId; start: number; end: number }>

/** The recorded take with each scene's narration placed at its start time. */
function narrateScreen(timeline: Timeline): string {
  const screen = path.join(OUT, 'screen-1080p.mp4')
  if (!fs.existsSync(screen)) throw new Error('Missing output/screen-1080p.mp4. Run `npm run demo:record` first.')
  const out = path.join(WORK, 'screen.mp4')
  const total = duration(screen)
  const clips = timeline.map((t) => ({ ...t, file: audioFor(t.id) })).filter((t) => t.file)
  if (!clips.length) {
    ff(['-i', screen, '-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', out])
    return out
  }
  const delays = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round((c.start + LEAD_IN) * 1000)}:all=1[a${i}]`)
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:duration=longest,apad[vo]`
  ff(['-i', screen, ...clips.flatMap((c) => ['-i', c.file!]), '-filter_complex', [...delays, mix].join(';'),
    '-map', '0:v', '-map', '[vo]', '-t', String(total), ...V, ...A, out])
  return out
}

/** Fallback title-card text when no Remotion render exists. */
function fallbackLines(id: SceneId): Array<{ text: string; size: number; color: string }> {
  switch (id) {
    case 'intro': return [{ text: BRAND.company, size: 110, color: 'white' }, { text: BRAND.product, size: 52, color: '0xC7D7FE' }]
    case 'problem': return [{ text: 'Without an AI support agent', size: 72, color: 'white' }, ...PROBLEMS.map((p) => ({ text: `x  ${p}`, size: 42, color: '0xFECACA' }))]
    case 'solution': return [{ text: `After deploying ${BRAND.company}`, size: 72, color: 'white' }, ...BENEFITS.map((b) => ({ text: `+  ${b}`, size: 42, color: '0xBBF7D0' }))]
    default: return [{ text: BRAND.cta, size: 80, color: 'white' }, { text: BRAND.ctaUrl, size: 44, color: '0x7FE3D4' }, { text: BRAND.email, size: 44, color: '0xC7D7FE' }]
  }
}

/** A full-screen card scene with its narration. */
function card(scene: Scene): string {
  const out = path.join(WORK, `card-${scene.id}.mp4`)
  const len = cardSeconds(scene)
  const voice = audioFor(scene.id)
  const audioIn = voice ? ['-i', voice] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
  const audioFilter = voice ? `[1:a]aresample=48000,adelay=${Math.round(LEAD_IN * 1000)}:all=1,apad[a]` : '[1:a]anull[a]'
  const remotion = path.join(REMOTION_OUT, `${scene.id}.mp4`)

  if (fs.existsSync(remotion)) {
    // Hold the last frame if the render is shorter than the narration needs.
    const pad = Math.max(0, len - duration(remotion))
    ff(['-i', remotion, ...audioIn, '-filter_complex', `[0:v]scale=1920:1080,fps=30,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}[v];${audioFilter}`,
      '-map', '[v]', '-map', '[a]', '-t', len.toFixed(2), ...V, ...A, out])
    return out
  }

  const font = esc(findFont())
  const lines = fallbackLines(scene.id)
  const lineGap = 90
  const top = 540 - ((lines.length - 1) * lineGap) / 2 - 40
  const draws = lines.map((l, i) => {
    const txt = path.join(WORK, `${scene.id}-${i}.txt`)
    fs.writeFileSync(txt, l.text)
    const fadeIn = (0.3 + i * 0.4).toFixed(2)
    return `drawtext=fontfile='${font}':textfile='${esc(txt)}':fontsize=${l.size}:fontcolor=${l.color}:x=(w-text_w)/2:y=${Math.round(top + i * lineGap + (i ? 30 : 0))}:alpha='min(1,max(0,(t-${fadeIn})/0.5))'`
  })
  ff(['-f', 'lavfi', '-i', `color=c=0x1800AD:s=1920x1080:r=30:d=${len.toFixed(2)}`, ...audioIn, '-filter_complex',
    `[0:v]drawbox=x=0:y=ih-14:w=iw:h=14:color=0x4CBAAB:t=fill,${draws.join(',')},fade=t=in:st=0:d=0.4[v];${audioFilter}`,
    '-map', '[v]', '-map', '[a]', '-t', len.toFixed(2), ...V, ...A, out])
  return out
}

/** SRT captions from the narration, chunked and timed proportionally within each scene. */
function writeCaptions(segments: Array<{ id: SceneId; start: number }>): string {
  const fmt = (s: number) => {
    const ms = Math.max(0, Math.round(s * 1000))
    const h = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, sec = Math.floor(ms / 1000) % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
  }
  const entries: string[] = []
  for (const seg of segments) {
    const scene = SCENES.find((s) => s.id === seg.id)!
    const spoken = narration[seg.id]
    if (!spoken) continue
    const chunks = scene.voiceover.match(/[^.!?,]+[.!?,]?/g)!.map((c) => c.trim()).filter(Boolean)
    const merged: string[] = []
    for (const c of chunks) {
      if (merged.length && (merged[merged.length - 1] + ' ' + c).length <= 64) merged[merged.length - 1] += ' ' + c
      else merged.push(c)
    }
    const totalChars = merged.reduce((n, c) => n + c.length, 0)
    let t = seg.start + LEAD_IN
    for (const c of merged) {
      const d = (c.length / totalChars) * spoken
      entries.push(`${entries.length + 1}\n${fmt(t)} --> ${fmt(t + d - 0.05)}\n${c}\n`)
      t += d
    }
  }
  const file = path.join(OUT, 'captions.srt')
  fs.writeFileSync(file, entries.join('\n'))
  return file
}

/** Lower-third captions (part label + caption) on the recorded scenes. */
function lowerThirdFilters(timeline: Timeline, offset: number): string[] {
  const font = esc(findFont())
  return timeline.flatMap((seg, i) => {
    const scene = SCENES.find((x) => x.id === seg.id)
    if (!scene) return []
    const a = seg.start + offset + 0.6
    const b = Math.min(seg.end + offset - 0.4, a + 6)
    const fade = `alpha='min(1,min((t-${a.toFixed(2)})/0.35,(${b.toFixed(2)}-t)/0.35))'`
    const on = `enable='between(t,${a.toFixed(2)},${b.toFixed(2)})'`
    const partFile = path.join(WORK, `lt-${i}-part.txt`)
    const capFile = path.join(WORK, `lt-${i}-cap.txt`)
    fs.writeFileSync(partFile, scene.part.toUpperCase())
    fs.writeFileSync(capFile, scene.caption)
    // One solid panel behind both lines (sized from the text) so page content never shows through.
    const panelW = Math.round(Math.max(scene.caption.length * 25, scene.part.length * 17) + 90)
    return [
      `drawbox=x=40:y=ih-222:w=${panelW}:h=176:color=0x0B1F3A@0.98:t=fill:${on}`,
      `drawbox=x=40:y=ih-222:w=8:h=176:color=0x4CBAAB:t=fill:${on}`,
      `drawtext=fontfile='${font}':textfile='${esc(partFile)}':fontsize=24:fontcolor=0x7FE3D4:x=72:y=h-196:${on}:${fade}`,
      `drawtext=fontfile='${font}':textfile='${esc(capFile)}':fontsize=44:fontcolor=white:x=72:y=h-140:${on}:${fade}`,
    ]
  })
}

function main(): void {
  fs.rmSync(WORK, { recursive: true, force: true })
  fs.mkdirSync(WORK, { recursive: true })
  const timeline = readJson<Timeline>(path.join(OUT, 'timeline.json'), [])

  // Assemble in SCENES order; all recorded scenes form one continuous screen segment.
  const parts: string[] = []
  const segments: Array<{ id: SceneId; start: number }> = []
  let clock = 0
  let screenOffset = 0
  let screenAdded = false
  for (const scene of SCENES) {
    if (scene.card) {
      const file = card(scene)
      parts.push(file)
      segments.push({ id: scene.id, start: clock })
      clock += duration(file)
    } else if (!screenAdded) {
      screenAdded = true
      const file = narrateScreen(timeline)
      parts.push(file)
      screenOffset = clock
      segments.push(...timeline.map((t) => ({ id: t.id, start: t.start + clock })))
      clock += duration(file)
    }
  }

  const list = path.join(WORK, 'parts.txt')
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'))
  const joined = path.join(WORK, 'joined.mp4')
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined])

  // Background music: DEMO_MUSIC=path, default the generated bed (demo/make-music-bed.sh), DEMO_MUSIC=none to skip.
  // The bed is ducked under the narration with a sidechain compressor.
  const musicEnv = process.env.DEMO_MUSIC
  const music = musicEnv === 'none' ? null : musicEnv || path.join(ROOT, 'assets', 'music-bed.mp3')
  const hasMusic = Boolean(music && fs.existsSync(music))
  const vol = process.env.DEMO_MUSIC_VOLUME || '0.3'
  // Normalise the narration first, then add the bed at a fixed level (loudnorm on the mix
  // would pump the music up in pauses), ducked under the voice and limited.
  const audioGraph = hasMusic
    ? `[0:a]loudnorm=I=-16:TP=-2,asplit=2[vo][key];[1:a]volume=${vol},afade=t=in:d=2,aformat=channel_layouts=stereo[bed];` +
      `[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=700[duck];` +
      `[vo][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89[a]`
    : '[0:a]loudnorm=I=-16:TP=-1.5[a]'
  const thirds = process.env.DEMO_LOWER_THIRDS !== 'false' && timeline.length ? lowerThirdFilters(timeline, screenOffset) : []
  const videoGraph = thirds.length ? `[0:v]${thirds.join(',')}[v]` : '[0:v]null[v]'
  const final = path.join(OUT, 'final-demo.mp4')
  ff(['-i', joined, ...(hasMusic ? ['-stream_loop', '-1', '-i', music!] : []),
    '-filter_complex', `${videoGraph};${audioGraph}`, '-map', '[v]', '-map', '[a]', ...V, ...A, '-movflags', '+faststart', final])

  const srt = writeCaptions(segments)
  console.info(`[demo:build] ${path.relative(process.cwd(), final)} (${duration(final).toFixed(1)}s) + ${path.relative(process.cwd(), srt)}`)
}

main()
