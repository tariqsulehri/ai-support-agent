# Demo Video Kit: AI Front Desk (Multi-Tenant, US Market)

A ~3.5-minute product demo, recorded automatically:

1. **Website conversation (30 s)**: a homeowner on a Dallas-Fort Worth HVAC/plumbing/electrical
   website asks for help; the assistant answers, books a slot and captures the lead.
2. **Platform admin (~90 s)**: one console managing many client businesses (tenants): overview,
   tenant directory, a tenant's setup, plans and billing, onboarding a new client live, and
   the cross-tenant dashboard.
3. **Tenant dashboard (~75 s)**: the business owner's private view: KPIs, every conversation,
   the lead pipeline, AI insights and CSV export, assistant settings.
4. **CTA card.**

All data is fictional and US-based: 9 businesses in TX, GA, AZ, IL, FL, CO and CA, about 580
conversations with US names, cities, ZIP codes and 555-01xx phone numbers.

```
demo/
  scenes.ts                 script: scenes, timing, captions, voiceover   ← edit words here
  fixtures/demo-data.ts     tenants, hero business, 30-second conversation, logins (from env)
  fixtures/templates.ts     per-trade conversation templates (HVAC, plumbing, electrical, roofing, ...)
  seed/seed-demo.ts         fills a LOCAL MongoDB with all of the above
  site/summit.html          the fictional business website with the chat launcher
  browser/                  cursor overlay + scripted AI replies, injected only while recording
  record.ts                 Playwright recorder → output/screen-1080p.mp4 + timeline.json
  voiceover.ts              narration MP3s (OpenAI or ElevenLabs)
  build-video.ts            ffmpeg: narration + CTA card + music → output/final-demo.mp4 + captions.srt
  remotion/                 optional animated intro/CTA cards and lower-third captions
```

## 1. Setup (once)

Prerequisites: Node 22+, ffmpeg, a local MongoDB 7, and Playwright's Chromium.

```bash
docker run -d --name demo-mongo -p 27017:27017 mongo:7
```

```bash
npm install && npx playwright install chromium
```

Add to `.env.local` (git-ignored; put your real logins **here only**, never in the repo):

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/?directConnection=true
MONGODB_DB_NAME=voiceagent_demo
DEFAULT_TENANT_ID=summit-home-services
EMBED_AUTH_ENABLED=false
USAGE_EVENTS_ENABLED=true
AUTH_SECRET=<openssl rand -hex 32>
PLATFORM_ENCRYPTION_KEY=<openssl rand -hex 32>

# Logins created by the seed and typed by the recorder
DEMO_ADMIN_EMAIL=<platform admin email>
DEMO_ADMIN_PASSWORD=<platform admin password>
DEMO_TENANT_EMAIL=<tenant owner email>
DEMO_TENANT_PASSWORD=<tenant owner password>
DEMO_TENANT_NAME=<name shown as "Welcome back, ...">

# Only for narration
OPENAI_API_KEY=<key>
```

`USAGE_EVENTS_ENABLED=true` fills the admin Usage charts; `PLATFORM_ENCRYPTION_KEY` makes
tenants show "OpenAI key configured" (placeholder keys, displayed masked only).

## 2. Make the video

Re-run the seed before every take, because the recording edits a lead and creates a tenant.

```bash
npm run demo:seed
```

```bash
npm run dev
```

```bash
npm run demo:voiceover
```

```bash
npm run demo:record
```

```bash
npm run demo:build
```

Result (1920x1080): `demo/output/final-demo.mp4`, `final-demo-captioned.mp4` (on-screen part + caption on every scene, best for muted social autoplay; `DEMO_LOWER_THIRDS=false` skips it) and `captions.srt` (when narration exists).

- `DEMO_SCENES=admin-login,admin-overview npm run demo:record` re-records just some scenes.
- `DEMO_HEADLESS=false` shows the browser while it records.
- A failed scene saves `demo/output/failed-<scene>.png`.
- The chat uses scripted replies by default (repeatable, free, no keys); `DEMO_MOCK_AI=false` uses the real AI.
- Optional animated cards: `cd demo/remotion && npm install && npm run render:all`; the build picks them up.
- `DEMO_BURN_CAPTIONS=true` burns captions in; `DEMO_MUSIC=track.mp3` adds licensed background music.

## 3. What the seed creates

| Tenant | City | Trade | Plan | Status |
|---|---|---|---|---|
| **Summit Pro Home Services** (hero) | Dallas, TX | HVAC, plumbing, electrical | Growth, monthly | Active, ~185 conversations |
| Lone Star Plumbing Co. | Austin, TX | Plumbing | Starter | Active |
| Peachtree Electric | Atlanta, GA | Electrical | Growth, yearly | Active |
| Desert Breeze Heating & Air | Phoenix, AZ | HVAC | Enterprise | Active |
| Lakeside Family Dental | Chicago, IL | Dental | Starter | Active |
| Bayside Roofing & Gutters | Tampa, FL | Roofing | Free trial | Active, no API key yet |
| Rocky Mountain Pest Control | Denver, CO | Pest control | Starter, yearly | Active |
| Windy City Locksmith | Chicago, IL | Locksmith | Starter, past due | **Disabled** |
| Golden Gate Movers | San Francisco, CA | Moving | Canceled | **Archived** |

Also: the platform admin, the tenant owner plus two staff users (admin and viewer roles),
verified domains, masked keys, usage counters, six months of growing volume, a few overdue
follow-ups, and the hero lead (Mike Johnson, Plano TX, AC repair) from the 30-second chat.
"Gulf Coast Electric" is created live on camera and removed by the next seed.

## 4. Scene plan

| Part | Scene | Time | On screen / action | Voiceover |
|---|---|---|---|---|
| Website | chat-open | 0:00–0:06 | Summit Pro site → click **Chat with us** → greeting | "A homeowner in Plano, Texas lands on Summit Pro's website. Riley, their AI assistant, greets them instantly." |
| | chat-ask | 0:06–0:17 | Types "AC stopped cooling, 98 degrees" → reply with quick check + 2-4 PM slot | "They describe the problem in their own words, and Riley answers with a quick fix to try and an open time slot today." |
| | chat-booked | 0:17–0:30 | Sends name/phone/email/address → Contact Details → Conversation Summary | "Name, phone, email and address are captured automatically, the job is booked, and the team gets a summary. All in under thirty seconds." |
| Admin | admin-login | ~8 s | `/admin/login` → admin email + password | "Now let's look behind the scenes. As the platform owner, you sign in to one admin console." |
| | admin-overview | ~12 s | Active/Disabled/Archived/OpenAI-ready tiles, status donut, usage bars | "From here you manage every business on the platform: who is active, who is paused, and how much each one is using the assistant." |
| | admin-tenants | ~15 s | **Tenants** tab → search "plumb" → **Disabled** filter → **All** | "Each client company is its own tenant: a home services company in Dallas, a plumber in Austin, an electrician in Atlanta, a dental office in Chicago. Search, filter, and see each plan and setup status at a glance." |
| | admin-tenant-detail | ~18 s | Open Summit Pro → **Embed & Client Key** (masked) → **Agent Persona** → **Team Access** | "Open any tenant to see its readiness, the website code to install, the assistant's personality and knowledge, and its team logins. Each tenant's conversations and keys are kept completely separate." |
| | admin-subscriptions | ~9 s | **Subscriptions** tab | "Plans are managed here too: free trials, starter, growth and enterprise, billed monthly or yearly." |
| | admin-create | ~16 s | **Create Tenant** → fill Gulf Coast Electric → **Create Tenant** | "Onboarding a new client takes about a minute. Enter the company, its services and website, and their assistant is ready to install." |
| | admin-dashboard | ~13 s | `/dashboard`: KPIs across all tenants → **Tenants** control center | "And the platform dashboard rolls up conversations and leads across all of your clients in one view." |
| Tenant | tenant-login | ~8 s | Sign out → `/tenant/login` → owner login | "Now switch to your client's side. The business owner signs in to their own private dashboard." |
| | tenant-overview | ~14 s | KPIs, 6-month growth, service demand | "They see exactly how their website is performing: conversations, lead capture rate, hot leads and month over month growth." |
| | tenant-transcripts | ~15 s | **Call transcripts** → search "water heater" | "Every conversation is saved with a summary, key points and the full transcript, and it is searchable in seconds." |
| | tenant-pipeline | ~16 s | **Lead pipeline** → Mike Johnson → status Qualified → owner + note → **Save lead plan** | "Today's AC lead from Plano is right at the top. Assign it to dispatch, add a note, and move it through the pipeline." |
| | tenant-insights | ~11 s | **AI insights** → recommendations, risk signals → hover **Export CSV** | "Smart insights flag overdue callbacks and hot leads, so the right customer gets a call first. And everything exports to your CRM in one click." |
| | tenant-setup | ~10 s | Agent settings: greeting, tone, services, knowledge base | "And they stay in control of their assistant: the greeting, the tone, their services and answers to common questions, with no code." |
| CTA | cta | ~9 s | "Book a free 15-minute demo" + link | "Want this answering your customers, or offered to your own clients? Book a free fifteen-minute demo today." |

## 5. Before you publish

- [ ] Recorded against the local seeded database, not production (production shows real client names and data)
- [ ] Booking link set in `BRAND.ctaUrl` (`scenes.ts`)
- [ ] Watched the final cut: no keys, tokens or `.env.local` on screen (the recorder also blurs code blocks and aborts on key-like text)
- [ ] The login emails typed on screen are ones you're happy to show

**Known product quirks** (the recorder works around them; worth fixing in the app):

- **Embed background:** the embedded chat paints an opaque page background (a blank block above the card).
- **Header after a call:** it says "Offline" when a call ends.
- **Chat reset:** the chat resets ~1.5 s after the goodbye, so the summary disappears.
- **Request Categories chart:** it uses software-agency labels.
- **Status spinner never stops:** in the lead pipeline, changing a lead's status (and sometimes "Save lead plan") saves instantly, but the page's refresh after the save never finishes, so the spinner keeps going (`OptimisticStatusForm` in `src/app/dashboard/client-controls.tsx`). The recorder reloads the page after 2 s.
- **Hardcoded credentials:** `public/embed.js` and `src/data/tenants.json` contain hardcoded demo credentials.

## Lead-gen copy

**CTA:** "Book a free 15-minute demo. We'll set it up with your services so you can try it on your own website."

**Cold email**

> **Subject:** The after-hours calls {Company} is missing
>
> Hi {FirstName}, when someone visits {Company}'s website at night with a broken AC or a leak,
> what happens? Usually voicemail, and then they call the next company. This 3-minute video shows
> an AI front desk that answers instantly, books the job, captures the customer's details, and
> gives you one dashboard for every lead: {video link}
>
> I'll set up a free version trained on your services so you can try it on your own site.
> 15 minutes this week? {booking link}

**LinkedIn (agencies / resellers):** "Hi {FirstName}, I built a white-label AI front desk that
agencies can roll out to every client: one admin console, separate dashboards per business.
3-min demo: {video link}. Worth a chat?"

**Titles / thumbnail text**
1. "AI Front Desk for Home Services: Live Demo" / **Booked in 30 seconds**
2. "Manage Every Client's AI Assistant From One Dashboard" / **One console, every client**
3. "Never Miss a Website Lead Again (HVAC, Plumbing, Electrical)" / **No more missed calls**
