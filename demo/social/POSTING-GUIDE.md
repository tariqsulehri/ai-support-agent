# AI Scripto social video: posting guide

Three exports of the same ~70-second video (energetic voiceover, original royalty-free
music, burned-in captions so it works with the sound off):

| File | Size | Use for |
|---|---|---|
| `output/social/aiscripto-demo-9x16.mp4` | 1080x1920 vertical | TikTok, Instagram Reels & Stories, YouTube Shorts, Facebook Reels & Stories, Snapchat Spotlight, Pinterest, WhatsApp Status, LinkedIn mobile |
| `output/social/aiscripto-demo-4x5.mp4` | 1080x1350 portrait | Instagram feed, Facebook feed, LinkedIn feed, Threads, X (shows large on mobile) |
| `output/social/aiscripto-demo-16x9.mp4` | 1920x1080 landscape | YouTube (regular video), LinkedIn, Facebook page/video tab, X, your website and email, Google Business Profile |
| `output/social/cover-*.jpg` | per format | Upload as the cover/thumbnail where the platform allows it |

All are H.264 + AAC, 30 fps, -14 LUFS loudness, under 15 MB.

## Platform checklist

Length limits change often; the ones below were current at the time of writing, so check the app before a big campaign.

| Platform | File | Length limit | Tips |
|---|---|---|---|
| **TikTok** | 9x16 | 10 min | Post natively (no watermark from other apps). Keep the description short; add 3-5 hashtags. Pin a comment with the demo link (link in bio). |
| **Instagram Reels** | 9x16 | 3 min | Select the cover frame from `cover-9x16.jpg`. Turn on "Also share to Facebook". Put the link in bio + a link sticker in a Story. |
| **Instagram feed** | 4x5 | 60 min | Best for followers' feeds; same caption as Reels. |
| **Instagram / Facebook Stories** | 9x16 | 60 s per story (auto-splits) | Add a link sticker to the demo page. |
| **YouTube Shorts** | 9x16 | 3 min | Title ≤ 60 characters + `#Shorts`. Add the link to the description and a "Related video" link to the full demo. |
| **YouTube (regular)** | 16x9 | — | Upload `cover-16x9.jpg` as thumbnail; also upload the 3:47 full demo and link them together. |
| **Facebook Reels** | 9x16 | ~70 s fits | Meta keeps changing Reels limits; 70 s is safely inside them. |
| **Facebook feed / Page** | 4x5 or 16x9 | 240 min | Use the "Learn more" / "Book now" button pointing to the demo link. |
| **LinkedIn** | 4x5 (feed) or 16x9 | 15 min | Upload natively (not a YouTube link), add captions-on note, tag AI Scripto's page. Best weekdays 8-10 AM. |
| **X (Twitter)** | 16x9 or 4x5 | 2:20 (free accounts) | Short hook text + link in the post. |
| **Threads** | 4x5 | 5 min | Same caption as Instagram. |
| **Pinterest (Idea / video pin)** | 9x16 | 15 min | Destination link: the demo page. Title: "AI chatbot for home services". |
| **Snapchat Spotlight** | 9x16 | 60 s recommended | Trim to the first 60 s in the app if needed. |
| **WhatsApp Status / Business catalog** | 9x16 | 60-90 s (check app) | Send to your client and partner lists; WhatsApp splits longer clips. |
| **Google Business Profile** | 16x9 | 30 s, 75 MB | Upload as an "Update" with a "Book" button, or a short trimmed clip. |
| **Website / email** | 16x9 | — | Embed on the AI Support Voice & Chatbot page and in sales emails (GIF preview + link). |

## Ready-to-paste captions

**TikTok / Reels / Shorts**
> Still sending customers to voicemail? 📵 This AI answers every call & chat 24/7, books the job and captures the lead. 🚀 Book your free demo: aiscripto.com/ai-support-voice-chatbot
> #AIChatbot #SmallBusiness #HVAC #Plumbing #CustomerService

**Instagram / Facebook feed**
> Missed calls = missed money. 💸
> AI Scripto's AI Support Voice & Chatbot answers every visitor in seconds, day or night, captures their name, phone and email, and puts every lead in one dashboard.
> 👉 Free demo: aiscripto.com/ai-support-voice-chatbot · ✉ Support@aiscripto.com
> #AIforBusiness #ChatbotMarketing #LeadGeneration #HomeServices #SmallBusinessTips #AIScripto

**LinkedIn**
> Most service businesses lose leads after 5 PM, not because demand is low, but because nobody answers.
> We built AI Scripto's AI Support Voice & Chatbot to fix that: instant answers by voice or chat, automatic lead capture, AI summaries, and a dashboard for every conversation. Agencies can run it for all their clients from one console.
> 70-second demo below. Want to see it on your own website? Book a free demo: https://www.aiscripto.com/ai-support-voice-chatbot or email Support@aiscripto.com
> #ArtificialIntelligence #CustomerExperience #LeadGeneration #SaaS #SmallBusiness

**YouTube title options**
1. Stop Missing Customers: AI Voice & Chatbot Demo (70s) #Shorts
2. This AI Answers Every Customer 24/7 | AI Scripto
3. From Voicemail to Booked Job in 30 Seconds

**X**
> Still sending customers to voicemail? 📵 Our AI answers 24/7, books the job and captures the lead. 70-second demo 👇 aiscripto.com/ai-support-voice-chatbot

## Getting more reach

- **Post natively on every platform** (no cross-posted watermarks); TikTok and Instagram down-rank them.
- **First 2 seconds decide everything:** the video opens on the hook, so don't add an intro.
- **Trending sounds (optional):** on TikTok/Instagram you can lower the original audio and add a trending track in-app; keep the voiceover above it.
- **Boost the best performer:** after 48 h, put a small paid budget behind whichever version gets the best 3-second view rate, targeting home-service and SMB owners in the US.
- **A/B test the hook:** "Still sending customers to voicemail?" vs "Your phone rings at 9 PM. Who answers?" (edit `voiceover` in `demo/social/script.ts` and rebuild).
- **Track clicks:** add UTM tags per channel, e.g. `?utm_source=tiktok&utm_medium=social&utm_campaign=ai-support-demo`.
- **Repurpose:** the 3:47 full demo goes on YouTube and the website; the 70 s cut everywhere else; a 15 s teaser can be cut from the hook, problem and CTA scenes.

## Rebuilding

```bash
NODE_USE_ENV_PROXY=1 npm run demo:voiceover -- --social
```

```bash
cd demo/remotion && for f in 9x16 4x5 16x9; do for c in hook problem solution cta; do npx remotion render src/index.ts s-$c-$f out/social/$c-$f.mp4; done; done
```

```bash
npm run demo:social
```

Change the music with `DEMO_SOCIAL_MUSIC=your-track.mp3` (or `none`), its level with
`DEMO_SOCIAL_MUSIC_VOLUME` (default 0.55), and regenerate the original track with
`bash demo/make-music-energetic.sh`.
