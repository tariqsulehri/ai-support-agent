/**
 * Builds the ~70-second social cut in three formats from demo/social/script.ts:
 *   output/social/aiscripto-demo-9x16.mp4   TikTok, Instagram Reels/Stories, YouTube Shorts, Facebook Reels, Snapchat
 *   output/social/aiscripto-demo-4x5.mp4    Instagram, Facebook and LinkedIn feeds
 *   output/social/aiscripto-demo-16x9.mp4   YouTube, LinkedIn, Facebook, X, website
 * plus a cover image per format and captions.srt.
 *
 *   npm run demo:social
 *
 * Needs: output/screen-1080p.mp4 + timeline (from demo:record), output/social/audio (voiceover --social),
 * remotion/out/social/<card>-<format>.mp4 (Remotion renders), assets/music-energetic.mp3.
 * Env: DEMO_SOCIAL_MUSIC=path|none, DEMO_SOCIAL_MUSIC_VOLUME=0.55, DEMO_SOCIAL_FORMATS=9x16,4x5
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { FORMATS, SOCIAL_SCENES, segmentSeconds, type SocialFormat, type SocialScene } from './script'

const DEMO = path.resolve(__dirname, '..')
const OUT = path.join(DEMO, 'output', 'social')
const WORK = path.join(OUT, 'build')
const SCREEN = path.join(DEMO, 'output', 'screen-1080p.mp4')
const CARDS = path.join(DEMO, 'remotion', 'out', 'social')
const LOGO_BADGE = path.join(DEMO, 'assets', 'aiscripto-logo-on-blue.png')
const FONT_CANDIDATES = [process.env.DEMO_FONT, '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf']
const V = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30']
const A = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
const VOICE_DELAY = 0.15
/** Scenes whose captions are skipped in portrait formats (the chat text itself is on screen). */
const NO_PORTRAIT_CAPTIONS = new Set(['s-chat'])

const ff = (args: string[]) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const duration = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString())
const esc = (p: string) => p.replace(/\\/g, '/').replace(/:/g, '\\:')
const font = (() => {
  const f = FONT_CANDIDATES.find((x) => x && fs.existsSync(x))
  if (!f) throw new Error('No bold font found. Set DEMO_FONT=/path/to/Bold.ttf')
  return esc(f)
})()
const durations: Record<string, number> = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, 'audio', 'durations.json'), 'utf8'))
  } catch {
    throw new Error('Missing output/social/audio/durations.json. Run `npm run demo:voiceover -- --social` first.')
  }
})()

/** Split a headline into at most two balanced lines. */
function lines(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  let best = [text]
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const diff = Math.abs(a.length - b.length)
    if (diff < bestDiff) { best = [a, b]; bestDiff = diff }
  }
  return best
}

/** drawtext filters for a centred, boxed headline starting at y. */
function headlineFilters(scene: SocialScene, fmt: SocialFormat, y: number): string[] {
  if (!scene.headline) return []
  const size = fmt === '9x16' ? 76 : 60
  return lines(scene.headline, fmt === '9x16' ? 18 : 24).map((line, i) => {
    const file = path.join(WORK, `${scene.id}-${fmt}-h${i}.txt`)
    fs.writeFileSync(file, line)
    return `drawtext=fontfile='${font}':textfile='${esc(file)}':fontsize=${size}:fontcolor=white:box=1:boxcolor=0x1800AD@0.96:boxborderw=22:` +
      `x=(w-text_w)/2:y=${y + i * Math.round(size * 1.55)}:alpha='min(1,t/0.25)'`
  })
}

const chain = (base: string, extra: string[]) => (extra.length ? `${base},${extra.join(',')}` : base)

/** Video filter graph laying out a footage scene for a format. Input 0 = screen, input 2 = logo badge. */
function footageGraph(scene: SocialScene, fmt: SocialFormat, speed: number): string {
  const src = scene.source as { focus: 'chat' | 'app' }
  const head = `[0:v]setpts=(PTS-STARTPTS)/${speed.toFixed(4)},fps=30,split=2[fg0][bg0]`
  const { width: W, height: H } = FORMATS[fmt]
  const blurBg = `[bg0]scale=-2:${H},crop=${W}:${H},boxblur=28:2,eq=brightness=-0.18:saturation=1.2[bg]`
  const badge = (w: number) => `[2:v]scale=${w}:-1[logo]`

  if (fmt === '16x9') {
    return `${head};[bg0]nullsink;${badge(230)};[fg0][logo]overlay=W-w-36:30[v]`
  }
  if (src.focus === 'chat') {
    // The chat widget sits at x 1330-1910, y 190-1070 of the 1920x1080 recording.
    const crop = 'crop=580:880:1330:190'
    if (fmt === '9x16') {
      return `${head};${blurBg};[fg0]${crop},scale=940:-2[fg];[bg][fg]${chain('overlay=(W-w)/2:330', headlineFilters(scene, fmt, 70))}[v];[2:v]nullsink`
    }
    return `${head};${blurBg};[fg0]${crop},scale=-2:1130[fg];[bg][fg]${chain('overlay=(W-w)/2:190', headlineFilters(scene, fmt, 40))}[v];[2:v]nullsink`
  }
  // App screens: drop the sidebar, show the main panel large with headline and logo above.
  const [cx, cy, cw, ch] = scene.crop ?? [300, 0, 1620, 1080]
  const fg = `[fg0]crop=${cw}:${ch}:${cx}:${cy},scale=1080:-2[fg]`
  if (fmt === '9x16') {
    return `${head};${blurBg};${fg};${badge(280)};[bg][logo]overlay=(W-w)/2:110[b1];[b1][fg]${chain('overlay=0:600', headlineFilters(scene, fmt, 300))}[v]`
  }
  return `${head};${blurBg};${fg};${badge(220)};[bg][logo]overlay=(W-w)/2:36[b1];[b1][fg]${chain('overlay=0:350', headlineFilters(scene, fmt, 150))}[v]`
}

function clip(scene: SocialScene, fmt: SocialFormat, index: number): string {
  const len = segmentSeconds(scene, durations[scene.id])
  const out = path.join(WORK, `${fmt}-${String(index).padStart(2, '0')}-${scene.id}.mp4`)
  const voice = path.join(OUT, 'audio', `${scene.id}.mp3`)
  const audio = `[1:a]aresample=48000,adelay=${Math.round(VOICE_DELAY * 1000)}:all=1,apad[a]`
  const { width: W, height: H } = FORMATS[fmt]

  if ('card' in scene.source) {
    const card = path.join(CARDS, `${scene.source.card}-${fmt}.mp4`)
    if (!fs.existsSync(card)) throw new Error(`Missing ${card}. Render the social cards first (see demo/README.md).`)
    const pad = Math.max(0, len - duration(card))
    ff(['-i', card, '-i', voice, '-filter_complex', `[0:v]scale=${W}:${H},fps=30,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}[v];${audio}`,
      '-map', '[v]', '-map', '[a]', '-t', len.toFixed(3), ...V, ...A, out])
    return out
  }
  const { from, to } = scene.source
  const speed = (to - from) / len
  ff(['-ss', String(from), '-t', String(to - from), '-i', SCREEN, '-i', voice, '-i', LOGO_BADGE,
    '-filter_complex', `${footageGraph(scene, fmt, speed)};${audio}`, '-map', '[v]', '-map', '[a]', '-t', len.toFixed(3), ...V, ...A, out])
  return out
}

/** ASS subtitles: short, punchy caption chunks in a big bold style placed per format. */
function writeAss(fmt: SocialFormat, starts: Record<string, number>): string {
  const { width: W, height: H } = FORMATS[fmt]
  const style = {
    '9x16': { size: 64, align: 2, marginV: 470, marginL: 80, maxChars: 26 },
    '4x5': { size: 52, align: 2, marginV: 150, marginL: 70, maxChars: 30 },
    '16x9': { size: 54, align: 1, marginV: 60, marginL: 70, maxChars: 40 },
  }[fmt]
  const t = (s: number) => {
    const cs = Math.max(0, Math.round(s * 100))
    return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
  }
  const events: string[] = []
  for (const scene of SOCIAL_SCENES) {
    if ('card' in scene.source) continue // card text is already on screen
    if (fmt !== '16x9' && NO_PORTRAIT_CAPTIONS.has(scene.id)) continue
    const spoken = durations[scene.id]
    const words = scene.voiceover.split(/\s+/)
    const chunks: string[] = []
    for (const w of words) {
      const last = chunks[chunks.length - 1]
      if (last && (last + ' ' + w).length <= style.maxChars && !/[.!?]$/.test(last)) chunks[chunks.length - 1] = `${last} ${w}`
      else chunks.push(w)
    }
    const total = chunks.reduce((n, c) => n + c.length, 0)
    let at = starts[scene.id] + VOICE_DELAY
    for (const c of chunks) {
      const d = (c.length / total) * spoken
      events.push(`Dialogue: 0,${t(at)},${t(at + d - 0.03)},Cap,,0,0,0,,{\\fad(60,40)}${c.toUpperCase()}`)
      at += d
    }
  }
  const ass = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${W}`, `PlayResY: ${H}`, 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Cap,Inter,${style.size},&H00FFFFFF,&H00FFFFFF,&H00AD0018,&H64000000,1,0,0,0,100,100,0,0,3,14,0,${style.align},${style.marginL},${style.marginL},${style.marginV},1`,
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text', ...events, '',
  ].join('\n')
  const file = path.join(WORK, `captions-${fmt}.ass`)
  fs.writeFileSync(file, ass)
  return file
}

function build(fmt: SocialFormat): void {
  const parts: string[] = []
  const starts: Record<string, number> = {}
  let clock = 0
  SOCIAL_SCENES.forEach((scene, i) => {
    const file = clip(scene, fmt, i)
    starts[scene.id] = clock
    clock += duration(file)
    parts.push(file)
  })
  const list = path.join(WORK, `${fmt}-parts.txt`)
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'))
  const joined = path.join(WORK, `${fmt}-joined.mp4`)
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined])

  const musicEnv = process.env.DEMO_SOCIAL_MUSIC
  const music = musicEnv === 'none' ? null : musicEnv || path.join(DEMO, 'assets', 'music-energetic.mp3')
  const hasMusic = Boolean(music && fs.existsSync(music))
  const vol = process.env.DEMO_SOCIAL_MUSIC_VOLUME || '0.55'
  const ass = writeAss(fmt, starts)
  const video = `[0:v]subtitles='${esc(ass)}'[v]`
  // Voice normalised to -14 LUFS (social standard), energetic bed ducked underneath, limited.
  const audio = hasMusic
    ? `[0:a]loudnorm=I=-14:TP=-2,asplit=2[vo][key];[1:a]volume=${vol},afade=t=out:st=${(clock - 2).toFixed(2)}:d=2,aformat=channel_layouts=stereo[bed];` +
      `[bed][key]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=350[duck];[vo][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9[a]`
    : '[0:a]loudnorm=I=-14:TP=-1.5[a]'
  const final = path.join(OUT, `aiscripto-demo-${fmt}.mp4`)
  ff(['-i', joined, ...(hasMusic ? ['-stream_loop', '-1', '-i', music!] : []), '-filter_complex', `${video};${audio}`,
    '-map', '[v]', '-map', '[a]', '-t', clock.toFixed(2), ...V, ...A, '-movflags', '+faststart', final])
  // Cover image: the hook card at its strongest frame.
  ff(['-ss', '1.6', '-i', final, '-frames:v', '1', path.join(OUT, `cover-${fmt}.jpg`)])
  console.info(`[demo:social] ${path.relative(process.cwd(), final)} (${duration(final).toFixed(1)}s, ${FORMATS[fmt].width}x${FORMATS[fmt].height})`)
}

function main(): void {
  if (!fs.existsSync(SCREEN)) throw new Error('Missing output/screen-1080p.mp4. Run `npm run demo:record` first.')
  fs.rmSync(WORK, { recursive: true, force: true })
  fs.mkdirSync(WORK, { recursive: true })
  const formats = (process.env.DEMO_SOCIAL_FORMATS?.split(',') ?? Object.keys(FORMATS)) as SocialFormat[]
  for (const fmt of formats) build(fmt)
}

main()
