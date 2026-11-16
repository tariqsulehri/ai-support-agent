/**
 * Records the full demo as a 1920x1080 video with a visible, smoothly moving cursor:
 *   Part 1  30-second website conversation (scripted AI, see browser/widget-mocks.js)
 *   Part 2  Platform admin: multi-tenant console, tenant detail, plans, onboarding, dashboard
 *   Part 3  Tenant owner dashboard: KPIs, transcripts, lead pipeline, insights, setup
 *
 *   npm run demo:record
 *
 * Output: demo/output/screen-1080p.mp4 (+ screen.webm) and timeline.json.
 * Logins come from .env.local (DEMO_ADMIN_* / DEMO_TENANT_*), never from the repo.
 * Re-run `npm run demo:seed` before every take: the recording edits a lead and creates a tenant.
 *
 * Env: DEMO_BASE_URL (default http://localhost:3000), DEMO_SCENES=a,b (record a subset),
 *      DEMO_MOCK_AI=false (use the real AI), DEMO_HEADLESS=false (watch it), DEMO_SCALE=1.25.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type FrameLocator, type Locator, type Page } from 'playwright'
import { RECORDED_SCENES, type SceneId } from './scenes'
import { HERO, HERO_RECORD_ID, HERO_SUMMARY, HERO_TURNS, LIVE_TENANT, PLATFORM_ADMIN, TENANT_OWNER } from './fixtures/demo-data'

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const MOCK_AI = process.env.DEMO_MOCK_AI !== 'false'
const HEADLESS = process.env.DEMO_HEADLESS !== 'false'
const ONLY = process.env.DEMO_SCENES?.split(',').map((s) => s.trim()).filter(Boolean) as SceneId[] | undefined
// Laid out at 1920/SCALE x 1080/SCALE (default 1536x864), recorded at that size, then
// upscaled to 1920x1080 so UI text is ~25% larger on phones. DEMO_SCALE=1 records natively.
const VIDEO = { width: 1920, height: 1080 }
const SCALE = Number(process.env.DEMO_SCALE || 1.25)
const WIDTH = Math.round(VIDEO.width / SCALE)
const HEIGHT = Math.round(VIDEO.height / SCALE)
const ROOT = path.resolve(__dirname)
const OUT = path.join(ROOT, 'output')
const RAW_DIR = path.join(OUT, 'raw')
const SITE_PATH = '/__demo/site'
const EMBED_TOKEN = `${HERO.tenantId}-demo-token`

const widgetSrc =
  `/voice?tenant=${encodeURIComponent(HERO.tenantId)}&token=${encodeURIComponent(EMBED_TOKEN)}` +
  `&mode=inline&margin=none&primaryColor=${encodeURIComponent(HERO.primaryColor)}`

function narrationSeconds(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, 'audio', 'durations.json'), 'utf8'))
  } catch {
    return {}
  }
}

// ── Timing ────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const beat = (ms = 600) => sleep(ms * (0.85 + Math.random() * 0.3))

// ── Smooth mouse ──────────────────────────────────────────────────────────────
let mouse = { x: WIDTH / 2, y: HEIGHT / 2 }
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

async function glide(page: Page, x: number, y: number, ms?: number): Promise<void> {
  const from = { ...mouse }
  const dist = Math.hypot(x - from.x, y - from.y)
  const duration = ms ?? Math.min(1000, Math.max(320, dist * 0.85))
  const steps = Math.max(12, Math.round(duration / 16))
  const bend = (Math.random() - 0.5) * Math.min(110, dist * 0.15)
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps)
    const arc = Math.sin(Math.PI * t) * bend
    await page.mouse.move(
      from.x + (x - from.x) * t + arc * ((from.y - y) / (dist || 1)),
      from.y + (y - from.y) * t + arc * ((x - from.x) / (dist || 1))
    )
    await sleep(duration / steps / 2)
  }
  mouse = { x, y }
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.waitFor({ state: 'visible', timeout: 20_000 })
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  const box = await locator.boundingBox()
  if (!box) throw new Error(`No bounding box for ${locator}`)
  return {
    x: box.x + box.width / 2 + (Math.random() - 0.5) * Math.min(10, box.width / 4),
    y: box.y + box.height / 2 + (Math.random() - 0.5) * Math.min(6, box.height / 4),
  }
}

async function hover(page: Page, locator: Locator, pauseMs = 650): Promise<void> {
  const { x, y } = await centerOf(locator)
  await glide(page, x, y)
  await beat(pauseMs)
}

async function click(page: Page, locator: Locator): Promise<void> {
  await hover(page, locator, 250)
  await page.mouse.down()
  await sleep(80)
  await page.mouse.up()
  await beat(400)
}

async function typeInto(page: Page, locator: Locator, text: string, delay = 32): Promise<void> {
  await click(page, locator)
  await locator.fill('')
  await locator.pressSequentially(text, { delay })
  await beat(350)
}

/** Navigate, then re-show the cursor where it was. */
async function go(page: Page, url: string): Promise<void> {
  await page.goto(url.startsWith('http') ? url : `${BASE_URL}${url}`, { waitUntil: 'networkidle' })
  await page.mouse.move(mouse.x, mouse.y)
}

/** Click a link/button that navigates, and wait for the new page to settle. */
async function clickAndSettle(page: Page, locator: Locator): Promise<void> {
  await click(page, locator)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.mouse.move(mouse.x, mouse.y)
}

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
  await beat(350)
}

async function scrollIntoView(locator: Locator, block: 'start' | 'center' | 'end' = 'center'): Promise<void> {
  await locator.waitFor({ state: 'attached', timeout: 20_000 })
  await locator.evaluate(`(el) => el.scrollIntoView({ behavior: 'smooth', block: '${block}' })`)
  await sleep(1000)
}

/** Hover the first visible match of each label (skips ones that are not on the page). */
async function hoverLabels(page: Page, labels: string[], pauseMs = 750): Promise<void> {
  for (const label of labels) {
    const el = page.getByText(label, { exact: true }).first()
    if (await el.isVisible().catch(() => false)) await hover(page, el, pauseMs)
  }
}

async function login(page: Page, loginPath: string, email: string, password: string, expect: RegExp): Promise<void> {
  await go(page, loginPath)
  await beat(600)
  await typeInto(page, page.locator('input[name="email"]'), email, 28)
  await typeInto(page, page.locator('input[name="password"]'), password, 28)
  await click(page, page.locator('button[type="submit"]'))
  await page.waitForURL(expect, { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
  await page.mouse.move(mouse.x, mouse.y)
}

// ── On-screen safety ──────────────────────────────────────────────────────────
const SECRET_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/, // full OpenAI-style keys (masked "sk-d...1234" is fine)
  /mongodb(?:\+srv)?:\/\/[^\s"']+@/, // connection strings with credentials
  /vack_live_[A-Za-z0-9]{8,}/, // full client API keys
  /\bemb\.[A-Za-z0-9_-]{20,}/, // signed embed tokens
]
async function assertNoSecretsOnScreen(page: Page, label: string): Promise<void> {
  const texts = await Promise.all(page.frames().map((f) => f.evaluate<string>("document.body ? document.body.innerText : ''").catch(() => '')))
  const hits = SECRET_PATTERNS.filter((re) => texts.some((t) => re.test(t)))
  if (hits.length) throw new Error(`[demo:record] Possible secret visible during "${label}" (${hits.map(String).join(', ')}). Aborting take.`)
}
/** Blur code blocks (embed snippets, tokens) on admin pages, as a second line of defence. */
const BLUR_CODE = 'pre, code { filter: blur(5px) !important; }'

// ── Scenes ────────────────────────────────────────────────────────────────────
type Ctx = { page: Page; widget: FrameLocator }
const adminTab = (page: Page, name: string) => page.locator('nav[aria-label="Tenant admin sections"]').getByRole('link', { name: new RegExp(`^${name}`) })

const sceneActions: Record<SceneId, (ctx: Ctx) => Promise<void>> = {
  // Part 1: website conversation (≈30 s)
  async 'chat-open'({ page, widget }) {
    await go(page, SITE_PATH)
    await beat(900)
    await hover(page, page.locator('h1'), 700)
    await click(page, page.locator('#launcher'))
    await widget.getByText(HERO.greeting.slice(0, 28)).first().waitFor({ timeout: 20_000 })
    // Recording-only cosmetic: /voice paints an opaque background when framed; make it transparent.
    await page.frame({ url: /\/voice/ })?.addStyleTag({ content: 'html,body,main{background:transparent!important}' })
    await beat(500)
  },
  async 'chat-ask'({ page, widget }) {
    await typeInto(page, widget.getByLabel('Message', { exact: true }), HERO_TURNS[0].user, 22)
    await click(page, widget.getByRole('button', { name: 'Send message' }))
    await widget.getByText('to lock that in?').first().waitFor({ timeout: 30_000 })
    await beat(600)
  },
  async 'chat-booked'({ page, widget }) {
    await typeInto(page, widget.getByLabel('Message', { exact: true }), HERO_TURNS[1].user, 20)
    await click(page, widget.getByRole('button', { name: 'Send message' }))
    const details = widget.getByText('Contact Details', { exact: true })
    await details.waitFor({ timeout: 30_000 })
    await scrollIntoView(details, 'start')
    await hover(page, widget.getByText(HERO_TURNS[1].lead.phone, { exact: true }), 900)
    const summary = widget.getByText(HERO_SUMMARY.summary.slice(0, 36)).first()
    await summary.waitFor({ timeout: 30_000 })
    await scrollIntoView(widget.getByText('Conversation Summary', { exact: true }), 'start')
    await hover(page, summary, 900)
  },

  // Part 2: platform admin
  async 'admin-login'({ page }) {
    await login(page, '/admin/login', PLATFORM_ADMIN.email, PLATFORM_ADMIN.password, /\/admin\/tenants/)
    await page.addStyleTag({ content: BLUR_CODE })
    await assertNoSecretsOnScreen(page, 'admin-login')
  },
  async 'admin-overview'({ page }) {
    await hoverLabels(page, ['Active', 'Disabled', 'Archived', 'OpenAI ready'], 700)
    await scrollIntoView(page.getByText('Tenant Status', { exact: true }).first(), 'center')
    await hoverLabels(page, ['Tenant Status', 'Platform Usage'], 1200)
  },
  async 'admin-tenants'({ page }) {
    await scrollPage(page, 0, 700)
    await clickAndSettle(page, adminTab(page, 'Tenants'))
    await assertNoSecretsOnScreen(page, 'admin-tenants')
    await beat(900)
    const search = page.locator('#tenant-search')
    await typeInto(page, search, 'plumb', 90)
    await beat(1300)
    await search.fill('')
    await beat(500)
    const filters = page.locator('[aria-label="Filter by status"]')
    await click(page, filters.getByRole('button', { name: /^Disabled/ }))
    await beat(1300)
    await click(page, filters.getByRole('button', { name: /^All/ }))
    await hover(page, page.getByText(HERO.companyName).first(), 900)
  },
  async 'admin-tenant-detail'({ page }) {
    await clickAndSettle(page, page.locator(`a[href="/admin/tenants/${HERO.tenantId}"]`).first())
    await page.addStyleTag({ content: BLUR_CODE })
    await assertNoSecretsOnScreen(page, 'admin-tenant-detail')
    await beat(1500)
    for (const tab of [/Embed/, /Agent Persona/, /Team Access/]) {
      await click(page, page.getByRole('tab', { name: tab }))
      await assertNoSecretsOnScreen(page, `admin-tenant-detail ${tab}`)
      await beat(1300)
      await scrollPage(page, 380, 1000)
      await beat(700)
      await scrollPage(page, 0, 700)
    }
  },
  async 'admin-subscriptions'({ page }) {
    await go(page, '/admin/tenants?tab=subscriptions')
    await page.addStyleTag({ content: BLUR_CODE })
    await beat(800)
    await hover(page, adminTab(page, 'Subscriptions'), 400)
    await scrollPage(page, 420, 1500)
    await beat(1500)
  },
  async 'admin-create'({ page }) {
    await scrollPage(page, 0, 600)
    await clickAndSettle(page, adminTab(page, 'Create Tenant'))
    const form = page.locator('form').filter({ has: page.locator('input[name="companyName"]') })
    await typeInto(page, form.locator('input[name="tenantId"]'), LIVE_TENANT.tenantId, 26)
    await typeInto(page, form.locator('input[name="companyName"]'), LIVE_TENANT.companyName, 30)
    await typeInto(page, form.locator('input[name="agentName"]'), LIVE_TENANT.agentName, 40)
    await typeInto(page, form.locator('textarea[name="services"]'), LIVE_TENANT.services, 14)
    await typeInto(page, form.locator('textarea[name="domains"]'), LIVE_TENANT.domain, 14)
    await click(page, page.getByRole('button', { name: 'Create Tenant' }).last())
    await page.waitForURL(new RegExp(`/admin/tenants/${LIVE_TENANT.tenantId}`), { timeout: 30_000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
    await page.addStyleTag({ content: BLUR_CODE })
    await page.mouse.move(mouse.x, mouse.y)
    await assertNoSecretsOnScreen(page, 'admin-create')
    await beat(1500)
  },
  async 'admin-dashboard'({ page }) {
    await go(page, '/dashboard?range=all')
    await assertNoSecretsOnScreen(page, 'admin-dashboard')
    await beat(900)
    await hoverLabels(page, ['Conversations', 'Lead capture', 'Hot leads'], 700)
    await clickAndSettle(page, page.getByRole('link', { name: 'Tenants' }).first())
    await beat(1000)
    await scrollPage(page, 420, 1400)
    await beat(1000)
  },

  // Part 3: tenant dashboard
  async 'tenant-login'({ page }) {
    await scrollPage(page, 0, 500)
    const signOut = page.getByRole('button', { name: 'Sign out' }).first()
    if (await signOut.isVisible().catch(() => false)) {
      await click(page, signOut)
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    await page.context().clearCookies()
    await login(page, `/tenant/login?next=${encodeURIComponent('/dashboard?range=all')}`, TENANT_OWNER.email, TENANT_OWNER.password, /\/dashboard/)
    await assertNoSecretsOnScreen(page, 'tenant-login')
  },
  async 'tenant-overview'({ page }) {
    await beat(800)
    await hoverLabels(page, ['Conversations', 'Lead capture', 'Hot leads', 'Pipeline'], 700)
    await scrollPage(page, 620, 1700)
    await beat(1500)
    await scrollPage(page, 1250, 1500)
    await beat(1200)
    await scrollPage(page, 0, 1000)
  },
  async 'tenant-transcripts'({ page }) {
    await clickAndSettle(page, page.getByRole('link', { name: 'Call transcripts' }).first())
    await beat(800)
    const search = page.locator('#global-search')
    if (await search.isVisible().catch(() => false)) {
      await typeInto(page, search, 'water heater', 60)
      await page.keyboard.press('Enter')
      await page.waitForLoadState('networkidle')
      await page.mouse.move(mouse.x, mouse.y)
    }
    await beat(1200)
    await scrollPage(page, 450, 1500)
    await beat(1500)
    await scrollPage(page, 0, 800)
  },
  async 'tenant-pipeline'({ page }) {
    await clickAndSettle(page, page.getByRole('link', { name: 'Lead pipeline' }).first())
    await go(page, `/dashboard?tab=leads&range=all&selectedId=${HERO_RECORD_ID}`)
    await assertNoSecretsOnScreen(page, 'tenant-pipeline')
    const status = page.locator(`#status-${HERO_RECORD_ID}`)
    await scrollIntoView(status, 'center')
    await hover(page, page.getByText('Mike Johnson').first(), 800)
    await hover(page, status, 500)
    await status.selectOption('qualified') // native <select> popups are not captured in video
    await beat(1000)
    const owner = page.locator('input[name="owner"]').first()
    if (await owner.isVisible().catch(() => false)) {
      await typeInto(page, owner, 'Jake (Dispatch)', 40)
      const notes = page.locator('textarea[name="notes"]').first()
      if (await notes.isVisible().catch(() => false)) await typeInto(page, notes, 'Tech Carlos assigned, 2-4 PM. Offer Comfort Club.', 24)
      await click(page, page.getByRole('button', { name: 'Save lead plan' }).first())
      await beat(1000)
    }
  },
  async 'tenant-insights'({ page }) {
    await scrollPage(page, 0, 700)
    await clickAndSettle(page, page.getByRole('link', { name: 'AI insights' }).first())
    await beat(900)
    await hoverLabels(page, ['Recommendations', 'Risk signals'], 900)
    await scrollPage(page, 550, 1500)
    await beat(900)
    await scrollPage(page, 0, 700)
    const exportBtn = page.getByRole('link', { name: /Export/ }).first()
    if (await exportBtn.isVisible().catch(() => false)) await hover(page, exportBtn, 1000)
  },
  async 'tenant-setup'({ page }) {
    await go(page, `/admin/tenants/${HERO.tenantId}?tab=agent`)
    await page.addStyleTag({ content: BLUR_CODE })
    await assertNoSecretsOnScreen(page, 'tenant-setup')
    await beat(1200)
    await scrollPage(page, 450, 1700)
    await beat(1200)
    await scrollPage(page, 900, 1600)
    await beat(900)
  },

  async cta() {},
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  fs.mkdirSync(RAW_DIR, { recursive: true })
  const narration = narrationSeconds()
  const cursorJs = fs.readFileSync(path.join(ROOT, 'browser', 'cursor.js'), 'utf8')
  const mocksJs = fs.readFileSync(path.join(ROOT, 'browser', 'widget-mocks.js'), 'utf8')
  const siteHtml = fs.readFileSync(path.join(ROOT, 'site', 'summit.html'), 'utf8').replaceAll('__WIDGET_SRC__', widgetSrc)

  let browser: Browser | null = null
  let context: BrowserContext | null = null
  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--hide-scrollbars'],
    })
    context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
      recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
      permissions: ['microphone'],
      colorScheme: 'light',
      locale: 'en-US',
      timezoneId: process.env.DEMO_TIMEZONE || 'America/Chicago',
      acceptDownloads: true,
    })
    await context.addInitScript({ content: cursorJs })
    if (MOCK_AI) {
      const mockData = {
        config: {
          tenantId: HERO.tenantId, language: 'English', ttsProvider: 'openai', voice: 'nova', voiceGender: 'female',
          agentName: HERO.agentName, companyName: HERO.companyName, greeting: HERO.greeting,
        },
        turns: HERO_TURNS,
        voiceTranscript: HERO_TURNS[0].user,
        summary: {
          summary: HERO_SUMMARY.summary,
          keyPoints: HERO_SUMMARY.keyPoints,
          email: { sent: true, recipients: [`dispatch@${HERO.tenantId}.test`] },
          database: { saved: true },
        },
        holdText: 'Stay cool',
        holdSeconds: 20,
        thinkMs: 600,
        summaryDelayMs: 1200,
      }
      await context.addInitScript({ content: `window.__DEMO_MOCK_DATA__ = ${JSON.stringify(mockData)};\n${mocksJs}` })
    }
    await context.route(`${BASE_URL}${SITE_PATH}`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: siteHtml }))

    const page = await context.newPage()
    const videoStart = Date.now()
    const widget = page.frameLocator('#voice-agent-container iframe')
    const timeline: Array<{ id: SceneId; start: number; end: number }> = []

    for (const scene of RECORDED_SCENES.filter((s) => !ONLY || ONLY.includes(s.id))) {
      const start = (Date.now() - videoStart) / 1000
      const target = Math.max(scene.minSeconds, (narration[scene.id] ?? 0) + 0.6)
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
      else if (elapsed > target + 1) console.warn(`[demo:record]   ${scene.id} ran ${elapsed.toFixed(1)}s (target ${target.toFixed(1)}s)`)
      timeline.push({ id: scene.id, start, end: (Date.now() - videoStart) / 1000 })
    }
    await beat(700)

    const video = page.video()
    await context.close()
    context = null
    const raw = await video?.path()
    if (!raw) throw new Error('No video was recorded.')
    fs.copyFileSync(raw, path.join(OUT, 'screen.webm'))
    fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(timeline, null, 2))
    const mp4 = path.join(OUT, 'screen-1080p.mp4')
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(OUT, 'screen.webm'),
        '-vf', `scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos,fps=30,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', mp4])
      console.info(`[demo:record] saved ${path.relative(process.cwd(), mp4)} (1920x1080) + timeline.json`)
    } catch {
      console.warn('[demo:record] ffmpeg not found: kept screen.webm only.')
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
