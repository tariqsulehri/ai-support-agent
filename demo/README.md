# AI Scripto Demo Video: AI Support Voice & Chatbot

An automated, ~3:45 lead-generation video (1920x1080, voiceover, music bed, on-screen captions):

| # | Part | What it shows |
|---|---|---|
| 1 | **Brand intro** | AI Scripto logo, "AI Support Voice & Chatbot" |
| 2 | **The problem** | Life without an AI support agent: voicemail after hours, slow replies, lost leads, no visibility |
| 3 | **After deploying AI Scripto** | 24/7 answers, automatic lead capture, instant summaries, one dashboard |
| 4 | **Live on a website (30 s)** | A Plano, TX homeowner chats with the assistant; slot booked, lead captured, summary created |
| 5 | **Multi-tenant admin (brief)** | Tenant Management: every client business, plan, setup and status |
| 6 | **Tenant portal (detailed)** | Overview KPIs · Conversations (summaries, sentiment, intent, transcripts, search) · Lead pipeline (workspace, status, owner, notes, funnel) · AI insights · Filters & CSV export · Agent setup |
| 7 | **Contact** | www.aiscripto.com/ai-support-voice-chatbot · Support@aiscripto.com |

The product data is fictional US demo data (9 businesses in TX, GA, AZ, IL, FL, CO, CA; ~580 conversations).

```
demo/
  scenes.ts               the script: order, timing, captions, voiceover, card copy  ← edit words here
  assets/                 AI Scripto logos (+ transparent white version) and the generated music bed
  fixtures/               tenants, hero conversation, per-trade conversation templates
  seed/seed-demo.ts       fills a LOCAL MongoDB with the demo data and logins
  site/summit.html        fictional home-services website with the chat launcher
  browser/                cursor overlay + scripted chat replies (recording only)
  record.ts               Playwright recorder → output/screen-1080p.mp4 + timeline.json
  voiceover.ts            narration MP3s (OpenAI gpt-4o-mini-tts, voice "coral", styled narrator)
  remotion/               intro / problem / solution / contact cards with the AI Scripto logo
  make-music-bed.sh       regenerates assets/music-bed.mp3 (original, royalty-free ambient pad)
  build-video.ts          ffmpeg assembly → output/final-demo.mp4 + captions.srt
```

## Social media cut (~70 s)

`demo/social/` builds a short, energetic version in **9:16, 4:5 and 16:9** from the same recording,
with punchier narration, an original 124 BPM track (`make-music-energetic.sh`) and burned-in captions.
See [`social/POSTING-GUIDE.md`](social/POSTING-GUIDE.md) for which file goes on which platform,
captions, hashtags and the rebuild commands (`npm run demo:social`).

## 1. One-time setup

Node 22+, ffmpeg, a local MongoDB 7, Playwright's Chromium:

```bash
docker run -d --name demo-mongo -p 27017:27017 mongo:7
```

```bash
npm install && npx playwright install chromium && (cd demo/remotion && npm install)
```

`.env.local` (git-ignored; real logins and keys go **here only**):

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/?directConnection=true
MONGODB_DB_NAME=voiceagent_demo
DEFAULT_TENANT_ID=summit-home-services
EMBED_AUTH_ENABLED=false
USAGE_EVENTS_ENABLED=true
AUTH_SECRET=<openssl rand -hex 32>
PLATFORM_ENCRYPTION_KEY=<openssl rand -hex 32>
DEMO_ADMIN_EMAIL=<platform admin email>
DEMO_ADMIN_PASSWORD=<platform admin password>
DEMO_TENANT_EMAIL=<tenant owner email>
DEMO_TENANT_PASSWORD=<tenant owner password>
DEMO_TENANT_NAME=<name shown as "Welcome back, ...">
OPENAI_API_KEY=<key, for the voiceover>
```

## 2. Make the video

```bash
npm run demo:voiceover
```

```bash
npm run demo:seed && npx next build && npx next start
```

```bash
npm run demo:record
```

```bash
cd demo/remotion && for c in intro problem solution cta; do npx remotion render src/index.ts $c out/$c.mp4; done
```

```bash
npm run demo:build
```

Output: `demo/output/final-demo.mp4` and `captions.srt` (upload as subtitles on YouTube/LinkedIn).

- Run the voiceover **first**: scene and card lengths follow the narration (`output/audio/durations.json`).
- Re-run `npm run demo:seed` before every recording (the take edits a lead).
- Behind an HTTPS proxy, run the voiceover with `NODE_USE_ENV_PROXY=1`.
- Voice: `DEMO_TTS_VOICE` (default `coral`), style `DEMO_TTS_STYLE`, or `DEMO_TTS_PROVIDER=elevenlabs` with `ELEVENLABS_API_KEY`.
- Music: default `assets/music-bed.mp3`, ducked under the voice; `DEMO_MUSIC=your-track.mp3` or `DEMO_MUSIC=none`; level `DEMO_MUSIC_VOLUME` (0.3).
- `DEMO_SCENES=tenant-leads,tenant-insights npm run demo:record` re-records a subset; a failing scene saves `output/failed-<scene>.png`.
- Use a production build (`next build && next start`) for recording: dev mode adds compile pauses.

## 3. Scene script

| Scene | On screen | Voiceover |
|---|---|---|
| intro (card) | AI Scripto logo + product | "AI Scripto presents the AI Support Voice and Chatbot." |
| problem (card) | 4 pain points | "Without an AI support agent, here's what really happens. Calls after hours go straight to voicemail. Website visitors wait hours for a reply, so they contact your competitor instead. Leads leave without their contact details, and you never really know what customers are asking for. Every missed conversation is lost revenue." |
| solution (card) | 4 benefits | "Now, deploy AI Scripto's AI Support Voice and Chatbot. Every visitor gets an answer in seconds, day or night, by voice or chat. Contact details are captured automatically, your team receives an instant summary, and every conversation and lead lives in one simple dashboard. Let's see it in action." |
| chat-open / ask / booked | Website chat, 30 s | "A homeowner in Plano, Texas, visits a home services website…" → "…All in under thirty seconds." |
| admin-tenants | Tenant Management tiles + tenants list | "For agencies and multi-location brands, one admin console manages every client. Tenant Management shows each business, its plan, setup and status, and each tenant's data stays completely private." |
| tenant-login | Tenant sign-in | "Now let's step into the business owner's own portal." |
| tenant-overview | KPIs, growth | "The overview shows the numbers that matter…" |
| tenant-conversations | Summaries, sentiment, transcript, search | "Under Call Transcripts, every voice and chat conversation is saved…" |
| tenant-leads | Lead workspace, status, owner, note, funnel | "The Lead Pipeline turns conversations into revenue…" |
| tenant-insights | Recommendations, risk signals, queue | "AI Insights tells your team what to do next…" |
| tenant-filters | Hot filter, Export CSV | "Filter by date, status, lead quality or urgency, and export…" |
| tenant-setup | Greeting, tone, services, knowledge base | "And in Agent Setup, the owner controls…" |
| cta (card) | Logo, demo link, support email | "Ready to stop missing customers? Book your free demo at aiscripto dot com, or email support at aiscripto dot com…" |

## 4. Before publishing

- [ ] Recorded against the local seeded database (production shows real clients' names and data)
- [ ] Watched the final cut: no keys, tokens or `.env.local` on screen (the recorder also blurs code/token fields and aborts on key-like text)
- [ ] The login emails typed on screen are ones you're happy to show

**App issues found while recording** (the recorder works around them; worth fixing):

- **Dashboard transitions hang:** client-side transitions sometimes never finish, even though the server responds and saves within milliseconds. Affected: sidebar navigation, the filter dropdowns, the status dropdown (`OptimisticStatusForm`) and "Save lead plan" in `src/app/dashboard/client-controls.tsx`. The recorder falls back to loading the page directly.
- **Embed background:** the embedded chat paints an opaque page background (a blank block above the chat card).
- **Header after a call:** it says "Offline" when a call ends.
- **Chat reset:** the chat resets ~1.5 s after the goodbye.
- **Hardcoded credentials:** `public/embed.js` and `src/data/tenants.json` contain hardcoded demo credentials.

## Outreach copy

**Cold email**

> **Subject:** The customers you're missing after 5 PM
>
> Hi {FirstName}, when someone visits {Company}'s website after hours, do they get an answer or voicemail?
> This 3-minute video shows AI Scripto's AI Support Voice & Chatbot answering visitors instantly,
> capturing their details, and giving your team one dashboard for every lead: {video link}
>
> Book a free demo: https://www.aiscripto.com/ai-support-voice-chatbot, or reply here / Support@aiscripto.com.

**Titles / thumbnail text**
1. "Stop Missing Customers: AI Support Voice & Chatbot by AI Scripto" / **Never miss a lead**
2. "From Voicemail to Booked Job in 30 Seconds" / **Booked in 30 seconds**
3. "One AI Front Desk for Every Client Business" / **Every customer answered**
