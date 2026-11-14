# MongoDB Native Driver stack module (Node.js mongodb v7.x)

**Status:** vetted for ai-support-agent  
**Last reviewed:** 2026-11-14  
**Author:** audit kit maintainer  

**Detection signals:** `package.json` with `mongodb` (no `mongoose`); `MongoClient`, `db.collection(`, `Collection<T>`, `Db`, `ObjectId`, `new MongoClient(`, `MongoClient.connect(`.

**Loads with dimensions:** data, security, performance, reliability, compliance, architecture.

---

## Vulnerability and defect patterns

### Security
- **NoSQL / BSON Operator Injection:** Direct passing of `req.body` or query parameters into filter queries: `collection.findOne({ tenantId: body.tenantId })` where `body.tenantId` could be `{ "$ne": null }` or `{ "$gt": "" }`. All query parameters and JSON body inputs must be validated with Zod (`z.string().min(1)`) or cast to primitives.
- **Server-side JavaScript Execution:** Use of `$where`, `$function`, or `$accumulator` with concatenated strings. Native driver queries must use standard query operators only.
- **Credential & Secret Exposure in Logs:** Decrypted `database_url`, `openai_api_key`, or `smtp_password` logged in `console.warn` or `console.error` during connection failures. Errors must log masked values or generic messages.
- **ReDoS via Regex Filters:** Building `new RegExp(userText)` without escaping special characters. Use anchored, escaped regex or text search.
- **Multi-Tenant Leakage in Shared Collections:** When querying shared collections (`tenants`, `tenant_agent_settings`, `tenant_domains`), every query must include `{ tenantId }` or normalized lookup keys.
- **Object-Level Access (BOLA / IDOR):** Lookups by `_id` alone without enforcing the tenant scope (`{ _id, 'tenant.id': tenantId }`).

### Data & Schema
- **Missing or Incomplete Indexes:** Shared collections must have compound and unique indexes:
  - `tenants`: unique on `tenantId`, `publicId`, `slug`.
  - `tenant_agent_settings`: unique on `tenantId`.
  - `tenant_domains`: unique on `{ tenantId, origin }`.
  - `tenant_embed_keys`: unique on `tokenHash`, index on `apiKeyHashes`.
  - `tenant_secrets`: unique on `{ tenantId, kind }`.
  - `conversations`: compound index on `{ 'tenant.id': 1, createdAt: -1 }`, `{ 'tenant.id': 1, status: 1 }`.
- **TypeScript Type Safety vs Driver Schema:** Native driver lacks runtime schema enforcement unlike Mongoose. Verify that all document insertions and updates use validated Zod schemas before writing to the database.
- **Idempotency on Writes:** Conversation snapshots and final call summaries must use `updateOne({ conversationId }, { $set, $setOnInsert }, { upsert: true })` rather than blind `insertOne` to prevent duplicates on retries.
- **Data Retention & Soft Delete:** Personal data (audio transcripts, caller phone numbers, emails) requires a retention policy or TTL index if compliance requires automatic data expiration.

### Performance
- **Connection Storms & Leaks:** `MongoClient.connect` called per request without caching. In Next.js App Router (SSR & Route Handlers), client promises must be cached on `globalThis` keyed by connection string hash.
- **Unbounded Queries:** List endpoints calling `.find().toArray()` without `.limit()` or pagination.
- **Missing Projections:** Fetching full heavy documents (e.g. large transcripts, audio metrics) when only metadata or `_id` is needed.
- **Timeouts:** Ensure `serverSelectionTimeoutMS` and `connectTimeoutMS` are explicitly set (e.g., 5000ms) to avoid request threads hanging when external clusters (e.g. MongoDB Atlas) are unreachable.

### Reliability & Multi-Tenant Routing
- **Tenant-Isolated Database Routing:** For enterprise tenants with dedicated database URLs, verify that connections are established via decrypted secrets with appropriate isolation and connection pooling.
- **Graceful Platform Fallback:** If a tenant's external database cluster is unreachable (e.g. network failure, IP Access List restrictions), verify that the application has a safe fallback to prevent customer conversation data loss, while raising an observability signal.
- **Connection Health Checks:** Tenant secret management should support pre-flight connection testing before saving credentials.

---

## Framework & Driver Configuration

- Explicit timeout configuration: `serverSelectionTimeoutMS: 5000`, `connectTimeoutMS: 5000`.
- Application naming: Pass `appName` in connection options for database connection tracing.
- Index creation idempotency: Verify that `createIndex` runs with a cached promise guard (`indexesReady ??= ...`) to prevent redundant `createIndex` commands on every request.

---

## Where to look first in ai-support-agent

- Core Platform Database: `src/lib/db/mongodb.ts`
- Multi-Tenant Conversation Store & Router: `src/lib/db/conversation-store.ts`
- Call Records & Snapshots: `src/lib/db/call-records.ts`
- Tenant Database Registry & Collections: `src/lib/tenants/db-registry.ts`, `src/lib/tenants/db-types.ts`
- Encrypted Secrets Storage: `src/lib/tenants/secrets.ts`, `src/lib/security/encryption.ts`
- Usage Counters: `src/lib/observability/usage.ts`
