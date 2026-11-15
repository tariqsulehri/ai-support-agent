# 05 — Performance and Architecture

> Stack-agnostic. Measure before and after any performance change; a change without a
> measurement is a guess. Never trade correctness (or a security check) for speed.

---

## 1. Frontend performance

### 1.1 Loading
- **Route-level code splitting:** every top-level route/screen is lazy-loaded, wrapped in a
  Suspense/loading boundary. Wrap dynamic imports with a retry (stale chunk after deploy →
  retry once, then reload).
- **Vendor chunking:** split framework, data layer and chart library into separate long-cached
  chunks. Heavy libraries (charts, PDF, editors) load only on the screens that use them.
- Load fonts with `font-display: swap`, only the weights used, and only for the active theme.
- Images: correct size, modern format, `loading="lazy"` below the fold, explicit width/height.
- Budget: initial JS for the first screen kept small (target < ~200 KB gzipped); track bundle
  size in CI.

### 1.2 Rendering
- **Zero CLS:** every async region reserves its final size (skeletons with real heights,
  fixed chart heights, image dimensions). Don't insert banners above existing content.
- Memoise derived data (`useMemo`/`computed`/selectors) when it's expensive or feeds a
  memoised child; memoise callbacks passed to memoised children. Don't memoise trivial values.
- Keep state as local as possible; global stores hold only cross-cutting state (auth, theme,
  toasts). Select narrowly from stores to avoid re-rendering everything.
- **Virtualise** lists/tables that can render > ~200 rows at once (react-window/virtual,
  vue-virtual-scroller, CDK virtual scroll). Prefer server pagination first (02 §2).
- Animate only `transform` and `opacity`.

### 1.3 Input and network
- **Debounce** search/filter inputs (250–400 ms); **throttle** scroll/resize handlers
  (~100 ms or rAF). Cancel stale requests (AbortController / query cancellation).
- Data-fetching cache with an explicit `staleTime` on **every** query (defaults:
  5 min for normal data, 30 min for static config, ~60 s for fast-moving dashboards),
  `gcTime` ~10 min, 1 retry (none on 401/403), no refetch on window focus unless needed.
- Keep previous data visible while fetching the next page/sort.
- Invalidate precisely after mutations (by query-key prefix), not "invalidate everything".
- Batch parallel independent requests; avoid request waterfalls in nested components
  (hoist fetching to the screen or prefetch on hover/route enter).

---

## 2. Backend and data efficiency

### 2.1 Queries
- **No N+1:** fetch related data with joins/`include` sets or a single `WHERE id IN (...)`
  query, never a query inside a loop. Use a query log in dev/tests to spot repeats.
- **Select only needed columns** (projection), especially on wide or sensitive tables.
- **Pagination enforced** on every list endpoint that can grow: validated `page/limit` with
  a server-side max, deterministic ordering, `total` via a separate count query when needed.
- Use transactions for multi-step writes; keep them short; no network calls inside.
- Aggregations happen in the database (GROUP BY, window functions), not by loading rows
  into application memory.

### 2.2 Indexing awareness
- Index every foreign key, every column used in `WHERE`/`ORDER BY` of hot queries, and
  soft-delete/status flags used for filtering (`is_active`), plus ordering columns.
- Composite indexes follow the query's equality-then-range order; add unique constraints
  for natural keys.
- Every table has `created_at` and `updated_at` (append-only tables may skip `updated_at`).
- Review the query plan (`EXPLAIN`) for any new list/report query on large tables.
- Migrations are additive and reversible; never run them against production without approval.

### 2.3 Caching
- Cache only what is expensive **and** safe to be slightly stale (config, taxonomies,
  reference data). Key caches by everything that changes the result, **including the
  caller's scope/tenant** — never serve one user's scoped data to another.
- Layers: HTTP caching (`ETag`/`Cache-Control`) for static/reference endpoints, in-process
  or Redis cache for computed results, CDN for static assets (hashed filenames, 1-year cache).
- Invalidate on write; set TTLs; never cache authorisation decisions longer than the token.

### 2.4 I/O and runtime
- All I/O is async/non-blocking. CPU-heavy work (large exports, PDFs, bulk scoring) runs in a
  worker/queue or background job with progress, not in the request thread.
- Compression (gzip/brotli) at the reverse proxy or app.
- Connection pooling sized to the DB; a separate read-replica URL only when actually wired.
- Graceful shutdown: stop accepting, finish in-flight requests (timeout ~20 s), close pools.
- Log unhandled rejections; on an uncaught exception, log and exit (let the orchestrator restart).
- Timeouts on every outbound call; retries with backoff only for idempotent operations.

---

## 3. Code organisation

### 3.1 Layering
```
Frontend                                   Backend
─────────                                  ───────
screens/pages   (compose, route)            router      (paths + guards + validation)
components/ui   (shared primitives)         controller  (HTTP in/out, no business logic)
components/<domain> (feature UI)            service     (business rules, transactions)
hooks|services  (ALL data fetching)         data access (ORM/repository, queries only)
lib             (pure helpers, formatters)  lib         (errors, logging, helpers)
types           (shared types)              schemas     (validation per module)
styles          (tokens, themes)            config      (env schema, db client, logger)
store           (auth/theme/toasts only)
```
- Group backend code **by feature module** (`modules/<feature>/{router,controller,service,schema}`).
- **Components never call HTTP.** All requests go through hooks/services that own the cache
  key, auth gating and error mapping.
- **Business rules live in one place.** A metric/status/eligibility rule has a single
  implementation (server or one shared domain helper), reused everywhere it's shown.
- **Business values come from configuration/data**, not code: levels, thresholds, weights,
  targets and labels are read from the DB/config. No magic numbers.
- Pure functions (adapters, formatters, calculators) are separate from components so they
  can be unit-tested.
- **Extract on second use:** the same visual or logic pattern in 2+ places becomes a shared
  piece and is recorded in a component/hook catalogue. Check the catalogue before building.

### 3.2 Typing
- Strict mode on (TypeScript `strict`, mypy strict, C# nullable enabled).
- No `any`; use `unknown` + narrowing. No unchecked casts; validate external data with a
  schema at the boundary and derive types from it.
- Shared response/request types live in a `types` module, not inline in hooks/components.
- Use branded/nominal types for values that share a primitive but differ in meaning
  (fraction vs percent, cents vs dollars, UTC vs local).
- A type must not claim more than its initialiser provides (`Partial<Record<K,V>>` with `{}`,
  not `Record<K,V>` with `{} as any`).
- **Never delete a null guard** because the type says it's safe; prove presence first.

### 3.3 Quality bar
- Every change ships tests; ≥ 80% line coverage on new/changed code. Tests assert what the
  user/caller sees (labels, counts, order, payloads, status codes), and each key rule is
  proven by a test that fails when the rule is broken.
- Lint (incl. a11y and static-analysis rules), type-check, tests and build run locally and
  in CI on every push. Duplication on new code ≤ 3%.
- End-to-end smoke test that signs in through the UI and opens every route in every theme
  with an **empty** API response (the state that crashes first renders).

---

## 4. Refactoring safety (applies to every performance or architecture change)

1. A refactor must not remove anything that renders, is saved, or is returned. If it does,
   it's a product change — say so and get approval.
2. Don't claim "no behaviour change" unless the diff proves it.
3. Characterise behaviour before changing it (tests or screenshots), compare after.
4. One concern per commit; keep it reversible.
