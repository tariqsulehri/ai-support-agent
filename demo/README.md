# Demo Video Kit: "AI Front Desk" for Local Service Businesses

Everything needed to produce a 3-minute, lead-generating demo video of this product,
aimed at **local service SMBs** (home services, clinics, salons, real estate offices).
The hero story uses a fictional plumbing & HVAC company, **Harborline Heating & Plumbing**.

```
demo/
  README.md              this guide (Steps 1-5)
  scenes.ts              the script: scenes, timing, captions, voiceover  ← edit words here
  fixtures/demo-tenant.ts fictional business, knowledge base, hero conversation
  seed/seed-demo.ts      fills a LOCAL MongoDB with realistic demo data
  site/harborline.html   fictional business website the assistant is embedded in
  browser/               injected into the recording: cursor overlay + scripted AI responses
  record.ts              Playwright recorder → output/screen-1080p.mp4 + timeline.json
  voiceover.ts           narration MP3s (OpenAI or ElevenLabs TTS)
  build-video.ts         ffmpeg: narration + cards + music → output/final-demo.mp4 + captions.srt
  remotion/              optional animated intro/benefit/CTA cards and lower-third captions
```

---

## Step 1: What the product is

**In one sentence:** an AI receptionist that lives on a business's website, answers every
visitor by text or voice 24/7, collects their contact details, and hands the team a
summary plus a simple dashboard to follow up.

| | |
|---|---|
| **Who it's for** | Small and mid-size service businesses whose website visitors call or message outside office hours, or faster than the team can answer: plumbers, HVAC, electricians, dental/medical front desks, real estate, salons, local agencies. Secondary: agencies that run it for many clients (multi-tenant). |
| **Problem it solves** | Missed calls and slow replies become lost jobs. Leads land in voicemail or a form nobody reads until morning, with no context. Owners can't see how many inquiries they get or which ones to call back first. |
| **How** | An embeddable assistant (one snippet) trained on the business's services, hours and policies. It answers, qualifies, captures name/phone/email/need, ends politely, emails a summary, and records everything in a dashboard with pipeline stages and follow-up reminders. |
| **Tech stack** | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind · MongoDB 7 (per-tenant isolation, optional dedicated tenant DB) · OpenAI (Whisper speech-to-text, GPT-4o-mini chat streamed over SSE, TTS) with optional ElevenLabs voices · `franc` language detection · Nodemailer SMTP · AES-256-GCM encrypted secrets · Docker/Vercel deploy. |

### Features ranked by business value to a local SMB client

| # | Feature | What the client gets | In video |
|---|---|---|---|
| 1 | **24/7 instant answers on the website** (`/voice` widget, floating launcher) | No inquiry goes unanswered, even at 9:47 PM | ✅ Solution, Answers |
| 2 | **Automatic lead capture** (name, phone, email, need; live Contact Details card) | Every conversation becomes a contactable lead, no forms | ✅ Lead capture |
| 3 | **Instant conversation summary + email to the team** | Morning starts with booked jobs, not voicemails | ✅ Summary |
| 4 | **Lead pipeline & follow-up** (status New→Won, owner, follow-up date, notes, overdue alerts) | Nothing slips; clear ownership | ✅ Pipeline |
| 5 | **Owner dashboard** (conversations, capture rate, hot leads, readiness score, monthly trend, service demand) | Know what's working at a glance | ✅ Dashboard |
| 6 | **AI insights** (recommendations, risk signals, priority call-back queue) | Call the right customer first | ✅ Insights |
| 7 | **Multi-language auto-switching** (Spanish, Hindi, Urdu, Arabic, 15+) | Serve customers in their language | ✅ Voice & language |
| 8 | **Voice conversations** (tap or hold to talk, spoken replies) | Feels like calling, without the phone queue | ✅ Voice & language |
| 9 | **Trained on your business** (greeting, tone, services, knowledge base, rules like "no prices over chat") | Sounds like your team, says only what you allow | ✅ Customize |
| 10 | **One-snippet install + auto brand colors** | Live in minutes; matches the site | Mentioned (Customize VO) |
| 11 | **Transcripts, search, filters, CSV export** | Review quality; import into CRM | Optional B-roll |
| 12 | **Team logins & roles** (owner/admin/viewer) | Staff see what they need | Not shown |
| 13 | **Privacy & isolation** (each business's data separated, encrypted keys, optional own database) | Trust; data stays yours | Talking point for calls |
| 14 | **Multi-tenant platform admin** (tenants, subscriptions, keys) | Agency/reseller model | Not shown (internal) |

### Main user flows

1. **Visitor:** opens "Chat with us" → describes problem (type or talk) → gets answers + next available slot → shares contact details → conversation ends → team gets summary email.
2. **Owner/manager:** signs in (`/tenant/login`) → Overview KPIs → opens a lead → sets status, owner, follow-up, notes → AI insights queue → exports CSV.
3. **Setup:** Agent settings (`/admin/tenants/<id>`: greeting, tone, services, knowledge base) → domains → embed snippet → SMTP email alerts → team users.

---

## Step 2: Video plan (≈3:10)

Hook → Solution → 8 feature scenes → Results → CTA. Narration is exactly what's in
`scenes.ts` (edit there; everything else follows). Captions are burned in or uploaded as
`captions.srt`, because most LinkedIn/Facebook viewers watch muted.

| # | Time | Scene | On screen | Click path / action | Voiceover |
|---|---|---|---|---|---|
| 1 | 0:00–0:15 | **Hook: the missed call** | Harborline site at night; "Office closed" bar; "Missed call · 9:47 PM" badge | Open site; hover "Office closed", then "Missed call"; slow scroll down and back | "It's nine forty-seven at night. A customer's water heater just burst. They visit your website, call, and get voicemail. So they call the next company on the list. That job is gone, and it happens more often than you think." |
| 2 | 0:15–0:28 | **Meet your AI front desk** | Launcher pulses → assistant opens with branded greeting | Click **Chat with us** | "Now imagine someone answered, every time. This is your AI front desk. It sits on your website and greets every visitor in seconds, day or night, like a friendly member of your team." |
| 3 | 0:28–0:46 | **Real answers** | Visitor types the leak problem; reply streams in with safety steps + "8 to 10 AM" | Click message box → type → **Send** | "Customers describe their problem in their own words. The assistant answers using your services, your hours and your policies, and it moves the conversation toward a booking instead of a dead end." |
| 4 | 0:46–1:02 | **Every lead captured** | Visitor shares name/phone/email/address; **Contact Details** card fills | Type details → **Send** → hover the email | "While it helps, it collects what your team needs: name, phone, email and exactly what the job is. No forms, and nobody slips away without leaving their details." |
| 5 | 1:02–1:17 | **Talk or type, any language** | Mic held → Spanish question → Spanish reply | Hold mic ~2.5 s, release | "Visitors can type or just talk. And if they switch to Spanish, or many other languages, the assistant switches with them." |
| 6 | 1:17–1:30 | **Instant summary** | "Thank you!" → **Conversation Summary** + key points | Type thanks → **Send** → scroll to summary | "When the chat ends, your team gets a short summary: who it was, what they need, and how urgent it is. Your morning starts with booked jobs, not voicemails." |
| 7 | 1:30–1:48 | **One dashboard** | Owner signs in; KPI cards; 6-month growth chart; service demand | `/tenant/login` → email/password → **Sign in** → hover Conversations / Lead capture / Hot leads → scroll | "Everything flows into one simple dashboard. See how many people reached out, how many became leads, and which ones are ready to book right now." |
| 8 | 1:48–2:06 | **Follow up, assign, close** | Tonight's lead (Dana) with transcript; status New→Qualified; owner + notes | Sidebar **Lead pipeline** → hero lead → status **Qualified** → owner "Jake (Dispatch)" → notes → **Save lead plan** | "Open tonight's lead and everything is there, including the full conversation. Assign it to your dispatcher, set a follow-up time, and move it through your pipeline. Nothing slips through the cracks." |
| 9 | 2:06–2:20 | **What needs attention** | AI insights: recommendations, risk signals, overdue call-backs | Sidebar **AI insights** → scroll | "It even points out what needs attention, like overdue callbacks and your hottest leads, so the right customer gets a call first." |
| 10 | 2:20–2:34 | **Sounds like your business** | Agent settings: greeting, tone, services, knowledge base | Open agent settings → scroll | "You stay in control. Set the greeting, the tone, your services and your answers to common questions. It matches your brand and goes live on your site with one small snippet." |
| 11 | 2:34–2:46 | **Results** (card) | "Never miss a website lead again" + 3 checkmarks | Rendered card | "Every visitor answered, around the clock. Every lead captured with real contact details. And a team that spends its time on jobs, not chasing missed calls." |
| 12 | 2:46–2:58 | **CTA** (card) | "Book a free 15-minute demo" + your link | Rendered card | "Want to see it answering your customers? Book a free fifteen-minute demo. We'll set it up with your services, so you can try it on your own website." |

Cut-downs: a **60-second** social version is scenes 1, 2, 4, 6, 7, 12. A **15-second**
teaser is scene 1 (hook) + scene 4 (Contact Details filling) + CTA card.

> Claims check: the script avoids numbers you can't prove ("5-10x more leads", "40% more
> capacity" in `SALES_FEATURES_USECASES.md`). Add real numbers only once you have a pilot
> customer's results.

---

## Step 3: Run it locally with demo data

### 1. Prerequisites
- Node 22+, ffmpeg (`brew install ffmpeg` / `apt install ffmpeg`), and Playwright's Chromium (`npx playwright install chromium`, once after `npm install`)
- A **local** MongoDB 7 (the seed refuses remote databases):

```bash
docker run -d --name demo-mongo -p 27017:27017 mongo:7
```

### 2. `.env.local` (git-ignored; use throwaway values, never production keys)

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/?directConnection=true
MONGODB_DB_NAME=voiceagent_demo
DEFAULT_TENANT_ID=harborline-demo
EMBED_AUTH_ENABLED=false
AUTH_SECRET=<run: openssl rand -hex 32>
PLATFORM_ENCRYPTION_KEY=<run: openssl rand -hex 32>
# Only for narration (and optional live AI): OPENAI_API_KEY=...
```

`DEFAULT_TENANT_ID=harborline-demo` matters: the dashboard's "Test voice agent" link and bare
`/voice` would otherwise open the real `ai-scripto` tenant.

### 3. Install, seed, run

```bash
npm install
```

```bash
npm run demo:seed
```

```bash
npm run dev
```

The seed creates (all fictional, idempotent, only touches the `harborline-demo` tenant):
- Tenant **Harborline Heating & Plumbing**, assistant "Riley", greeting, tone, 6 services,
  8 knowledge-base entries, English+Spanish, verified domain, "Growth" subscription.
- Owner login `owner@harborline-demo.test` / `harborline-demo-2026` (override with `DEMO_EMAIL`/`DEMO_PASSWORD`).
- ~110 conversations over 6 months with a growing trend (9→30/month), about a third after
  hours, a realistic mix of hot/warm/cold leads, pipeline stages, owners, a few **overdue**
  follow-ups (so AI insights has something to flag), and summary emails marked sent.
- The **hero lead** (Dana Whitfield, water heater) with a fixed id, created "3 minutes ago",
  matching the conversation recorded in the widget scenes.
- Names use `@example.com`/`.test` emails and `555-01xx` phone numbers (reserved fictional ranges).

Check by hand before recording: `http://localhost:3000/tenant/login` → sign in → Overview.

### 4. Screens to avoid or fix before recording

| Screen / issue | Why it hurts | What to do |
|---|---|---|
| **Empty dashboard** ("Conversation database not connected" / "No conversations recorded yet") | Looks broken | Always run `npm run demo:seed` first (re-run before every take; the pipeline scene edits the hero lead) |
| **Embedded widget has an opaque page background**: a blank block above the chat card when framed | Looks unfinished on a client site | Recorder makes it transparent for the video. **Product fix:** make `/voice` `html/body/main` transparent in embed mode |
| **Widget resets ~1.5 s after the farewell finishes**, so the summary disappears | Summary flashes by in live recordings | Mocked recording holds the farewell audio. **Product fix:** keep the summary until the visitor clicks "New chat" |
| Header reads **"Offline"** after the call ends | Reads like an outage | **Product fix:** show "Call ended" |
| Footer language label stays **"English"** while replying in Spanish | Undercuts the language feature | Fine for video (small); product fix: reflect detected language |
| **Request Categories** chart uses software-agency labels (web app, mobile app, DevOps…) | Wrong for a plumber | Seed only uses support/pricing/general categories. Product fix: per-tenant categories |
| **Lead Geography** chart is one bar for a local business | Empty-looking | Don't linger on it |
| **Capabilities** tab (tech stack: OpenAI, MongoDB…) and the **Readiness score** tooltip formula | Too technical for SMB buyers | Skip / don't hover |
| **Platform admin** (`/admin/tenants`) lists real tenants (AI-Scripto, tkxel, PulzFit, Vital Steer) | Exposes real client names | Record only as the demo tenant owner |
| **Embed tab** snippet / client API key, domain verification tokens | Secrets | Recorder blurs `code/pre`, aborts if a key-like string is visible, and the seed verifies domains so no tokens render. Don't show existing tenants |
| `public/embed.js` and `src/data/tenants.json` contain hardcoded demo tokens and a production URL | Credentials in source | Never open them on screen; rotate if they were ever used publicly |
| `vital-steer-technologies` greeting says "AI-Scripto Automations" | Wrong company name | Don't record that tenant; fix the greeting |
| Live mode without an OpenAI key: "Agent connection failed" | Error banner | Use the default mocked mode, or set a working key |

---

## Step 4: Automation

### Pipeline

```bash
npm run demo:voiceover
```

```bash
npm run demo:record
```

```bash
npm run demo:build
```

1. **`demo:voiceover`** generates `output/audio/<scene>.mp3` + `durations.json` from the
   narration (OpenAI `tts-1-hd`, voice `nova` by default; `DEMO_TTS_PROVIDER=elevenlabs`
   for ElevenLabs). Run it first so the recorder holds each scene for its narration.
   Recorded your own voice instead? Save the files with the same names and run
   `npm run demo:voiceover -- --durations-only`.
2. **`demo:record`** (Playwright, headless Chromium) opens the fictional site, uses the
   assistant, signs in to the dashboard and walks every scene with eased, slightly curved
   mouse paths, a visible cursor with click ripples, human typing speed and natural pauses.
   Output: `output/screen-1080p.mp4` (1920x1080, 30 fps, H.264) and `timeline.json`.
   - The page is laid out at 1536x864 and upscaled to 1080p, so UI text is ~25% larger and
     readable on phones. `DEMO_SCALE=1` records at native 1920x1080.
   - **AI calls are mocked by default** (`browser/widget-mocks.js`): the conversation is
     scripted, streams word by word like the real thing, costs nothing and needs no keys.
     `DEMO_MOCK_AI=false` records the real AI.
   - `DEMO_SCENES=dashboard,pipeline` re-records just some scenes for testing; `DEMO_HEADLESS=false` shows the browser.
   - If a scene fails, a screenshot is saved as `output/failed-<scene>.png`.
3. **`demo:build`** (ffmpeg) places each narration clip at its scene's start, appends the
   Results and CTA cards, normalises loudness to -16 LUFS, and writes:
   - `output/final-demo.mp4`, the video to upload
   - `output/captions.srt` (upload as subtitles on YouTube/LinkedIn)
   - `DEMO_BURN_CAPTIONS=true` also writes `final-demo-captioned.mp4` with burned-in captions
   - `DEMO_MUSIC=path/to/track.mp3 DEMO_MUSIC_VOLUME=0.10` adds background music (use a licensed track)

What the merge does, in plain ffmpeg (for manual editing):

```bash
ffmpeg -i output/screen-1080p.mp4 -i output/audio/hook.mp3 -i output/audio/solution.mp3 \
  -filter_complex "[1:a]adelay=400:all=1[a0];[2:a]adelay=14400:all=1[a1];[a0][a1]amix=inputs=2:normalize=0[vo]" \
  -map 0:v -map "[vo]" -c:v copy -c:a aac narrated.mp4
```

### Optional: Remotion cards and captions

```bash
cd demo/remotion && npm install
```

```bash
npm run render:all
```

Renders `out/intro.mp4`, `out/results.mp4` and `out/cta.mp4` (animated gradient cards in the
brand colors). `demo:build` uses them automatically instead of the plain ffmpeg cards and
puts the intro first. `npm run studio` previews them; `npm run render:captioned` overlays
animated lower-third captions (from `caption` in `scenes.ts`) on the finished video.
Set your booking link in `BRAND.ctaUrl` in `scenes.ts` first.

### Tested here vs. not

- ✅ Verified in this repo: the six widget scenes (site, chat, lead capture, voice + Spanish,
  summary) record cleanly; the 1080p upscale; the build (narration placement, cards,
  loudness, captions); Remotion card renders; type checks for the demo code and the app.
- ⚠️ Not run end to end: the seed and the four dashboard scenes (dashboard, pipeline,
  insights, customize). They were written against the code, but no MongoDB was available
  in the build environment. Run `npm run demo:seed`, then `DEMO_SCENES=dashboard,pipeline,insights,customize npm run demo:record`
  and check the `failed-*.png` screenshot if anything trips.

---

## Step 5: Lead generation copy

### CTA line
**"Book a free 15-minute demo. We'll set it up with your services so you can try it on your own website."**

Alternates: "See it answer your customers: free 15-minute walkthrough." ·
"Stop losing after-hours leads. Book a free 15-minute demo."

### Cold email (send with the video)

> **Subject:** The 9:47 PM call your team missed
>
> Hi {FirstName},
>
> Quick question: what happens when someone visits {Company}'s website at night and needs help?
>
> For most {plumbing / HVAC / dental} businesses, they call, hit voicemail, and try the next
> company on Google. I put together a 3-minute video showing an AI front desk that answers
> those visitors instantly, by text or voice and in their language, collects their name,
> phone and job details, and sends your team a summary by morning:
>
> ▶ {video link}
>
> If it's useful, I'll set up a free version trained on {Company}'s services so you can try
> it on your own site. 15 minutes this week?
>
> {Your name}
> {Booking link}

### LinkedIn message (≤300 characters for connection notes)

> Hi {FirstName}, I made a 3-min video showing how {industry} businesses can answer every
> website visitor 24/7 and capture their details automatically, even at 9 PM. Happy to set
> up a free version for {Company} to try. Worth a look? {video link}

Follow-up (3-4 days later): "Did you get a chance to watch? The part at 0:46, where the
customer's details fill in automatically, is what most owners ask about. Want me to show
it on your site?"

### 3 video titles + thumbnail text

| Video title | Thumbnail text (big, 3-5 words) | Thumbnail visual |
|---|---|---|
| How Local Businesses Stop Losing After-Hours Leads (3-Min Demo) | **Missed call = lost job** | "Missed call 9:47 PM" badge + chat opening |
| Your Website Can Answer Customers 24/7. Here's How | **Answered at 9:47 PM** | Chat bubble with the reply + clock |
| From Voicemail to Booked Job: AI Front Desk Demo | **Voicemail → Booked** | Contact Details card filled in, green check |

---

## Privacy & safety checklist (before publishing)

- [ ] Recorded against the **local seeded database**, logged in as the demo owner only
- [ ] No real tenant names, customer data, emails or phone numbers on screen
- [ ] No keys or tokens (recorder aborts on key-like strings and blurs code blocks; still watch the final cut)
- [ ] `.env.local` never shown; terminal/IDE not in frame
- [ ] Booking link in `BRAND.ctaUrl` updated; claims match what you can deliver
