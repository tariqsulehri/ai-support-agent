# Multi-Tenant Voice Agent Implementation Plan

## Objective

Convert the current Voice Agent into a secure multi-tenant platform where each tenant can be registered, configured, and embedded independently.

The target experience:

- Platform admin creates/registers a tenant.
- Tenant receives login access or invite link.
- Tenant configures company profile, OpenAI API key, database/integration settings, domains, and knowledge base.
- System validates configuration.
- Tenant receives a secure embed snippet for approved domains.
- Runtime agent uses tenant-specific settings, secrets, knowledge base, and storage rules.

## Current State

The codebase already has early tenant support:

- Tenant config exists in `src/data/tenants.json`.
- Runtime tenant resolution exists in `src/lib/tenants/registry.ts`.
- Embed auth exists in `src/lib/security/embed-auth.ts`.
- Chat, transcription, speech, and config APIs already resolve tenant context.
- Dashboard and call persistence already store basic tenant metadata.

Main production gaps:

- Tenant data is file-based instead of database-backed.
- Tenant tokens/API keys are plaintext in JSON.
- Tenant OpenAI keys are referenced through environment variables.
- Tenant admin login and onboarding do not exist yet.
- Embed script still depends on long-lived browser-visible tenant credentials.
- Dashboard is not tenant-user based.
- Knowledge base is stored directly in config and will not scale.

## Architecture Direction

Use two separate planes.

### 1. Platform Control Plane

This is the internal admin and tenant management system.

It owns:

- Tenant records
- Tenant users
- Tenant domains
- Tenant settings
- Encrypted secrets
- Knowledge base records
- Embed keys
- Usage events
- Audit logs

### 2. Tenant Runtime Plane

This serves the embedded voice agent.

It resolves every request by:

1. Tenant identifier or public embed key
2. Allowed domain
3. Tenant status
4. Runtime session validity
5. Tenant-specific configuration

Then it uses tenant-specific:

- OpenAI API key
- Company/profile settings
- Agent prompt
- Voice/TTS settings
- Knowledge base
- Persistence/integration rules

## Recommended Data Model

Core collections/tables:

- `tenants`
- `tenant_users`
- `tenant_domains`
- `tenant_agent_settings`
- `tenant_secrets`
- `tenant_embed_keys`
- `tenant_knowledge_entries`
- `tenant_knowledge_chunks`
- `tenant_usage_events`
- `tenant_audit_logs`

Suggested tenant statuses:

- `pending`
- `active`
- `suspended`
- `disabled`

Suggested user roles:

- `platform_admin`
- `tenant_owner`
- `tenant_admin`
- `tenant_viewer`

## Security Principles

- Never store OpenAI API keys or tenant DB URLs in plaintext.
- Never expose private tenant tokens in browser snippets.
- Hash passwords with `argon2` or `bcrypt`.
- Encrypt tenant secrets with AES-GCM or managed KMS.
- Use public embed keys plus domain validation for browser embeds.
- Use short-lived signed embed sessions for runtime calls.
- Enforce tenant status before serving chat/transcribe/speak APIs.
- Add rate limits per tenant and per domain.
- Add audit logs for login, secret changes, domain changes, and snippet generation.
- Scope all dashboard and API data by `tenantId`.

## Recommended Embed Model

Tenant-facing snippet should look like this:

```html
<script
  src="https://agent.yourdomain.com/agent.js"
  data-tenant="tenant_public_id"
  data-client-key="public_embed_key">
</script>
```

The browser-visible key should be public and domain-bound. It should not grant admin access and should not directly reveal OpenAI keys, tenant secrets, or database credentials.

The runtime flow:

1. Customer page loads `/agent.js`.
2. Script reads `data-tenant` and `data-client-key`.
3. Script opens iframe.
4. Backend verifies tenant, key, and parent domain.
5. Backend issues short-lived signed embed session.
6. Chat, speech, transcription, and config APIs require that session.

## Phase 1: Database-Backed Tenant Registry

Goal: Replace file-based tenant config with persistent tenant records while keeping the current agent runtime working.

This phase should not introduce the full tenant portal yet. It should create the foundation that later phases will use.

### Phase 1 Scope

Included:

- Keep `tenants.json` as temporary fallback during migration.
- Add database-backed tenant, settings, domain, and embed key records.
- Add tenant registry service that reads from database first.
- Add migration script from `src/data/tenants.json`.
- Update runtime tenant resolution without changing public API behavior.
- Add tests for tenant lookup and fallback behavior.

Not included:

- Tenant login.
- Tenant admin portal.
- OpenAI key capture UI.
- Encrypted secret management UI.
- Billing.
- RAG/vector knowledge base.

### Current Files To Replace Or Extend

- `src/data/tenants.json`
- `src/lib/tenants/types.ts`
- `src/lib/tenants/registry.ts`
- `src/lib/security/embed-auth.ts`
- `src/app/api/config/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/transcribe/route.ts`
- `src/app/api/speak/route.ts`
- `src/app/api/summarize/route.ts`
- `src/lib/db/mongodb.ts`

### Proposed Collections

Because the project already uses MongoDB, Phase 1 can use MongoDB collections first. We can move to Prisma/Postgres later only if product direction requires it.

#### `tenants`

Stores tenant identity and lifecycle state.

Example:

```json
{
  "_id": "ObjectId",
  "tenantId": "ai-scripto",
  "publicId": "tn_ai_scripto_abc123",
  "slug": "ai-scripto",
  "companyName": "AI-Scripto Automations",
  "status": "active",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Required indexes:

- Unique `tenantId`
- Unique `publicId`
- Unique `slug`
- Index `status`

#### `tenant_agent_settings`

Stores runtime agent configuration.

Example:

```json
{
  "_id": "ObjectId",
  "tenantId": "ai-scripto",
  "agentName": "Support Agent",
  "companyName": "AI-Scripto Automations",
  "languageMode": "english",
  "supportedLanguages": ["english"],
  "tone": "friendly, expert, and solution-oriented",
  "ttsProvider": "openai",
  "ttsVoice": "nova",
  "voiceProfile": {
    "gender": "female",
    "style": "warm, calm, professional"
  },
  "services": [
    "Custom Software Development",
    "AI Solutions"
  ],
  "greeting": "Hello! I'm your support agent from AI-Scripto Automations. How can I help you today?",
  "customInstructions": "Focus on startup clients.",
  "knowledgeBase": [
    {
      "topic": "Pricing",
      "content": "We offer custom quotes based on project scope."
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Required indexes:

- Unique `tenantId`

#### `tenant_domains`

Stores allowed domains/origins for embed validation.

Example:

```json
{
  "_id": "ObjectId",
  "tenantId": "ai-scripto",
  "origin": "https://www.aiscripto.com",
  "status": "active",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Required indexes:

- Unique compound `tenantId + origin`
- Index `origin`
- Index `status`

#### `tenant_embed_keys`

Stores temporary compatibility keys for existing embed auth.

In Phase 1, we can still support the current tenant/token model so existing embeds do not break. In Phase 5 this should move to public embed keys and short-lived sessions.

Example:

```json
{
  "_id": "ObjectId",
  "tenantId": "ai-scripto",
  "tokenHash": "sha256 hash of current token",
  "apiKeyHashes": ["sha256 hash of api key"],
  "status": "active",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Required indexes:

- Index `tenantId`
- Index `status`

### Tenant Runtime Shape

The app currently expects `TenantConfig`. Keep that interface stable in Phase 1.

Create a mapper:

```ts
function toTenantConfig(input: {
  tenant: TenantRecord
  settings: TenantAgentSettingsRecord
  domains: TenantDomainRecord[]
  embedKeys: TenantEmbedKeyRecord[]
}): TenantConfig
```

This lets runtime routes continue using:

- `tenant.id`
- `tenant.companyName`
- `tenant.agentName`
- `tenant.allowedDomains`
- `tenant.knowledgeBase`
- `tenant.openaiApiKeyEnv`
- `tenant.ttsProvider`
- `tenant.ttsVoice`

### Registry Service Contract

Replace the static registry with async DB-backed functions.

Recommended API:

```ts
export async function getTenantById(id: string): Promise<TenantConfig | null>
export async function getTenantByPublicId(publicId: string): Promise<TenantConfig | null>
export async function getTenantByApiKey(apiKey: string): Promise<TenantConfig | null>
export async function getTenantByDomain(url: string): Promise<TenantConfig | null>
export async function getDefaultTenant(): Promise<TenantConfig | null>
export async function getAllTenants(): Promise<TenantConfig[]>
export async function resolveTenantFromHeaders(
  h: ResolutionHeaders,
  options?: ResolutionOptions
): Promise<TenantConfig | null>
```

Because the current routes call the registry synchronously, update the call sites to `await`.

Affected files:

- `src/lib/security/embed-auth.ts`
- `src/app/api/config/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/transcribe/route.ts`
- `src/app/api/speak/route.ts`
- `src/app/api/summarize/route.ts`

### Fallback Strategy

Phase 1 should be safe to deploy before the migration is complete.

Lookup order:

1. Try database tenant registry.
2. If database is unavailable or tenant is not found, fallback to `src/data/tenants.json`.
3. Log fallback usage with tenant ID and reason.
4. Do not fallback if database tenant exists but is `suspended` or `disabled`.

This gives us a low-risk rollout.

### Migration Script

Add a script:

```bash
npm run tenants:migrate
```

Recommended file:

- `src/scripts/migrate-tenants.ts`

Migration behavior:

- Read `src/data/tenants.json`.
- Upsert each tenant into `tenants`.
- Upsert each tenant config into `tenant_agent_settings`.
- Upsert each allowed domain into `tenant_domains`.
- Hash existing `token` and `apiKeys` into `tenant_embed_keys`.
- Do not store raw token/API key in database.
- Print summary:
  - tenants created
  - tenants updated
  - domains created
  - embed keys created
  - validation errors

### Validation Rules

Tenant records:

- `tenantId` is required.
- `tenantId` must be lowercase kebab-case.
- `companyName` is required.
- `status` must be one of `pending`, `active`, `suspended`, `disabled`.

Domain records:

- Must be valid URL origin.
- Must be `http://localhost:*` only for local development.
- Production domains must use HTTPS.
- Store normalized origin only, not full URL path.

Agent settings:

- `agentName` is required.
- `companyName` is required.
- `ttsProvider` must be `openai` or `elevenlabs`.
- `ttsVoice` is required.
- `services` must have at least one item.
- `knowledgeBase` entries must have `topic` and `content`.

### Phase 1 Implementation Steps

1. Add database record types.
2. Add MongoDB collection helpers.
3. Add hash utility for existing tokens/API keys.
4. Add tenant mapper from DB records to `TenantConfig`.
5. Add DB-backed registry functions.
6. Keep JSON registry fallback.
7. Convert `embed-auth.ts` to async tenant resolution.
8. Convert affected API routes to await auth and tenant lookup.
9. Add tenant migration script.
10. Add package script for migration.
11. Add tests or verification script for tenant lookup.
12. Run migration locally.
13. Verify existing tenants still work.
14. Deploy with fallback enabled.
15. Monitor fallback logs.

### Acceptance Criteria

- Existing tenants from `tenants.json` can be migrated into MongoDB.
- `/api/config` returns the same response for an existing tenant before and after migration.
- `/api/chat` resolves the correct tenant from headers.
- `/api/transcribe` resolves the correct tenant from headers.
- `/api/speak` resolves the correct tenant from headers.
- `/api/summarize` resolves the correct tenant from headers.
- Domain lookup works from normalized origin.
- Unknown tenant returns the same behavior as today.
- Suspended/disabled tenants are not served from the database.
- Raw tokens and API keys are not stored in database.
- JSON fallback can be removed later without changing route behavior.

### Risks

- Current registry is synchronous, so async conversion touches several route files.
- Current token comparison uses plaintext tokens; Phase 1 should hash stored tokens but must still compare incoming token safely.
- If fallback is too permissive, a disabled DB tenant might still work from JSON. Avoid fallback when the tenant exists in DB with inactive status.
- If domains are not normalized, tenant lookup may fail for URLs with paths, query strings, or trailing slashes.

### Phase 1 Done Means

Phase 1 is complete when the app no longer depends on `tenants.json` as the primary tenant source and runtime APIs work from database-backed tenant records.

`tenants.json` may remain only as a temporary fallback until Phase 2 or Phase 3.

### Deliverables

- DB tenant registry.
- Migration path from existing JSON tenants.
- Tenant lookup by ID, domain, and embed key.
- Async tenant resolver wired into runtime APIs.
- Compatibility fallback for current tenants.
- Preserve current runtime API behavior.
- Verification checklist proving existing embeds still work.

## Phase 2: Secret Storage and Key Management

Goal: Securely store tenant OpenAI keys and optional database URLs.

### Phase 2 Scope

Included:

- Add encryption utility for tenant secrets.
- Add platform encryption key environment variable.
- Store tenant OpenAI API keys encrypted in MongoDB.
- Add masked secret metadata.
- Add server-side OpenAI key validation utility.
- Add CLI tools for migrating and setting tenant OpenAI secrets.
- Make runtime OpenAI client prefer encrypted tenant secret, with env fallback.

Not included yet:

- Tenant-facing secret UI.
- Unauthenticated secret write APIs.
- Tenant DB URL runtime integration.
- Secret rotation workflow.

### Secret Storage Design

Collection:

- `tenant_secrets`

Secret kinds:

- `openai_api_key`
- `database_url`

Encryption:

- AES-256-GCM
- Per-secret random IV
- Stored auth tag
- Stored key version
- SHA-256 fingerprint for change detection
- Masked display value only, never plaintext

Required environment variable:

```bash
PLATFORM_ENCRYPTION_KEY=replace-with-32-plus-character-secret
```

Preferred value format:

- base64-encoded 32 bytes, or
- 64-character hex, or
- 32+ character high-entropy string

### Runtime Key Resolution

OpenAI client key priority:

1. Decrypted tenant secret from `tenant_secrets`
2. Tenant env var from `openaiApiKeyEnv`
3. Global `OPENAI_API_KEY`

This keeps existing tenants working while allowing secure DB-backed keys.

### Operational Commands

Migrate OpenAI keys from existing tenant env vars:

```bash
npm run tenants:secrets:migrate-openai
```

Set one tenant OpenAI key:

```bash
TENANT_ID=tkxel TENANT_OPENAI_API_KEY=sk-... npm run tenants:secret:set-openai
```

Set one tenant OpenAI key and validate it with OpenAI first:

```bash
TENANT_ID=tkxel TENANT_OPENAI_API_KEY=sk-... VALIDATE_OPENAI_KEY=true npm run tenants:secret:set-openai
```

Alternative tenant argument:

```bash
TENANT_OPENAI_API_KEY=sk-... npm run tenants:secret:set-openai -- --tenant=tkxel
```

### Phase 2 Implementation Steps

1. Add `PLATFORM_ENCRYPTION_KEY`.
2. Add AES-GCM encryption/decryption helper.
3. Add `tenant_secrets` collection type.
4. Add tenant secret repository.
5. Add secret indexes.
6. Add masked metadata output.
7. Add OpenAI key validation utility.
8. Add OpenAI secret migration command.
9. Add single-tenant OpenAI secret set command.
10. Load decrypted OpenAI secret during DB tenant lookup.
11. Attach decrypted key only to server-side runtime tenant config.
12. Update OpenAI client priority.
13. Keep env fallback for safe rollout.

### Acceptance Criteria

- OpenAI keys can be encrypted and stored in `tenant_secrets`.
- Raw OpenAI keys are not stored in tenant JSON.
- Raw OpenAI keys are not logged.
- Runtime can use encrypted tenant OpenAI key.
- Runtime still works if encrypted key is missing but existing env var exists.
- Missing or invalid encryption key does not expose plaintext secrets.
- Build and TypeScript checks pass.

Deliverables:

- Encrypted tenant secrets.
- Secure OpenAI client creation from tenant secret.
- No raw tenant API keys in JSON, logs, URLs, or browser code.
- CLI migration and set commands for OpenAI tenant secrets.

## Phase 3: Admin and Tenant Authentication

Goal: Replace basic dashboard password with user-based access.

### Phase 3 Scope

Included:

- Add tenant user model.
- Add password hashing.
- Add login/logout.
- Add session management.
- Add role-based authorization.
- Scope dashboard data by tenant.
- Add first-user CLI creation command.

Not included yet:

- Full tenant invite email flow.
- Password reset email flow.
- Tenant settings UI.
- User management UI.

### User Model

Collection:

- `tenant_users`

Roles:

- `platform_admin`
- `tenant_owner`
- `tenant_admin`
- `tenant_viewer`

Status:

- `active`
- `disabled`

Password storage:

- Node.js `scrypt`
- Per-user random salt
- Timing-safe password verification

### Session Model

Session storage:

- Signed HTTP-only cookie
- SameSite `lax`
- Secure in production
- 8-hour session TTL

Session secret:

```bash
AUTH_SECRET=replace-with-32-plus-character-secret
```

If `AUTH_SECRET` is not set, the app can use `PLATFORM_ENCRYPTION_KEY` for session signing. Production should set both separately.

### Dashboard Access

Platform admin:

- Can view all dashboard records.
- Can mutate all lead status and management fields.

Tenant users:

- Can view only records where `tenant.id` matches their `tenantId`.
- `tenant_owner` and `tenant_admin` can mutate their own tenant records.
- `tenant_viewer` can view but cannot mutate dashboard records.

### Operational Commands

Create first platform admin:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='replace-with-long-password' ADMIN_NAME='Platform Admin' npm run auth:user:create
```

Create tenant admin:

```bash
ADMIN_EMAIL=owner@tenant.com ADMIN_PASSWORD='replace-with-long-password' ADMIN_ROLE=tenant_admin ADMIN_TENANT_ID=tkxel npm run auth:user:create
```

Login URL:

```text
/admin/login
```

Protected dashboard:

```text
/dashboard
```

### Phase 3 Implementation Steps

1. Add auth user record types.
2. Add password hashing and verification helper.
3. Add signed session cookie helper.
4. Add auth user repository.
5. Add user creation script.
6. Add login route.
7. Add logout route.
8. Add login page.
9. Replace Basic Auth dashboard middleware with session-cookie redirect.
10. Verify session server-side on dashboard and export routes.
11. Add dashboard analytics tenant scope.
12. Add tenant-scoped dashboard mutation queries.

### Acceptance Criteria

- `/dashboard` redirects to `/admin/login` when not signed in.
- Platform admin can see all dashboard records.
- Tenant users can see only their tenant records.
- Tenant viewer cannot mutate lead records.
- Tenant owner/admin can mutate only their own tenant records.
- Passwords are never stored in plaintext.
- Sessions are signed and HTTP-only.
- Build and TypeScript checks pass.

Deliverables:

- Platform admin login.
- Tenant login.
- Role-based access.
- Tenant-isolated dashboard.
- First admin creation command.

## Phase 4: Tenant Onboarding Wizard

Goal: Make tenant setup smooth and self-service.

Status: initial browser-based tenant management is implemented.

Wizard steps:

1. Company profile
2. Agent personality and greeting
3. OpenAI API key
4. Voice/TTS settings
5. Allowed domains
6. Knowledge base
7. Preview
8. Embed snippet

Tasks:

- Build tenant setup pages. Done for platform tenant creation and tenant detail settings.
- Add company name, title, brand color, and agent name fields. Company and agent fields are done; title/brand color remain.
- Add OpenAI API key form with validation. Secure storage is done; live OpenAI validation remains.
- Add domain whitelist management. Done.
- Add knowledge base CRUD. Basic textarea management is done; full CRUD remains for Phase 7.
- Add agent preview inside admin. Remaining.
- Add setup progress/status. Remaining.
- Generate tenant embed snippet only after required setup is complete. Basic snippet is available; stricter completion gating remains.

Implemented files:

- `src/lib/tenants/management.ts`
- `src/app/admin/tenants/page.tsx`
- `src/app/admin/tenants/[tenantId]/page.tsx`
- `src/lib/auth/users.ts`
- `src/app/dashboard/page.tsx`

Current Phase 4 capabilities:

- Platform admin can open `/admin/tenants`.
- Platform admin has tabbed tenant views for active tenants, tenant creation, subscriptions, and archived tenants.
- Platform admin can create a tenant from the browser.
- Tenant creation stores company/agent settings, allowed domains, services, greeting, embed token hash, and optional tenant admin user.
- Tenant owner/admin adds encrypted OpenAI key and database URL from tenant settings.
- Platform admin can view masked tenant secret metadata but cannot add or replace tenant-owned secrets.
- Tenant creation stores initial subscription status, plan type, and billing cycle.
- Platform admin can archive a tenant. Archived tenants are blocked from runtime usage because only `active` tenants are served.
- Platform admin can reactivate an archived tenant.
- Platform admin can update tenant subscription status, subscription type, billing cycle, seats, and expiry date.
- Platform admin can open `/admin/tenants/[tenantId]` to manage settings.
- Tenant owner/admin can open their own tenant settings page.
- Tenant settings page supports company profile, greeting, tone, services, custom instructions, basic knowledge base entries, allowed domains, OpenAI key replacement, embed token rotation, and tenant admin/owner creation.
- Tenant settings page shows tenant runtime status and subscription summary.
- Dashboard header links platform admins to tenant management and tenant users to their own settings.
- Platform admin sets tenant domains; tenant owner/admin verifies domain ownership.
- Domain verification supports `/.well-known/voice-agent-verification.txt` and homepage meta-tag checks.
- Runtime domain lookup only trusts active domains with `verificationStatus=verified`.
- `/agent.js` now exchanges verified domain context for a short-lived embed session.
- Runtime APIs accept `x-embed-session`, reducing reliance on long-lived browser-visible tenant tokens.
- Configurable audit logging is available through `AUDIT_LOGS_ENABLED=true`.
- Configurable aggregate usage counters are available through `USAGE_EVENTS_ENABLED=true`.
- Usage tracking stores one aggregate counter document per tenant, not detailed event rows.
- When logging flags are disabled, no inactive/no-op log or counter records are inserted.
- Tenant setup checklist shows domain, verification, OpenAI key, subscription, database URL, and embed readiness.
- Subscription and per-tenant rate enforcement are available behind opt-in flags.

Logging configuration:

```bash
AUDIT_LOGS_ENABLED=false
USAGE_EVENTS_ENABLED=false
AUDIT_LOGS_TTL_DAYS=30
USAGE_EVENTS_TTL_DAYS=30
SUBSCRIPTION_ENFORCEMENT_ENABLED=false
TENANT_RATE_LIMIT_ENABLED=false
TENANT_RATE_LIMIT_WINDOW_SECONDS=60
```

Set audit logging to `true` only in environments where you want detailed MongoDB audit records. Set usage to `true` only when you want aggregate tenant counters. Set enforcement values to `true` only when subscriptions and plan limits should actively block runtime traffic.

Deliverables:

- Initial tenant onboarding/admin flow.
- Secure server-side writes for tenant settings and secrets.
- Browser-visible embed snippet compatible with the current `/agent.js` loader.

Remaining before Phase 4 is fully polished:

- Add preview panel.
- Add setup completion checks.
- Add brand/title fields.
- Add dedicated per-step wizard UX.
- Add OpenAI key validation from the UI.
- Replace the basic knowledge base textarea with proper records in Phase 7.
- Add audit/usage dashboards.
- Add configurable plan-limit editor in super admin.

## Phase 5: Secure Dynamic Embed Script

Goal: Replace hardcoded/static embed behavior with secure tenant-specific embed loading.

Tasks:

- Replace hardcoded tenant/token behavior in embed scripts.
- Generate `/agent.js` dynamically.
- Support `data-tenant` and `data-client-key`.
- Validate parent domain.
- Create short-lived embed sessions.
- Pass session to iframe securely.
- Update voice page/API auth to accept signed embed session.
- Add clear error states for unauthorized domains.

Deliverables:

- Secure dynamic embed script.
- Domain-bound embed keys.
- No private tenant token in snippet.

## Phase 6: Runtime Tenant Isolation

Goal: Ensure every runtime API call is fully tenant-aware and isolated.

Tasks:

- Update `/api/config`.
- Update `/api/chat`.
- Update `/api/transcribe`.
- Update `/api/speak`.
- Update summary/call persistence.
- Update email notifications.
- Ensure all call records include `tenantId`.
- Ensure all dashboard queries filter by tenant.
- Add tenant status checks.
- Add per-tenant rate limits.
- Add usage event logging.

Deliverables:

- Tenant-isolated runtime.
- Tenant-isolated analytics.
- Tenant-specific OpenAI, voice, prompt, and KB behavior.

## Phase 7: Knowledge Base Upgrade

Goal: Move knowledge base from static config into tenant-managed records.

Phase 7A: Structured KB

- Store topic/content records in database.
- Add CRUD in tenant admin.
- Load active tenant KB into prompt.
- Track last updated date.

Phase 7B: RAG

- Add document upload.
- Chunk documents by tenant.
- Generate embeddings.
- Store vectors with `tenantId`.
- Retrieve only current tenant chunks.
- Add source visibility in admin.

Deliverables:

- Tenant-managed KB.
- Scalable tenant-specific retrieval.
- No cross-tenant knowledge leakage.

## Phase 8: Tenant Data and Integration Strategy

Goal: Decide how tenant data is stored and shared.

Recommended approach: hybrid model.

Store core data in platform DB:

- Conversations
- Leads
- Summaries
- Usage
- Audit logs

Optionally support tenant integrations:

- Push leads to tenant DB.
- Send webhook after call completion.
- Export CSV.
- Send email summary.
- Integrate CRM later.

Tasks:

- Keep platform-owned persistence as default.
- Add optional encrypted tenant DB URL.
- Add connection test.
- Add webhook URL support.
- Add retry/failure logging.

Deliverables:

- Safe default storage.
- Optional tenant-owned integrations.
- Reduced operational risk.

## Phase 9: Monitoring, Usage, and Limits

Goal: Make the platform operationally safe.

Tasks:

- Log usage by tenant.
- Track chat tokens, transcription calls, TTS calls, and completed conversations.
- Add per-tenant limits.
- Add rate limits.
- Add error reporting with tenant context.
- Add usage dashboard for platform admin.
- Add tenant health status.

Deliverables:

- Tenant usage visibility.
- Abuse protection.
- Operational monitoring.

## Phase 10: Production Hardening

Goal: Prepare for real customers.

Tasks:

- Add audit logs.
- Add secret rotation.
- Add tenant suspension.
- Add backup/export support.
- Add domain verification flow.
- Add CORS and frame ancestor hardening.
- Add security headers.
- Add automated tests for tenant isolation.
- Add onboarding acceptance checklist.

Deliverables:

- Production-ready multi-tenant foundation.
- Security and compliance baseline.
- Repeatable tenant onboarding process.

## Suggested First Milestone

Build this first:

> A platform admin can create a tenant. The tenant can log in, add company settings, add OpenAI key, add allowed domain, configure knowledge base, preview the agent, and copy a secure embed snippet.

This milestone proves the main SaaS flow without overbuilding billing, RAG, or tenant-owned database sync too early.

## Implementation Priority

1. DB-backed tenant registry
2. Encrypted secrets
3. Tenant auth/admin portal
4. Onboarding wizard
5. Secure dynamic embed
6. Runtime isolation
7. Tenant dashboard scoping
8. Knowledge base CRUD
9. Usage/rate limits
10. RAG and advanced integrations

## Key Decisions

- Use platform DB as the source of truth for tenants.
- Store tenant secrets encrypted, never in JSON.
- Use tenant-provided OpenAI keys only server-side.
- Keep platform-owned call/lead storage as default.
- Add tenant DB/webhook export as an optional integration.
- Avoid long-lived private embed tokens in browser code.
- Enforce tenant isolation at every query and API route.
