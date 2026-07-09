# Voice Agent Feature Outline

## Current Product Shape

This codebase implements an embeddable, multi-tenant voice and text support agent for service businesses. The agent is designed to answer questions, qualify visitors, collect lead details, end the conversation gracefully, generate a summary, and optionally email that summary to configured recipients.

## Existing Features

### Conversation UI

- `/voice` renders the main agent experience in inline or floating mode.
- The root route redirects users to `/voice`.
- The widget supports a floating launcher button and an inline iframe-friendly layout.
- The chat window includes transcript history, streamed assistant replies, status banners, error states, voice settings, and a close control.
- Visitors can interact by push-to-talk voice input or typed text input.

### Voice Input

- Browser microphone capture uses `MediaRecorder`.
- Voice activity detection waits for speech, then auto-stops after silence.
- Audio is sent to `/api/transcribe`.
- OpenAI Whisper transcribes recorded audio.
- Short or empty recordings are ignored gracefully.

### Assistant Response

- `/api/chat` streams Server-Sent Events from OpenAI chat completions.
- The UI displays partial tokens as they arrive.
- Completed sentences are extracted during the stream and sent to text-to-speech early, reducing perceived latency.
- Conversation state tracks connecting, idle, listening, transcribing, thinking, speaking, ended, and error phases.

### Speech Output

- `/api/speak` converts assistant text to audio.
- OpenAI TTS is supported.
- ElevenLabs TTS support is present through tenant configuration and environment variables.
- The client queues sentences and plays them in order.
- The current spoken response can be stopped when closing or interrupting playback.

### Tenant Configuration

- Tenants are configured in `src/data/tenants.json`.
- Each tenant can define identity, token/API keys, allowed domains, OpenAI API key env var, persona, services, language support, TTS provider, voice, greeting, custom instructions, knowledge base entries, and email settings.
- Tenant resolution supports tenant ID plus token, standalone API key, or parent domain.
- When auth is disabled, the first tenant is used as the default.

### Embedding

- `/voice` can be embedded in an iframe.
- `public/embed.js` provides a customer-side script that injects the iframe lazily.
- The embed script can auto-detect a parent site's brand color and pass it to the widget.
- The embedded widget can send a close message to the parent page.
- CSP frame ancestor configuration exists in `next.config.ts`.

### Branding And Theming

- The voice page accepts validated theme color query params.
- The app injects CSS variables server-side to avoid theme flash.
- `ThemeProvider` listens for parent `postMessage` theme updates.
- Tenant-specific agent and company names appear in the header and greeting.

### Language Support

- Tenant config supports automatic language mode and supported language lists.
- The prompt requires responses in the same language as the user.
- Speech synthesis detects response language and can select tenant-specific voices by language.
- Current tenant examples support English, Urdu, and Hindi.

### Lead Capture

- The system prompt instructs the assistant to collect full name, email, phone, optional company, and purpose.
- The model emits hidden `[LEAD:{...}]` tokens.
- `/api/chat` extracts those tokens and sends lead updates to the client.
- The UI displays captured lead fields in a live lead panel.
- The assistant can emit `[END_CALL]` once required lead data is captured and the visitor is done.

### Call Summary And Notifications

- `/api/summarize` creates a structured call summary after end call.
- The summary includes a narrative recap and key points.
- The summary panel appears in the UI.
- Optional SMTP email delivery can send the lead, summary, key points, and transcript to configured recipients and/or the captured lead email.

## Recommended Feature Roadmap

### Phase 1: Production Hardening

- Move demo tenant tokens and API keys out of `src/data/tenants.json`.
- Replace hardcoded `BASE_URL`, tenant, and token in `public/embed.js` with generated customer snippets or script attributes.
- Align `EMBED_INTEGRATION.md` with the actual tenant config system; it currently references env-based tenant JSON that the code does not use.
- Restore configurable `ALLOWED_FRAME_ANCESTORS` usage in `next.config.ts` instead of the hardcoded CSP allowlist.
- Add `x-embed-tenant`, `x-embed-token`, and `x-api-key` to CORS allowed headers.
- Add input validation for chat, summarize, and speak payloads with `zod`.
- Add rate limiting and basic abuse protection for chat, transcribe, speak, and summarize routes.
- Add structured logging for tenant ID, route latency, provider errors, and call lifecycle events.

### Phase 2: Lead Quality And CRM Workflow

- Replace hidden lead tokens in free-form text with OpenAI structured outputs or tool calls.
- Validate email and phone before marking lead fields complete.
- Add lead status fields such as qualified, unqualified, needs follow-up, and requested meeting.
- Add a backend persistence layer for leads, transcripts, and summaries.
- Add exports or integrations for HubSpot, Salesforce, Pipedrive, Airtable, Google Sheets, and webhook targets.
- Add configurable lead capture requirements per tenant.
- Add consent wording and privacy disclosure options for recorded/transcribed conversations.

### Phase 3: Tenant Admin Experience

- Build an admin dashboard for tenant setup instead of editing `tenants.json`.
- Support tenant-level brand color, logo, greeting, agent avatar, services, knowledge base, and escalation rules.
- Add a snippet generator for iframe mode and script mode.
- Add test tools for validating tenant auth, allowed domains, TTS voice, and email notifications.
- Add a conversation simulator for testing prompt behavior before deployment.
- Add usage analytics by tenant: conversations, leads captured, completion rate, average duration, language mix, and failure rate.

### Phase 4: Conversation Intelligence

- Add intent classification for sales, support, pricing, hiring, partnership, and complaint flows.
- Add objection handling and qualification scoring.
- Add meeting booking integrations with Calendly, Google Calendar, or Microsoft 365.
- Add human handoff by email, Slack, WhatsApp, or live chat provider.
- Add knowledge retrieval from tenant documents or website pages instead of static JSON entries.
- Add transcript search and lead timeline history.
- Add multilingual summarization and translation options for internal teams.

### Phase 5: Voice Experience

- Add barge-in so users can interrupt while the assistant is speaking.
- Add streaming TTS support where provider APIs allow it.
- Add fallback text-only mode when microphone permission is denied.
- Add voice preview in settings.
- Add per-language voice selection controls.
- Add mobile-specific UX improvements for iframe sizing, keyboard overlap, and microphone permission guidance.
- Add configurable push-to-talk versus tap-to-record modes.

## Important Review Notes

- `public/embed.js` contains a production URL and hardcoded `tkxel` credentials. This makes snippet reuse risky and should be replaced before customer rollout.
- `src/data/tenants.json` includes test tokens and API keys in source. These should be treated as compromised and rotated if used anywhere public.
- `next.config.ts` computes `frameAncestors` from `ALLOWED_FRAME_ANCESTORS`, but the active CSP header is hardcoded.
- CORS configuration allows `Content-Type` and `Authorization`, but the app sends custom embed headers that are not included in the preflight allowlist.
- Lead extraction depends on the model emitting exact hidden text tokens. This is workable for a prototype but fragile for production.
- The system prompt says not to give pricing, while the tenant knowledge base includes pricing-related content. The assistant may need clearer policy wording such as "do not quote exact prices; explain that pricing is custom."
- Email notifications are implemented but disabled in all current tenant examples.
- There are generated Prisma files, but no active persistence layer in the reviewed API flow.

## Suggested MVP Positioning

"An embeddable AI voice agent for service businesses that speaks with website visitors, answers service questions, qualifies leads, collects contact details, and sends the team a concise call summary after each conversation."

