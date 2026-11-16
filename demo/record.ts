/**
 * Records the product demo as a 1920x1080 screen video with a visible, smoothly
 * moving cursor and natural pauses. Scenes and timing come from demo/scenes.ts.
 *
 *   npm run demo:record
 *
 * Output (demo/output/):
 *   screen.webm     the raw screen recording (no audio)
 *   timeline.json   when each scene starts/ends in the video, used by build-video.sh
 *
 * By default the assistant's AI calls are replaced by a scripted conversation
 * (demo/browser/widget-mocks.js): repeatable, free, and no API keys needed.
 * Set DEMO_MOCK_AI=false to record the real AI instead (needs a working OpenAI key).
 *
 * Re-run `npm run demo:seed` before every take: the pipeline scene edits the hero lead.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type Locator, type Page, type FrameLocator } from 'playwright'
import { RECORDED_SCENES, type SceneId } from './scenes'
import { DEMO_OWNER, DEMO_TENANT, HERO_RECORD_ID, HERO_SUMMARY, HERO_TURNS } from './fixtures/demo-tenant'

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const MOCK_AI = process.env.DEMO_MOCK_AI !== 'false'
const HEADLESS = process.env.DEMO_HEADLESS !== 'false'
const ONLY = process.env.DEMO_SCENES?.split(',').map((s) => s.trim()).filter(Boolean) as SceneId[] | undefined
// Output is always 1920x1080. The page is laid out at 1920/SCALE x 1080/SCALE CSS pixels
// (default 1536x864), recorded at that size, then upscaled with ffmpeg (lanczos). The
// result: UI text ~25% larger, which matters when the video is watched on a phone.
// Playwright's recorder ignores deviceScaleFactor, hence the upscale. DEMO_SCALE=1 records natively.
const VIDEO = { width: 1920, height: 1080 }
const SCALE = Number(process.env.DEMO_SCALE || 1.25)
const WIDTH = Math.round(VIDEO.width / SCALE)
const HEIGHT = Math.round(VIDEO.height / SCALE)
const ROOT = path.resolve(__dirname)
const OUT = path.join(ROOT, 'output')
const RAW_DIR = path.join(OUT, 'raw')
const SITE_PATH = '/__demo/harborline'
const EMBED_TOKEN = process.env.DEMO_EMBED_TOKEN || 'harborline-demo-token'

const widgetSrc =
  `/voice?tenant=${encodeURIComponent(DEMO_TENANT.tenantId)}&token=${encodeURIComponent(EMBED_TOKEN)}` +
  `&mode=inline&margin=none&primaryColor=${encodeURIComponent(DEMO_TENANT.primaryColor)}`

/** Narration length per scene (written by voiceover.ts), so scenes hold long enough. */
function narrationSeconds(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, 'audio', 'durations.json'), 'utf8'))
  } catch {
    return {}
  }
}

// ── Timing helpers ────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Human-ish pause with a little jitter. */
const beat = (ms = 600) => sleep(ms * (0.85 + Math.random() * 0.3))

// ── Smooth mouse ──────────────────────────────────────────────────────────────
let mouse = { x: WIDTH / 2, y: HEIGHT / 2 }
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

async function glide(page: Page, x: number, y: number, ms?: number): Promise<void> {
  const from = { ...mouse }
  const dist = Math.hypot(x - from.x, y - from.y)
  const duration = ms ?? Math.min(1100, Math.max(350, dist * 0.9))
  const steps = Math.max(12, Math.round(duration / 16))
  // Slight arc so the path does not look robotic.
  const bend = (Math.random() - 0.5) * Math.min(120, dist * 0.15)
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps)
    const arc = Math.sin(Math.PI * t) * bend
    const px = from.x + (x - from.x) * t + arc * ((from.y - y) / (dist || 1))
    const py = from.y + (y - from.y) * t + arc * ((x - from.x) / (dist || 1))
    await page.mouse.move(px, py)
    await sleep(duration / steps / 2)
  }
  mouse = { x, y }
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.waitFor({ state: 'visible', timeout: 20_000 })
  const box = await locator.boundingBox()
  if (!box) throw new Error(`No bounding box for ${locator}`)
  return {
    x: box.x + box.width / 2 + (Math.random() - 0.5) * Math.min(10, box.width / 4),
    y: box.y + box.height / 2 + (Math.random() - 0.5) * Math.min(6, box.height / 4),
  }
}

async function hover(page: Page, locator: Locator, pauseMs = 700): Promise<void> {
  const { x, y } = await centerOf(locator)
  await glide(page, x, y)
  await beat(pauseMs)
}

async function click(page: Page, locator: Locator): Promise<void> {
  await hover(page, locator, 280)
  await page.mouse.down()
  await sleep(90)
  await page.mouse.up()
  await beat(450)
}

async function typeInto(page: Page, locator: Locator, text: string, delay = 38): Promise<void> {
  await click(page, locator)
  await locator.pressSequentially(text, { delay })
  await beat(500)
}

/** Smooth window scroll on the top-level page. */
async function scrollPage(page: Page, toY: number, ms = 1400): Promise<void> {
  // Passed as a string: tsx's name helpers do not exist inside the browser.
  await page.evaluate(`new Promise((done) => {
    const start = window.scrollY, t0 = performance.now(), toY = ${toY}, ms = ${ms}
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      window.scrollTo(0, start + (toY - start) * e)
      if (t < 1) requestAnimationFrame(step); else done()
    }
    requestAnimationFrame(step)
  })`)
  await beat(400)
}

/** Smoothly bring an element into view inside whatever scroll container holds it. */
async function scrollIntoView(locator: Locator, block: 'start' | 'center' | 'end' = 'center'): Promise<void> {
  await locator.waitFor({ state: 'attached', timeout: 20_000 })
  await locator.evaluate(`(el) => el.scrollIntoView({ behavior: 'smooth', block: '${block}' })`)
  await sleep(1100)
}

// ── On-screen safety: never record secrets ─────────────────────────────────────
const SECRET_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/, // OpenAI keys (masked "sk-p...abcd" values are fine)
  /mongodb(?:\+srv)?:\/\/[^\s"']+@/, // connection strings with credentials
  /vack_live_[A-Za-z0-9]{8,}/, // client API keys
  /\bemb\.[A-Za-z0-9_-]{20,}/, // signed embed tokens
]

async function assertNoSecretsOnScreen(page: Page, label: string): Promise<void> {
  const texts = await Promise.all(page.frames().map((f) => f.evaluate<string>("document.body ? document.body.innerText : ''").catch(() => '')))
  const hits = SECRET_PATTERNS.filter((re) => texts.some((t) => re.test(t)))
  if (hits.length) {
    throw new Error(`[demo:record] Possible secret visible during "${label}" (${hits.map(String).join(', ')}). Aborting take.`)
  }
}

// ── Scenes ────────────────────────────────────────────────────────────────────
type Ctx = { page: Page; widget: FrameLocator }

const sceneActions: Record<SceneId, (ctx: Ctx) => Promise<void>> = {
  async hook({ page }) {
    await page.goto(`${BASE_URL}${SITE_PATH}`, { waitUntil: 'networkidle' })
    await page.mouse.move(mouse.x, mouse.y)
    await beat(1500)
    await hover(page, page.locator('.closed'), 1600)
    await hover(page, page.locator('.missed'), 1800)
    await scrollPage(page, 420, 1800)
    await beat(1200)
    await scrollPage(page, 0, 1400)
  },

  async solution({ page, widget }) {
    await hover(page, page.locator('#launcher'), 900)
    await click(page, page.locator('#launcher'))
    await widget.getByText(DEMO_TENANT.greeting.slice(0, 30)).first().waitFor({ timeout: 20_000 })
    // Recording-only cosmetic: the /voice embed paints an opaque page background, which
    // shows as an empty block above the chat card. Make it transparent on the demo site.
    const frame = page.frame({ url: /\/voice/ })
    await frame?.addStyleTag({ content: 'html,body,main{background:transparent!important}' })
    await beat(1500)
  },

  async answers({ page, widget }) {
    const input = widget.getByLabel('Message', { exact: true })
    await typeInto(page, input, HERO_TURNS[0].user, 34)
    await click(page, widget.getByRole('button', { name: 'Send message' }))
    await widget.getByText('request it for you?').first().waitFor({ timeout: 30_000 })
    await beat(1200)
  },

  async 'lead-capture'({ page, widget }) {
    const input = widget.getByLabel('Message', { exact: true })
    await typeInto(page, input, HERO_TURNS[1].user, 42)
    await click(page, widget.getByRole('button', { name: 'Send message' }))
    const details = widget.getByText('Contact Details', { exact: true })
    await details.waitFor({ timeout: 30_000 })
    await widget.getByText('help with?').first().waitFor({ timeout: 30_000 })
    await scrollIntoView(details, 'start')
    await hover(page, widget.getByText(HERO_TURNS[1].lead!.email, { exact: true }), 1400)
  },

  async 'voice-language'({ page, widget }) {
    const mic = widget.locator('button[title="Tap to talk, or hold to speak"]')
    await hover(page, mic, 700)
    // Hold to talk (Chromium's fake microphone supplies the audio; the transcript is mocked).
    await page.mouse.down()
    await sleep(2600)
    await page.mouse.up()
    await widget.getByText(HERO_TURNS[2].user.slice(0, 20)).first().waitFor({ timeout: 30_000 })
    await widget.getByText('le pueda ayudar?').first().waitFor({ timeout: 30_000 })
    await beat(1500)
  },

  async summary({ page, widget }) {
    const input = widget.getByLabel('Message', { exact: true })
    await typeInto(page, input, HERO_TURNS[3].user, 40)
    await click(page, widget.getByRole('button', { name: 'Send message' }))
    const summary = widget.getByText(HERO_SUMMARY.summary.slice(0, 40)).first()
    await summary.waitFor({ timeout: 40_000 })
    await scrollIntoView(widget.getByText('Conversation Summary', { exact: true }), 'start')
    await hover(page, summary, 1800)
  },

  async dashboard({ page }) {
    await page.goto(`${BASE_URL}/tenant/login?next=${encodeURIComponent('/dashboard?range=all')}`, { waitUntil: 'networkidle' })
    await page.mouse.move(mouse.x, mouse.y)
    await beat(700)
    await typeInto(page, page.locator('input[name="email"]'), DEMO_OWNER.email, 30)
    await typeInto(page, page.locator('input[name="password"]'), DEMO_OWNER.password, 30)
    await click(page, page.locator('button[type="submit"]'))
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    await assertNoSecretsOnScreen(page, 'dashboard')
    await beat(1200)
    for (const label of ['Conversations', 'Lead capture', 'Hot leads']) {
      await hover(page, page.getByText(label, { exact: true }).first(), 900)
    }
    await scrollPage(page, 620, 1800)
    await beat(1800)
    await scrollPage(page, 1250, 1600)
    await beat(1500)
    await scrollPage(page, 0, 1200)
  },

  async pipeline({ page }) {
    await click(page, page.getByRole('link', { name: 'Lead pipeline' }).first())
    await page.goto(`${BASE_URL}/dashboard?tab=leads&range=all&selectedId=${HERO_RECORD_ID}`, { waitUntil: 'networkidle' })
    await page.mouse.move(mouse.x, mouse.y)
    await assertNoSecretsOnScreen(page, 'pipeline')
    const status = page.locator(`#status-${HERO_RECORD_ID}`)
    await scrollIntoView(status, 'center')
    await hover(page, page.getByText('Dana Whitfield').first(), 900)
    // Native <select> popups are not captured in recordings, so set the value directly.
    await hover(page, status, 600)
    await status.selectOption('qualified')
    await beat(1200)
    const owner = page.locator('input[name="owner"]').first()
    if (await owner.isVisible().catch(() => false)) {
      await typeInto(page, owner, 'Jake (Dispatch)', 45)
      const notes = page.locator('textarea[name="notes"]').first()
      if (await notes.isVisible().catch(() => false)) await typeInto(page, notes, 'Confirm 8-10 AM by text. Bring water heater quote.', 30)
      await click(page, page.getByRole('button', { name: 'Save lead plan' }).first())
      await beat(1200)
    }
  },

  async insights({ page }) {
    await scrollPage(page, 0, 800)
    await click(page, page.getByRole('link', { name: 'AI insights' }).first())
    await page.waitForLoadState('networkidle')
    await page.mouse.move(mouse.x, mouse.y)
    await assertNoSecretsOnScreen(page, 'insights')
    await beat(1500)
    await hover(page, page.getByText('Recommendations', { exact: true }).first(), 1200)
    await scrollPage(page, 600, 1800)
    await beat(2000)
  },

  async customize({ page }) {
    await page.goto(`${BASE_URL}/admin/tenants/${DEMO_TENANT.tenantId}?tab=agent`, { waitUntil: 'networkidle' })
    await page.mouse.move(mouse.x, mouse.y)
    // Defence in depth: blur code blocks (embed snippets/tokens) if any render on this page.
    await page.addStyleTag({ content: 'pre, code { filter: blur(6px) !important; }' })
    await assertNoSecretsOnScreen(page, 'customize')
    await beat(1500)
    await scrollPage(page, 500, 2000)
    await beat(1800)
    await scrollPage(page, 1000, 2000)
    await beat(1500)
  },

  // Rendered as cards by Remotion / build-video.sh, not recorded.
  async results() {},
  async cta() {},
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  fs.mkdirSync(RAW_DIR, { recursive: true })
  const narration = narrationSeconds()
  const cursorJs = fs.readFileSync(path.join(ROOT, 'browser', 'cursor.js'), 'utf8')
  const mocksJs = fs.readFileSync(path.join(ROOT, 'browser', 'widget-mocks.js'), 'utf8')
  const siteHtml = fs.readFileSync(path.join(ROOT, 'site', 'harborline.html'), 'utf8').replaceAll('__WIDGET_SRC__', widgetSrc)

  let browser: Browser | null = null
  let context: BrowserContext | null = null
  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--hide-scrollbars',
      ],
    })
    context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
      recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
      permissions: ['microphone'],
      colorScheme: 'light',
      locale: 'en-US',
      timezoneId: process.env.DEMO_TIMEZONE || 'America/New_York',
    })
    await context.addInitScript({ content: cursorJs })
    if (MOCK_AI) {
      const mockData = {
        config: {
          tenantId: DEMO_TENANT.tenantId,
          language: 'English',
          ttsProvider: 'openai',
          voice: 'nova',
          voiceGender: 'female',
          agentName: DEMO_TENANT.agentName,
          companyName: DEMO_TENANT.companyName,
          greeting: DEMO_TENANT.greeting,
        },
        turns: HERO_TURNS,
        voiceTranscript: HERO_TURNS[2].user,
        summary: {
          summary: HERO_SUMMARY.summary,
          keyPoints: HERO_SUMMARY.keyPoints,
          email: { sent: true, recipients: ['dispatch@harborline-demo.test'] },
          database: { saved: true },
        },
        holdText: 'Have a good night',
        holdSeconds: 30,
        thinkMs: 900,
        summaryDelayMs: 1800,
      }
      await context.addInitScript({ content: `window.__DEMO_MOCK_DATA__ = ${JSON.stringify(mockData)};\n${mocksJs}` })
    }
    // Serve the fictional business website from the app's own origin (allowed to frame /voice).
    await context.route(`${BASE_URL}${SITE_PATH}`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: siteHtml })
    )

    const page = await context.newPage()
    const videoStart = Date.now()
    const widget = page.frameLocator('#voice-agent-container iframe')
    const timeline: Array<{ id: SceneId; start: number; end: number }> = []

    const scenes = RECORDED_SCENES.filter((s) => !ONLY || ONLY.includes(s.id))
    for (const scene of scenes) {
      const start = (Date.now() - videoStart) / 1000
      const target = Math.max(scene.minSeconds, (narration[scene.id] ?? 0) + 0.8)
      console.info(`[demo:record] ▶ ${scene.id} (hold ≥ ${target.toFixed(1)}s)`)
      try {
        await sceneActions[scene.id]({ page, widget })
      } catch (err) {
        const shot = path.join(OUT, `failed-${scene.id}.png`)
        await page.screenshot({ path: shot }).catch(() => {})
        console.error(`[demo:record] scene "${scene.id}" failed; screenshot: ${path.relative(process.cwd(), shot)}`)
        throw err
      }
      const elapsed = (Date.now() - videoStart) / 1000 - start
      if (elapsed < target) await sleep((target - elapsed) * 1000)
      else if (elapsed > target + 1) console.warn(`[demo:record]   ${scene.id} ran ${elapsed.toFixed(1)}s (narration ${target.toFixed(1)}s)`)
      timeline.push({ id: scene.id, start, end: (Date.now() - videoStart) / 1000 })
    }
    await beat(800)

    const video = page.video()
    await context.close()
    context = null
    const raw = await video?.path()
    if (!raw) throw new Error('No video was recorded.')
    fs.copyFileSync(raw, path.join(OUT, 'screen.webm'))
    fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(timeline, null, 2))
    const mp4 = path.join(OUT, 'screen-1080p.mp4')
    try {
      execFileSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', path.join(OUT, 'screen.webm'),
        '-vf', `scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos,fps=30,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', mp4,
      ])
      console.info(`[demo:record] saved ${path.relative(process.cwd(), mp4)} (1920x1080) + timeline.json`)
    } catch {
      console.warn('[demo:record] ffmpeg not found: kept screen.webm only. Install ffmpeg for the 1080p MP4.')
    }
  } finally {
    await context?.close().catch(() => {})
    await browser?.close().catch(() => {})
  }
}

main().catch((err) => {
  console.error('[demo:record] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
