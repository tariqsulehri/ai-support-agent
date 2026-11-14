# Project module: ai-support-agent

**Status:** Updated for `ai-support-agent` on 2026-11-14; owner to confirm at Checkpoint A.  
**Loads with dimensions:** security, ai-llm, architecture, data, reliability, cost, compliance, testing, code-health, ux-design, accessibility, documentation.  
**How it is used:** Load it at Stage 3 together with the stack modules `nextjs`, `react`, `mongodb-mongoose`, `llm-voice-providers`, `docker-cicd`. A failed item below is a finding, with this file and the item number as the reference.

---

## 1. Multi-Tenant Isolation & Embed Security

- [ ] **Every API route resolves tenant on the server:** For each `src/app/api/**/route.ts`, verify how tenant context is resolved (`requireTenantRuntime` / `getTenantFromRequest` via session, token, api-key, domain, or `DEFAULT_TENANT_ID`). A route trusting arbitrary client-supplied IDs without validation is a finding.
- [ ] **Embed authentication:** When `EMBED_AUTH_ENABLED=true`, requests must present a valid hashed embed key, origin match, or HMAC session token (`x-embed-session`). Verify that disabling embed auth (`EMBED_AUTH_ENABLED=false`) does not expose unprotected write operations.
- [ ] **Tenant resolution hierarchy:** Priority must strictly enforce `sessionToken` → `tenantId + token` → `x-api-key` → `Referer / origin` domain → `DEFAULT_TENANT_ID` fallback. Verify that domain matching never grants access to an unverified or disabled tenant.
- [ ] **Constant-time credential hashing:** Embed tokens and API keys are verified using SHA-256 hashes (`src/lib/tenants/hash.ts`) and compared via `crypto.timingSafeEqual`.
- [ ] **Tenant secrets protection:** OpenAI keys, tenant database URLs, and SMTP passwords must NEVER live in plaintext in git, logs, or API responses. They must be encrypted at rest using AES-256-GCM with `PLATFORM_ENCRYPTION_KEY` in `tenant_secrets`.
- [ ] **`/api/config` disclosure check:** Response returns only widget settings (`agentName`, `companyName`, `language`, `voice`, `greeting`). No internal knowledge base chunks, connection strings, keys, or other tenant metadata are exposed.
- [ ] **Iframe framing security:** `frame-ancestors` in `next.config.ts` controls embedding. Verify `ALLOWED_FRAME_ANCESTORS` and ensure administrative routes (`/admin/*`) cannot be framed (clickjacking protection).

---

## 2. Admin Authentication, Sessions & RBAC

- [ ] **Middleware & route guard defense-in-depth:** `src/middleware.ts` guards `/admin/:path*`. Verify every admin API route (`/api/admin/*`, `/api/admin/auth/*`) also validates session credentials independently.
- [ ] **Admin session tokens:** Verified with HMAC signature (`AUTH_SECRET`), expiration timestamps, and secure cookie flags (`httpOnly`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`).
- [ ] **Password hashing:** Admin passwords must use salted hashing (PBKDF2/scrypt/bcrypt) rather than plain single-pass unsalted hashes.
- [ ] **Login brute-force protection:** Login endpoint (`/api/admin/auth/login`) has rate limiting or lockout protection against credential stuffing.
- [ ] **CSRF protection:** State-changing `POST`/`PUT`/`DELETE` admin endpoints enforce proper origin/referer headers and cookie `sameSite` settings.

---

## 3. LLM Pipeline & Prompt Injection Defense

- [ ] **Server-side system prompt construction:** `buildSystemPrompt` is constructed exclusively on the server using validated tenant knowledge base entries and services. The client cannot inject system prompts.
- [ ] **History validation & message limits:** Client conversation history posted to `/api/chat` is validated with Zod, capped in exchange count, and filtered to prevent client injection of synthetic system messages.
- [ ] **Hidden token protocol integrity:** Tokens (`[LEAD:{...}]`, `[END_CALL]`) parsed in `/api/chat` are validated before trigger. Tokens must never leak into visible UI transcripts or TTS audio buffers.
- [ ] **Language detection & fallback:** Language auto-detection (`franc`) correctly aligns with Whisper STT language codes and OpenAI TTS voices without audio corruption.
- [ ] **Centralized model configuration:** OpenAI model (`gpt-4o-mini`, `tts-1-hd`, `whisper-1`) and provider fallbacks are configured centrally in `src/lib/ai/client.ts`.

---

## 4. Paid Endpoints & Cost Controls

- [ ] `/api/transcribe`: Audio size and duration caps enforced; temporary audio files in OS tmp directory are unlinked in `finally` blocks.
- [ ] `/api/speak`: Input character length capped; TTS provider and voice parameters are strictly tenant-controlled.
- [ ] `/api/chat` & `/api/summarize`: Explicit `max_tokens` and timeouts (`TTS_TIMEOUT_MS = 30_000`, `CHAT_TIMEOUT_MS`) prevent hanging connections and runaway token billing.
- [ ] **Per-tenant rate limiting:** Rate limiter (`src/lib/tenants/runtime-access.ts`) enforces rate limits per subscription tier (`free`, `starter`, `growth`, `enterprise`).
- [ ] **Summarization idempotency:** Call completion (`/api/summarize`) cannot be called repeatedly to generate duplicate lead emails or billing events.

---

## 5. Tenant Database Routing & Data Isolation

- [ ] **Dynamic tenant database routing:** `src/lib/db/conversation-store.ts` connects to tenant's dedicated database URL (from `tenant_secrets`). Records for tenant A must never cross into tenant B.
- [ ] **Graceful platform store fallback:** If a tenant's database is unreachable (e.g., Atlas IP Access List restrictions), conversations fall back to the platform store with warning logs so customer leads are never dropped.
- [ ] **Connection pooling & caching:** Tenant MongoClients are cached by hashed connection URI on `globalThis` to prevent connection leaks during serverless/SSR execution.
- [ ] **Personal data inventory:** Identify where customer voice transcripts, names, phone numbers, and emails are persisted, retention policies, and third-party data egress (OpenAI, ElevenLabs, SMTP).

---

## 6. UI, Voice Streaming & Autoplay Resilience

- [ ] **Browser autoplay policy resilience:** `useAudioPlayer` and `useVoiceAgent` handle `NotAllowedError` gracefully without transitioning the widget to an error state.
- [ ] **Gesture auto-unlock & replay:** Pre-buffered greeting audio immediately unlocks upon first click, touch, or keypress; transcript bubbles include a manual "Listen" button.
- [ ] **Audio blob memory management:** Audio URLs (`URL.createObjectURL`) are properly revoked after playback without causing `net::ERR_FILE_NOT_FOUND` playback races.
- [ ] **Responsive & accessible widget:** Keyboard navigation, contrast ratios (WCAG AA), push-to-talk mic accessibility, and responsive layouts across desktop and mobile.

---

## 7. Operations, CI/CD & Supply Chain

- [ ] **Automated lint and typecheck:** `npx tsc --noEmit` and `npm run lint` must pass cleanly.
- [ ] **Docker security:** Multi-stage Docker build, non-root user execution, minimal dependencies in runtime layer, explicit health checks.
- [ ] **Logging sanitization:** Server logs (`console.info`, `console.warn`) must never log decrypted secrets, raw API keys, passwords, or PII.
- [ ] **Dependencies:** Review `package.json` dependencies for known vulnerabilities (`npm audit`) and unneeded legacy packages.

---

## 8. Looks Wrong but Is Fine

- Dynamic fallback to `src/data/tenants.json` when MongoDB is disconnected or undergoing setup.
- Bootstrapping `process.env.OPENAI_API_KEY` in memory from the default tenant's encrypted secret.
- Platform store fallback in `conversation-store.ts` when a tenant's external MongoDB Atlas cluster is offline.
- Browser blocking unmuted greeting autoplay on cold page load before user interaction.
- `export { OPTIONS }` re-exported from `src/lib/utils/cors.ts` on public API routes.
