# 04 — Security Guardrails

> Stack-agnostic. Each rule names an outcome and a reference implementation pattern.
> Map to the host's framework (Express/Fastify/Nest, ASP.NET, Django/FastAPI, Spring,
> Rails, Next.js route handlers, etc.). **The backend is the security boundary.** Anything
> the frontend hides is a courtesy, not a control.

---

## 1. Input and output hygiene

### 1.1 Validate at every boundary
- Every route validates **params, query and body** with a schema library (zod, Joi,
  class-validator, Pydantic, FluentValidation, DataAnnotations) before the handler runs.
- Merge order is fixed so a less-trusted source can't override a validated one
  (params > body > query). Replace the raw input with the **parsed** value; handlers only
  read parsed data.
- Reject unknown fields on writes (strict schemas). Coerce and bound numbers
  (`page ≥ 1`, `1 ≤ limit ≤ 100`), constrain strings (length, pattern), use enums for codes.
- IDs in paths are validated (type + format) before any lookup.
- Invalid input → `400` with `{ code: "VALIDATION_ERROR", details: [{ field, message, code }] }`.
- Validate on the client too for UX, but never rely on it.

### 1.2 Output encoding / XSS
- Render user content through the framework's auto-escaping. **Ban** raw-HTML sinks
  (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `@Html.Raw`, `|safe`) unless the content
  is sanitised with a vetted sanitizer (e.g. DOMPurify) and a code comment says why.
- Never build URLs, CSS or script from user input without encoding; validate URL schemes
  (`http`/`https` only) for user-provided links.
- CSV/Excel export neutralises formula injection (`= + - @` → prefix `'`).
- Strict Content-Security-Policy on the frontend (see §4.3).

### 1.3 Database safety
- Use the ORM/query builder or **parameterised** queries only. String-concatenated SQL is
  banned; raw SQL must use bound parameters (tagged templates / `@param`).
- **Select only the columns you return** — use an explicit allowlist for sensitive models
  (e.g. a `SAFE_USER_SELECT`) instead of loading whole rows/relations. Pair it with a
  `NEVER_SENT` list and a test that fails when a new column is added to neither list.
- Map ORM/DB errors to generic responses (unique violation → `409 CONFLICT`, not found →
  `404`) without leaking table/column names.
- Multi-step writes run in a transaction.

### 1.4 File uploads (if any)
- Allowlist MIME type **and** sniffed magic bytes, cap size, randomise stored names, store
  outside the web root / in object storage, scan if possible, serve with
  `Content-Disposition: attachment` unless it's a known-safe image.

---

## 2. Authentication and sessions

| Concern | Rule (reference pattern) |
|---|---|
| Passwords | bcrypt (cost ≥ 12) or argon2id. Never log, return or audit a password or hash. |
| Login brute force | Lock after 5 failures for 15 min; wrong attempts during a lock don't extend it; the "locked" message only appears after a correct password. Rate-limit login per IP (e.g. 10/min). |
| User enumeration | Same response and **same timing** for unknown user vs wrong password (compare against a decoy hash). |
| Access token | Short-lived JWT (≈15 min), signed with a ≥ 32-char secret from env. Held **in memory only** on the client — never `localStorage`/`sessionStorage`. |
| Refresh token | Long-lived (≈7 days), separate secret, random `jti`, sent as an **httpOnly, Secure (prod), SameSite=Strict** cookie scoped to the auth path. Stored server-side **as a hash** with `revoked` + `expires_at`. **Rotate on every use** and revoke the family on reuse. |
| Per-request check | Verify token, then re-check the user is still active (and still linked to required records) — a disabled user loses access on the next request, not after token expiry. |
| Refresh flow (client) | One interceptor: on 401, refresh **once** (single shared in-flight refresh promise for concurrent 401s), retry the original request once, never intercept the login/refresh calls themselves; on refresh failure, clear state and go to login. |
| Reload | Persist only a non-secret "session active" flag; on reload, restore by calling refresh (cookie). |
| Logout | Revoke the presented refresh token server-side and clear the cookie. Password change revokes all other sessions. |
| CSRF | With SameSite=Strict cookies used only on the refresh endpoint + Bearer header for API calls, CSRF exposure is minimal. If the host uses cookie-auth for API calls, add CSRF tokens. |

---

## 3. Authorisation (RBAC, scoping, tenant isolation)

- **Every route has a guard.** Only an explicit, tiny allowlist is public (e.g. `login`,
  `refresh`, `health`, `ready`). Enforce with a test that walks the real router, asserts
  every non-public route returns `401` without a token, checks a role matrix for expected
  `403`s, and keeps a "known gaps" list that may only shrink.
- Mark guards (e.g. a shared symbol/attribute) so the test can detect them reliably.
- Middleware order per route: **authenticate → role/permission guard → validate → scope
  guard → handler**.
- Roles form a hierarchy; permissions are data (role ↔ permission tables with `is_active`),
  checked live for sensitive operations. Role/permission constants live in **one** shared
  module per tier — no inline role arrays.
- **Row-level scoping:** a scope service computes which records/tenants the caller may
  access (own record + assigned teams/departments, date-bounded). Every query on scoped data
  filters by that set (`WHERE id IN (:accessibleIds)` / `tenant_id = :tenant`). Out-of-scope
  access → `403 SCOPE_VIOLATION`. Never trust a client-sent tenant/owner id.
- **Separation of duties:** users cannot approve their own submissions (`403
  SELF_APPROVAL_PROHIBITED`); managers' own items need a higher approver.
- **Frontend guards** (route guards, hidden nav, hidden buttons, disabled queries) mirror
  the backend for UX only. Data hooks don't fire requests the user isn't allowed to make.
- **Audit log** for security-relevant changes (role/permission/access changes, approvals,
  deactivations): actor, target, action, entity, old/new value (secrets stripped),
  timestamp. Reads are capped and permission-guarded.

---

## 4. Secrets, config, and API hardening

### 4.1 Secrets and config
- **No secrets, tokens, API keys, passwords, connection strings or environment-specific
  endpoints in code**, tests, fixtures, docs or the frontend bundle. Frontend config is
  public by definition — only public values (API base path) go there.
- **Validate env at startup** with a schema (required URLs as URLs, numeric coercion with
  bounds, enums for `NODE_ENV`/log level, min length for secrets). Crash on failure with a
  message naming the missing key (never its value).
- `.env` files are git-ignored; ship `.env.example` with names and safe placeholders.
- Secret scanning (gitleaks or equivalent) in a pre-commit hook **and** CI on full history.
- No demo/test accounts or credentials in production code; a build-output scan fails the
  pipeline if demo markers appear.
- Each environment has its own secrets; rotate on exposure.

### 4.2 API hardening
| Control | Reference |
|---|---|
| Rate limiting | Login 10/min/IP, refresh 60/min/IP, password change 10/15 min/IP, expensive/paid endpoints (AI, exports) per **user** id (e.g. 30/min). Return `429` with `Retry-After`. |
| Proxy awareness | Configure trusted proxy hop count so limits see the real client IP (bounded, e.g. 0–5). |
| CORS | Single explicit origin from env (no `*` with credentials), `credentials: true` only if needed, explicit methods and headers, `maxAge` ~1 h. |
| Body limits | JSON/urlencoded ≤ 1 MB (larger only on specific upload routes). |
| Security headers | Helmet/equivalent: HSTS (1 y, includeSubDomains, preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `frame-ancestors 'none'`. |
| Errors | Central error handler mounted last, after a JSON 404. Response: `{ error, code, requestId, path, timestamp }`. **Any 5xx and any DB error → generic "Internal server error"**. No stack traces, SQL, file paths or library messages to clients. Intentional errors use a typed `ApiError(message, status, code)`. |
| Response envelope | Success `{ success: true, data }`; error `{ success: false, error, code }`. Stable machine-readable `code`s. |
| Logging | Structured JSON logs with request id; **redact** `Authorization`, cookies, `Set-Cookie`, and any key matching `password|secret|token|*_hash`. 5xx at error level, 4xx at warn. Pretty logs only outside production. |
| Health | `/health` (liveness, no dependencies) and `/ready` (checks DB, returns 503 on failure). Neither leaks versions or config. |

### 4.3 Frontend headers (served by the web server/CDN)
- CSP: `default-src 'self'`; scripts by hash/nonce (no `'unsafe-inline'` for scripts),
  `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `connect-src` limited to
  the API origin.
- Same HSTS / nosniff / Referrer-Policy / Permissions-Policy as above.

---

## 5. Supply chain and CI

- Lockfile committed; install with the clean/locked command (`npm ci`, `pip install
  --require-hashes`, `dotnet restore --locked-mode`).
- Dependency + image vulnerability scan (trivy, npm audit, Snyk, Dependabot) fails on fixable
  HIGH/CRITICAL. Scanner/tool images pinned to exact versions.
- Static analysis quality gate (SonarQube or equivalent): 0 new issues on new code.
- Pre-push hook runs type-check, lint, tests and build on the exact commit; never bypass
  with `--no-verify`.
- Containers run as non-root, minimal base image, no secrets baked into layers.

---

## 6. Security tests to port

- Route-guard test (every route guarded; public list exact).
- Role matrix test (expected 403s per role for sensitive routes).
- Scope test (user A cannot read/write user B's out-of-scope record).
- Validation tests (bad params → 400 with details; oversized limit clamped/rejected).
- Error handler test (5xx and DB errors return the generic body; no `stack` field).
- Rate-limit tests on auth routes; proxy-hop test.
- Secret-strip test on logging/audit helpers; safe-select allowlist test.
