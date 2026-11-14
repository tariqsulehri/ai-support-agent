# Audit config: ai-support-agent

Pre-filled for the Audit Kit at `/Users/tk-lpt-1088/development/node/VoiceAgent/audit/kit` (kit version in `kit/VERSION`).
Fields follow `kit/config.template.md`.

| Field | Value |
|---|---|
| `PRODUCT` | ai-support-agent: multi-tenant, embeddable AI voice and text customer support agent with hands-free voice streaming (Whisper STT, GPT-4o-mini, OpenAI/ElevenLabs TTS), multi-language auto-detection, lead capture & call summarization, tenant-isolated MongoDB database routing with AES-256-GCM encrypted secrets, and admin console. Package name `voiceagent`. |
| `REPOS` | `/Users/tk-lpt-1088/development/node/VoiceAgent` (one repo, one git) |
| `BRANCH` | `master`. Never use `main` as a base. The working tree is audited as-is; record both `git rev-parse --short HEAD` and the list from `git status --short` in `run.json`. |
| `MODE` | `AUDIT-ONLY` unless a prompt says otherwise |
| `DEPTH` | `standard` unless a prompt says otherwise |
| `INCLUDE` | `src/` (app, components, hooks, lib, data, cli, scripts, types, `middleware.ts`, `instrumentation.ts`), `next.config.ts`, `vercel.json`, `Dockerfile`, `deployment/` (Dockerfile, compose, shell scripts), `.dockerignore`, `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `public/` (embed scripts, assets), `configurations.md`, `documents/` |
| `EXCLUDE` | `node_modules`, `.next`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `audit/` (kit, results, branding), `outputs/`, `.claude/`, `src/generated/prisma`. **Never connect to live databases or decrypt live secrets during audit** (see safety rules). |
| `DIMENSIONS` | all: security, ai-llm, architecture, data, performance, reliability, observability, testing, cicd-supply-chain, dependencies, accessibility, ux-design, cost, compliance, code-health, documentation |
| `COMPLIANCE` | None formally declared. The product handles **personal customer data**: voice audio, transcripts, names, phone numbers, emails, customer requirements. Use GDPR/PECA-style principles as the yardstick (data minimisation, retention, purpose, processor disclosure, tenant data isolation). |
| `OUTPUT_DIR` | `/Users/tk-lpt-1088/development/node/VoiceAgent/audit/results/ai-support-agent` (gitignored; never commit reports) |
| `PREVIOUS_RUN` | none yet. After the first run, put its folder here. |
| `GENERATE_STACK_DRAFT` | `false` (modules exist: `nextjs`, `react`, `mongodb-native`, `llm-voice-providers`, `docker-cicd`) |
| `TEAM_SIZE` | 1 (the owner) |
| `RELEASE_CADENCE` | as needed; image built on VM and pushed to Docker Hub, or deployed to Vercel |
| `CONFIDENTIALITY` | Confidential. Reports describe weaknesses, encryption schemas, and tenant names. |
| `BUDGET` | none |
| `Project module` | `/Users/tk-lpt-1088/development/node/VoiceAgent/audit/project-standards.md`. Load it at Stage 3 with the stack modules. |

## Hard safety rules for this project

1. **Production database.** `.env` / `.env.local` hold `MONGODB_URI` and tenant database connection strings. Never connect to live MongoDB instances during a read-only audit. Read models, schemas, and queries as plain files.
2. **Platform encryption key.** `PLATFORM_ENCRYPTION_KEY` in `.env` is used to encrypt and decrypt tenant secrets (OpenAI keys, database URLs, SMTP passwords). Never output or expose decrypted tenant secrets.
3. **Paid and outbound services.** Never call OpenAI, ElevenLabs, or SMTP during audit. Do not run `npm run cli:voice`, `npm run cli:text`, `npm run dev` with real keys, or trigger routes that send email.
4. **Secrets in reports.** Never print raw values from `.env*`, `src/data/tenants.json` (`token`, `apiKeys`, `openaiApiKey`), or encrypted database records. Show variable names and at most the first 4 characters. If a live key is in a git-tracked file, report it as a finding.
5. **Commands.** Allowed without asking, read-only: `git log`, `git status`, `git ls-files`, `git diff`, `npm ls`, `npx tsc --noEmit`, `npm run lint`. Allowed only after Checkpoint A: `npm audit --json` / `osv-scanner` (network), `npm run build` (writes `.next/`). Never `npm install` / `npm update` (changes the lockfile).
6. **Audit folder layout.** `audit/kit/` is the kit, `audit/results/ai-support-agent/` holds runs (gitignored), and `audit/ai-support-agent-branding/` holds the brand guidelines and logos. Nothing else belongs in `audit/`.

## Known and accepted (do not flag; owner to confirm at Checkpoint A)

| Item | Reason |
|---|---|
| Fallback tenants in `src/data/tenants.json` | Used as graceful fallback when MongoDB is unavailable or unconfigured. Real tenants load dynamically from MongoDB `tenants` and `tenant_agent_settings`. |
| Dynamic OpenAI Key bootstrapping | `DEFAULT_TENANT_ID` loads OpenAI key dynamically from MongoDB `tenant_secrets` on boot into memory. |
| Tenant-isolated database routing | Calls are saved to the tenant's dedicated database URL (from `tenant_secrets`), with graceful fallback to the platform database to avoid data loss if tenant DB is unreachable. |
| In-request call summarization & email delivery | Summaries and notification emails run at call end. Report reliability or timeout implications if real, not the absence of a background queue. |
| Browser autoplay restriction handling | Browsers require a user gesture before unmuted audio playback. Handled via gesture listeners, push-to-talk mic, and interactive replay buttons. |
| Default model `gpt-4o-mini` | Cost and latency choice for fast voice conversations. |

## Decisions already made (do not reopen)

- Hidden token protocol (`[LEAD:{...}]`, `[END_CALL]`) is the contract between the prompt and `/api/chat`. Check that it is parsed safely and cannot be forged; do not propose replacing it with tool calls as a finding.
- The agent language mode supports auto-detection via `franc` with fallback to tenant-configured language.
- Multi-tenant security relies on server-side resolution via `tenantId + token`, `x-api-key`, `Referer` domain, or `DEFAULT_TENANT_ID`.
- Admin console is located under `/admin` with username/password authentication and session cookie management.

## Context the agent should know

- **Actual stack (verify in Stage 0):** Next.js 15 App Router, React 19, TypeScript, Tailwind 3, Zod. Data: **MongoDB via official Node.js driver v7** (`src/lib/db/mongodb.ts`, `src/lib/db/conversation-store.ts`). AI: OpenAI SDK v4 (Whisper STT, `gpt-4o-mini` chat via SSE and completions, OpenAI TTS `nova`), optional ElevenLabs TTS, `franc` language detection. Email: nodemailer (SMTP). Auth: Admin session cookie, password hashing (`src/lib/auth/password.ts`), embed security tokens. Encryption: AES-256-GCM via `src/lib/security/encryption.ts`.
- **Entry points:**
  - Pages: `/voice` (voice & text chat widget), `/admin/login`, `/admin/tenants`, `/admin/tenants/[tenantId]`, `/admin/users`, `/admin/dashboard`, `/`
  - Embed loader: `/src/app/agent.js`
  - API routes: `/api/config`, `/api/chat`, `/api/transcribe`, `/api/speak`, `/api/summarize`, `/api/conversation`, `/api/embed/session`, `/api/admin/auth/login`, `/api/admin/auth/logout`
  - CLI: `src/cli/voice.ts` (hands-free audio via Sox & afplay), `src/cli/text.ts` (terminal text chat)
  - Scripts: `src/scripts/migrate-tenants.ts`, `src/scripts/migrate-openai-secrets.ts`, `src/scripts/set-tenant-openai-secret.ts`, `src/scripts/migrate-tenant-conversations.ts`, `src/scripts/create-auth-user.ts`
- **Deployment:** Two targets. (a) Vercel (`vercel.json`). (b) Docker on VM: `deployment/Dockerfile`, `docker-compose.yml`, shell scripts.
- **Critical flows to trace in Stage 3:**
  1. Embed boot & config → `/api/config` + dynamic tenant secret resolution.
  2. Voice recording → `/api/transcribe` → `/api/chat` (SSE stream) → `/api/speak` (TTS buffer).
  3. Call completion → `/api/summarize` → Lead extraction + email notification + tenant database write.
  4. Admin login & session → `/api/admin/auth/login` → session cookie → `/admin/*` middleware & route guards.
  5. Tenant management & secrets → `/admin/tenants/[tenantId]` → AES-256-GCM encryption in `tenant_secrets`.
