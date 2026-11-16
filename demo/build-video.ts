/**
 * Assembles the final video with ffmpeg:
 *   1. lays each scene's narration over the screen recording at the time that scene
 *      started (from timeline.json),
 *   2. appends the "results" and "cta" cards (Remotion renders if present in
 *      demo/remotion/out/<id>.mp4, otherwise simple ffmpeg title cards),
 *   3. optionally prepends demo/remotion/out/intro.mp4 and mixes background music,
 *   4. writes captions.srt (LinkedIn/YouTube autoplay muted, so captions matter).
 *
 *   npm run demo:build
 *
 * Inputs : demo/output/screen-1080p.mp4, timeline.json, audio/*.mp3, audio/durations.json
 * Output : demo/output/final-demo.mp4 (+ captions.srt, and final-demo-captioned.mp4 when
 *          DEMO_BURN_CAPTIONS=true)
 *
 * Options (env): DEMO_MUSIC=path/to/music.mp3, DEMO_MUSIC_VOLUME=0.10, DEMO_FONT=/path/to/Bold.ttf
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { BRAND, SCENES, type SceneId } from './scenes'

const ROOT = __dirname
const OUT = path.join(ROOT, 'output')
const AUDIO = path.join(OUT, 'audio')
const WORK = path.join(OUT, 'build')
const REMOTION_OUT = path.join(ROOT, 'remotion', 'out')
const V = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30']
const A = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']

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
  const candidates = [
    process.env.DEMO_FONT,
    '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/Library/Fonts/Arial Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
  ].filter(Boolean) as string[]
  const font = candidates.find((f) => fs.existsSync(f))
  if (!font) throw new Error('No bold font found. Set DEMO_FONT=/path/to/a/Bold.ttf')
  return font
}
/** drawtext needs ':' and '\' escaped in file paths. */
const esc = (p: string) => p.replace(/\\/g, '/').replace(/:/g, '\\:')

const narration = readJson<Record<string, number>>(path.join(AUDIO, 'durations.json'), {})
const audioFor = (id: SceneId) => {
  const f = path.join(AUDIO, `${id}.mp3`)
  return fs.existsSync(f) ? f : null
}

/** Screen recording + narration placed at each scene's start time. */
function narrateScreen(): string {
  const screen = path.join(OUT, 'screen-1080p.mp4')
  if (!fs.existsSync(screen)) throw new Error('Missing output/screen-1080p.mp4. Run `npm run demo:record` first.')
  const timeline = readJson<Array<{ id: SceneId; start: number }>>(path.join(OUT, 'timeline.json'), [])
  const out = path.join(WORK, '10-screen.mp4')
  const clips = timeline.map((t) => ({ ...t, file: audioFor(t.id) })).filter((t) => t.file)
  const total = duration(screen)

  if (!clips.length) {
    console.warn('[demo:build] no narration found: screen part will be silent (run `npm run demo:voiceover`).')
    ff(['-i', screen, '-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a', ...V, ...A, '-shortest', out])
    return out
  }
  const inputs = clips.flatMap((c) => ['-i', c.file!])
  const delays = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round((c.start + 0.4) * 1000)}:all=1[a${i}]`)
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:duration=longest,apad[vo]`
  ff(['-i', screen, ...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '0:v', '-map', '[vo]', '-t', String(total), ...V, ...A, out])
  return out
}

/** A full-screen card: Remotion render if available, otherwise an ffmpeg title card. */
function card(id: SceneId, index: number): string {
  const scene = SCENES.find((s) => s.id === id)!
  const out = path.join(WORK, `${20 + index}-${id}.mp4`)
  const voice = audioFor(id)
  const len = Math.max(scene.minSeconds, (narration[id] ?? 0) + 1.2)
  const remotion = path.join(REMOTION_OUT, `${id}.mp4`)
  const audioIn = voice ? ['-i', voice] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
  const audioFilter = voice ? '[1:a]aresample=48000,adelay=300:all=1,apad[a]' : '[1:a]anull[a]'

  if (fs.existsSync(remotion)) {
    ff(['-stream_loop', '-1', '-i', remotion, ...audioIn, '-filter_complex', `[0:v]scale=1920:1080,fps=30[v];${audioFilter}`,
      '-map', '[v]', '-map', '[a]', '-t', len.toFixed(2), ...V, ...A, out])
    return out
  }

  const font = esc(findFont())
  const lines =
    id === 'cta'
      ? [{ text: BRAND.cta, size: 84, y: 400, color: 'white' }, { text: BRAND.ctaSub, size: 36, y: 530, color: '0xC7D7FE' },
         { text: BRAND.ctaUrl, size: 54, y: 660, color: '0x7FE3D4' }]
      : [{ text: 'Never miss a website lead again', size: 76, y: 300, color: 'white' },
         { text: '24/7 answers for every visitor', size: 46, y: 470, color: '0xC7D7FE' },
         { text: 'Every lead captured with contact details', size: 46, y: 560, color: '0xC7D7FE' },
         { text: 'Instant summaries for your team', size: 46, y: 650, color: '0xC7D7FE' }]
  const draws = lines.map((l, i) => {
    const txt = path.join(WORK, `${id}-${i}.txt`)
    fs.writeFileSync(txt, l.text)
    const fadeIn = (0.3 + i * 0.35).toFixed(2)
    return `drawtext=fontfile='${font}':textfile='${esc(txt)}':fontsize=${l.size}:fontcolor=${l.color}:x=(w-text_w)/2:y=${l.y}:alpha='min(1,max(0,(t-${fadeIn})/0.5))'`
  })
  const bg = `color=c=0x0b2a45:s=1920x1080:r=30:d=${len.toFixed(2)}`
  ff(['-f', 'lavfi', '-i', bg, ...audioIn, '-filter_complex',
    `[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=0x194ad9@0.35:t=fill,drawbox=x=0:y=ih-14:w=iw:h=14:color=0x4CBAAB:t=fill,${draws.join(',')},fade=t=in:st=0:d=0.4[v];${audioFilter}`,
    '-map', '[v]', '-map', '[a]', '-t', len.toFixed(2), ...V, ...A, out])
  return out
}

/** Optional Remotion intro (demo/remotion/out/intro.mp4), normalised to the same format. */
function intro(): string | null {
  const src = path.join(REMOTION_OUT, 'intro.mp4')
  if (!fs.existsSync(src)) return null
  const out = path.join(WORK, '00-intro.mp4')
  ff(['-i', src, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', '[0:v]scale=1920:1080,fps=30[v]',
    '-map', '[v]', '-map', '1:a', '-shortest', ...V, ...A, out])
  return out
}

/** SRT captions from the narration text, chunked and timed proportionally per scene. */
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
    let t = seg.start + 0.4
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

function main(): void {
  fs.rmSync(WORK, { recursive: true, force: true })
  fs.mkdirSync(WORK, { recursive: true })

  const parts: string[] = []
  const introPart = intro()
  if (introPart) parts.push(introPart)
  const offset = introPart ? duration(introPart) : 0
  const screenPart = narrateScreen()
  parts.push(screenPart)
  const cards = SCENES.filter((s) => s.card).map((s, i) => ({ id: s.id, file: card(s.id, i) }))
  parts.push(...cards.map((c) => c.file))

  const list = path.join(WORK, 'parts.txt')
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'))
  const joined = path.join(WORK, '90-joined.mp4')
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined])

  const final = path.join(OUT, 'final-demo.mp4')
  const music = process.env.DEMO_MUSIC
  if (music && fs.existsSync(music)) {
    const vol = process.env.DEMO_MUSIC_VOLUME || '0.10'
    ff(['-i', joined, '-stream_loop', '-1', '-i', music, '-filter_complex',
      `[1:a]volume=${vol},afade=t=in:d=2[m];[0:a][m]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', ...A, '-movflags', '+faststart', final])
  } else {
    ff(['-i', joined, '-af', 'loudnorm=I=-16:TP=-1.5', '-c:v', 'copy', ...A, '-movflags', '+faststart', final])
  }

  // Captions: recorded scenes use their timeline start; cards follow the screen part.
  const timeline = readJson<Array<{ id: SceneId; start: number }>>(path.join(OUT, 'timeline.json'), [])
  let t = offset + duration(screenPart)
  const segments = [
    ...timeline.map((s) => ({ id: s.id, start: s.start + offset })),
    ...cards.map((c) => { const seg = { id: c.id, start: t }; t += duration(c.file); return seg }),
  ]
  const srt = writeCaptions(segments)
  if (process.env.DEMO_BURN_CAPTIONS === 'true') {
    ff(['-i', final, '-vf', `subtitles='${esc(srt)}':force_style='FontName=Inter,FontSize=20,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=4,Outline=0,MarginV=40'`,
      ...V, '-c:a', 'copy', path.join(OUT, 'final-demo-captioned.mp4')])
  }

  console.info(`[demo:build] ${path.relative(process.cwd(), final)} (${duration(final).toFixed(1)}s) + ${path.relative(process.cwd(), srt)}`)
}

main()
