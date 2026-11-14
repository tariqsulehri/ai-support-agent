# Project module: ai-support-agent

**Status:** Updated for `ai-support-agent` (Next.js 15, React 19, MongoDB Native Driver v7, OpenAI SDK v4) on 2026-11-14.  
**Loads with dimensions:** security, ai-llm, architecture, data, reliability, cost, compliance, testing, code-health, ux-design, accessibility, documentation.  
**Stack modules applied:** `nextjs`, `react`, `mongodb-native`, `llm-voice-providers`, `docker-cicd`.  
**How it is used:** Load it at Stage 3 with the stack modules. A failed item below is recorded as a finding, with this file and the item number as the reference.

---

## 1. Multi-Tenant Architecture & Request Resolution

- [ ] **1.1 Server-side tenant resolution:** Every API route (`src/app/api/**/route.ts`) must resolve tenant context on the server via `requireTenantRuntime` or `getTenantFromRequest`. No route may trust an unvalidated client-provided tenant ID from the request body.
- [ ] **1.2 Resolution priority order:** Tenant resolution must strictly follow:
  1. Verified Embed Session Token (`x-embed-session` or query `session`, verified via `verifyEmbedSessionToken`).
  2. Embed Token (`x-embed-token` or query `token`, verified against SHA-256 hash `tokenHash` in `tenant_embed_keys`).
  3. API Key (`x-api-key`, verified against `apiKeyHashes` in `tenant_embed_keys`).
  4. Domain Origin (`x-embed-parent` or `Referer`, verified against `tenant_domains` where `status: 'active'` and `verificationStatus: 'verified'`).
  5. Default Tenant Fallback (`DEFAULT_TENANT_ID`, defaults to `'ai-scripto'`).
- [ ] **1.3 Tenant status enforcement:** Inactive tenants (`disabled`, `suspended`, `pending`, `archived`) in MongoDB `tenants` collection must be blocked by `isActiveTenantStatus()` and return 401/403/blocked results. Disabled tenants must not fall back to active credentials.
- [ ] **1.4 Subscription & rate limiting enforcement:** When enabled, `requireTenantRuntimeAccess` in `src/lib/tenants/runtime-access.ts` must enforce subscription active state and plan rate limits (`free: 30`, `starter: 90`, `growth: 240`, `enterprise: 900` requests/min).
- [ ] **1.5 Constant-time credential verification:** All credential hash comparisons in `src/lib/tenants/hash.ts` and `src/lib/auth/session.ts` must use `crypto.timingSafeEqual` with matched buffer lengths to prevent timing attacks.
- [ ] **1.6 Safe configuration disclosure:** `/api/config` response must return strictly client-facing widget fields (`agentName`, `companyName`, `language`, `voice`, `greeting`, `ttsProvider`). Never expose knowledge base content, email recipient lists, database URLs, or API keys.

---

## 2. Secrets Encryption at Rest & Dynamic Bootstrapping

- [ ] **2.1 AES-256-GCM encryption at rest:** All tenant secrets (`openai_api_key`, `database_url`, `smtp_password`) stored in the `tenant_secrets` collection must be encrypted using AES-256-GCM (`src/lib/security/encryption.ts`) with a 12-byte random IV, 16-byte auth tag, key versioning, and SHA-256 value fingerprinting.
- [ ] **2.2 Platform encryption key safety:** `PLATFORM_ENCRYPTION_KEY` must never be hardcoded, logged, or sent to the client. If absent or under 32 bytes, secret encryption/decryption must fail fast.
- [ ] **2.3 Dynamic OpenAI key bootstrapping:** On server startup (`src/instrumentation.ts`) and CLI execution (`src/cli/voice.ts`, `src/cli/text.ts`), `bootstrapDefaultTenantOpenAIKey()` loads the OpenAI key dynamically from `tenant_secrets` in MongoDB into memory. Plaintext keys must not be required in `.env`.
- [ ] **2.4 Secret masking in outputs:** All secret queries and admin metadata endpoints (`/api/admin/tenants/*`) must return only `maskedValue` (e.g. `sk-p...vNQA`, `mong...dmin`) and never reveal raw ciphertexts or decrypted plaintexts.
- [ ] **2.5 No secrets in git:** Confirm `git ls-files` tracks no live `.env`, `.env.local`, `dev.db`, or plaintext API keys in `src/data/tenants.json`.

---

## 3. Tenant-Isolated Database Routing & Data Isolation

- [ ] **3.1 Dynamic database routing:** In `src/lib/db/conversation-store.ts`, call records for tenants with a configured `database_url` secret must connect to and persist in the tenant's dedicated database (`source: 'tenant'`).
- [ ] **3.2 Graceful fallback preservation:** If a tenant's database connection throws an error (e.g. MongoDB Atlas TLS handshake alert 80 due to un-whitelisted IP), `getConversationStoreForTenant` must catch the error, log a warning, and gracefully fall back to the platform database (`source: 'internal'`) so leads and transcripts are never lost.
- [ ] **3.3 Connection pooling & caching:** Dynamic `MongoClient` instances for tenant databases must be cached on `globalThis.__voiceAgentTenantMongoClients` by URI hash to prevent connection storms and socket exhaustion during serverless/SSR execution.
- [ ] **3.4 Idempotent snapshot and summary writes:** `saveCallRecord` and `saveConversationSnapshot` in `src/lib/db/call-records.ts` must use `updateOne({ 'tenant.id': tenant.id, conversationId }, { $set, $setOnInsert }, { upsert: true })` to prevent duplicate conversation documents upon network retries.
- [ ] **3.5 Required database indexes:** Ensure `ensureTenantRegistryIndexes()` and `ensureConversationIndexes()` create compound indexes on:
  - `conversations`: `{ 'tenant.id': 1, createdAt: -1 }`, `{ 'tenant.id': 1, status: 1, createdAt: -1 }`, `{ status: 1, updatedAt: -1 }`.
  - `tenants`: unique on `tenantId`, `publicId`, `slug`.
  - `tenant_domains`: unique on `{ tenantId, origin }`.
  - `tenant_secrets`: unique on `{ tenantId, kind }`.

---

## 4. Voice Pipeline, Audio Streaming & Browser Autoplay Resilience

- [ ] **4.1 Autoplay policy resilience:** In modern browsers (Chrome, Safari, Edge), unmuted `audio.play()` is blocked on page load without user gesture (`NotAllowedError`). `useAudioPlayer` and `useVoiceAgent` must catch this without entering an error state (`phase: 'error'`), keep the agent `phase: 'idle'` (green `● Online`), and buffer the audio.
- [ ] **4.2 Instant gesture unlock & replay:** Pre-buffered greeting audio must play automatically upon the user's first document interaction (`click`, `pointerdown`, `keydown`, `touchstart`). In addition, assistant bubbles in `TranscriptPanel` must render an on-demand "Listen" button with a speaker icon.
- [ ] **4.3 Audio blob URL lifecycle:** In `useAudioPlayer`, `URL.createObjectURL(blob)` must not be prematurely revoked while the browser audio element is decoding. Audio elements must pause and detach (`audio.removeAttribute('src'); audio.load()`) with a 10s delay before calling `URL.revokeObjectURL(url)` to prevent `net::ERR_FILE_NOT_FOUND` errors.
- [ ] **4.4 Audio timeout boundaries:** Client TTS fetches must enforce a 30s timeout (`TTS_FETCH_TIMEOUT_MS = 30_000`) and cancel in-flight `AbortController` instances when audio is interrupted or stopped.
- [ ] **4.5 Push-to-talk & recording safety:** `useAudioRecorder` must request `navigator.mediaDevices.getUserMedia` only on user interaction, support both `audio/webm` and Safari `audio/mp4`, clean up media streams on stop, and handle mic denial gracefully.

---

## 5. LLM Streaming, Token Protocol & Prompt Injection Defense

- [ ] **5.1 Server-side prompt construction:** `buildSystemPrompt` in `src/lib/config/prompt.ts` is constructed on the server using validated tenant knowledge base entries, tone, services, and language instructions. The client cannot supply or override system prompts.
- [ ] **5.2 History validation & role restriction:** `/api/chat` validates `messages` with Zod (`ChatHistory`), accepts only `user` and `assistant` roles from clients, caps exchange history, and rejects any client-injected `system` messages.
- [ ] **5.3 Hidden token contract & leakage prevention:** Tokens (`[LEAD:{...}]`, `[END_CALL]`) parsed in `/api/chat` and `src/lib/ai/lead-tokens.ts` must be stripped via `stripTokens()` before text is streamed to the UI or synthesized to speech (`/api/speak`). Tokens must never be visible to callers.
- [ ] **5.4 Multi-language auto-detection:** `detectLanguage` (using `franc`) validates detected language against tenant `languageMode` and supported languages, correctly mapping Whisper codes (`en`, `ur`, `ar`, `es`, `fr`, etc.) and TTS voices.
- [ ] **5.5 SSE stream termination:** `/api/chat` streams SSE events with `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`. Aborts LLM completion streams if the client disconnects (`req.signal.aborted`).

---

## 6. Paid Endpoints, Rate Limiting & Cost Bounds

- [ ] **6.1 STT bounds (`/api/transcribe`):** Audio payload size and duration must be bounded; temporary files created during CLI/server processing must be cleaned up in `finally` blocks.
- [ ] **6.2 TTS bounds (`/api/speak`):** Text length must be capped; TTS voice and provider must resolve from tenant configuration (`resolveTenantTtsVoice`), never directly from unvalidated client parameters.
- [ ] **6.3 LLM token limits:** `/api/chat` and `/api/summarize` must specify explicit `max_tokens` (`gpt-4o-mini`: 80-250 tokens per turn) to prevent runaway generation.
- [ ] **6.4 Summarization idempotency:** `/api/summarize` cannot be called repeatedly to generate duplicate lead emails or billing usage records for the same conversation.
- [ ] **6.5 Observability telemetry:** `recordUsageEvent` in `src/lib/observability/usage.ts` logs aggregated counters (`chat.request`, `transcription.request`, `tts.request`, `conversation.completed`) in `tenant_usage_counters` without persisting PII.

---

## 7. Admin Authentication, Sessions & RBAC

- [ ] **7.1 Defense-in-depth on admin routes:** `src/middleware.ts` guards `/admin/tenants/:path*` and `/dashboard/:path*`. In addition, every admin API endpoint (`/api/admin/*`) must independently verify the session cookie.
- [ ] **7.2 Session token cryptography:** Admin sessions in `src/lib/auth/session.ts` use HMAC-SHA256 signatures (`AUTH_SECRET`), 8-hour expiration (`SESSION_TTL_SECONDS = 28800`), and constant-time signature comparison (`safeEqual`).
- [ ] **7.3 Password hashing:** Admin user passwords in `src/lib/auth/password.ts` must use salted `scrypt` hashing (`scryptSync` with 16-byte random salt, 64-byte key) and `timingSafeEqual`. Plain SHA-256 or unsalted passwords are prohibited.
- [ ] **7.4 Cookie security flags:** `app_session` cookie must be set with `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, and `secure: process.env.NODE_ENV === 'production'`.
- [ ] **7.5 Open redirect prevention:** Redirect parameters (`next`, `returnTo`) in `/admin/login` and `/tenant/login` must validate destination paths to prevent open redirect vulnerabilities.

---

## 8. Operations, Docker, Packaging & CI/CD

- [ ] **8.1 TypeScript & build checks:** Project must compile cleanly with `npx tsc --noEmit` and pass `npm run build` without type or syntax errors.
- [ ] **8.2 Docker configuration:** `Dockerfile` must use multi-stage builds (`deps`, `builder`, `runner`), run as non-root user `nextjs:nodejs` (uid 1001), leverage Next.js `standalone` output, and define healthcheck endpoints.
- [ ] **8.3 CSP & framing controls:** `next.config.ts` must define explicit `frame-ancestors` allowing only approved tenant domains, while restricting admin routes from being framed.
- [ ] **8.4 Log sanitization:** Console logs across the application must never print raw API keys, passwords, database URLs with embedded credentials, or full user phone numbers/emails.
- [ ] **8.5 Dependency hygiene:** Audit `package.json` for known vulnerabilities (`npm audit`) and clean up deprecated/unused legacy packages (e.g. unused Prisma remnants).

---

## 9. Looks Wrong but Is Fine

- Dynamic fallback to `src/data/tenants.json` when MongoDB is unconfigured or temporarily offline.
- Populating `process.env.OPENAI_API_KEY` in memory at boot from the default tenant's encrypted secret.
- Routing conversations to the platform database when a tenant's external MongoDB Atlas cluster is unreachable.
- Browser console logging `play() failed because the user didn't interact with the document first` on initial page load (browser autoplay security).
- Using `export { OPTIONS }` re-exported from `src/lib/utils/cors.ts` on public widget API routes.
- Using `gpt-4o-mini` with low `max_tokens` (80) for low-latency voice greetings and responses.
