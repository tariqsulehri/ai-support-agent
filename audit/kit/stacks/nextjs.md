# Next.js (App Router) stack module

**Status:** vetted
**Last reviewed:** 2026-11-08
**Author:** audit kit maintainer

**Detection signals:** `package.json` with `next`; `next.config.(js|mjs|ts)`; `src/app/` or `app/` with `page.tsx`, `layout.tsx`, `route.ts`; `middleware.ts`; `.next/`; `vercel.json`.

**Loads with dimensions:** security, architecture, performance, reliability, testing, code-health, cicd-supply-chain. Load `react.md` too for the client components.

## Vulnerability and defect patterns

### Security
- `middleware.ts` treated as the only guard: the `matcher` lists pages, but `app/api/**/route.ts` handlers are reachable directly. Every route handler must check the session or token itself. List each `route.ts` and its auth call.
- Middleware `matcher` gaps: paths missing from `matcher`, trailing-slash and case variants, `/_next/data` routes. Middleware bypass via the `x-middleware-subrequest` header affected Next.js before 15.2.3 / 14.2.25 (CVE-2025-29927); check the installed version.
- Route handlers that read `params.id` (`app/api/x/[id]/route.ts`) and update by id with no ownership or tenant filter: object-level access.
- Server Actions (`'use server'`): each is a public POST endpoint; check auth and input validation inside every action, not in the calling component.
- `NEXT_PUBLIC_*` env vars are inlined into the client bundle: grep for secrets with that prefix. Server-only modules imported from a `'use client'` file leak code; look for `import 'server-only'` on secret-holding modules.
- `next.config` `headers()`: `Access-Control-Allow-Origin: *` on `/api/:path*` with cookie auth; missing `Content-Security-Policy`, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`.
- `redirect()` or `NextResponse.redirect()` built from a `from`/`next`/`returnTo` query value with no same-origin check: open redirect.
- Cookies set with `cookies().set` or `res.cookies.set`: check `httpOnly`, `secure`, `sameSite`, `path`, `maxAge`. Logout must clear with the same attributes.
- Route handlers that serve JavaScript (for example an embed loader `agent.js/route.ts`) built by string interpolation of query values: script injection.
- `dangerouslySetInnerHTML` with model, tenant or user text.
- `images.remotePatterns` with `**` hostname: open image proxy (SSRF and cost).

### Data
- Database connection opened per request instead of a cached global (`globalThis`) in dev and serverless: connection exhaustion.
- Server Components fetching data with no scope filter because "the page is behind middleware".

### Performance
- Route handlers with `export const dynamic = 'force-dynamic'` or no caching on data that rarely changes; or the opposite: `fetch` caching per-user data.
- Large client components (`'use client'` at a high level) pulling server-only libraries into the bundle; check `.next` build output sizes.
- Streaming (SSE `ReadableStream`) with no backpressure and no `req.signal` abort handling.

### Reliability
- Serverless time limits: long LLM or email work in a route handler on Vercel needs `maxDuration` (in `vercel.json` or `export const maxDuration`). Work after the response returns is not guaranteed unless `after()` / `waitUntil` is used.
- Edge vs Node runtime: `export const runtime = 'edge'` with Node-only libraries (database drivers, `nodemailer`, `fs`) fails at runtime.
- Module-level state (Maps used as rate limiters, caches, counters) is per instance and lost on cold start.
- No `error.tsx` / `global-error.tsx`; route handlers returning raw `err.message` or stacks.

### Testing
- No tests for route handlers (call the exported `GET`/`POST` with a `NextRequest`), no auth negative tests, no e2e (Playwright) on the main flows.

### Code health
- Business logic inside `route.ts`; the same auth-and-tenant preamble copied into every handler instead of one helper.
- `next lint` deprecated in Next.js 15.5+ and removed in 16; prefer the ESLint CLI.

## Framework misconfigurations

- `poweredByHeader` left `true`: set `false`.
- `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` set `true`: errors ship.
- `output: 'standalone'` absent in a Docker build: image ships full `node_modules` and `src`.
- `reactStrictMode` off without reason.
- Missing `Permissions-Policy` for microphone or camera on pages that use them; overly broad `frame-ancestors`.

## Scanner and project commands

All run only if approved at Checkpoint A.
- Dependency audit: `npm audit --json` or `osv-scanner --lockfile package-lock.json` (read-only).
- Lint: `npm run lint` (`next lint`) or `npx eslint .`.
- Typecheck: `npx tsc --noEmit`.
- Build: `npm run build` (writes `.next/`; needs env vars that are checked at import time).
- Tests: the `test` script if one exists.

## Where to look first

- Routes: `src/app/api/**/route.ts`, `src/app/**/page.tsx`, Server Actions (`'use server'`).
- Auth: `src/middleware.ts`, `src/lib/auth/`, login route handlers.
- Config: `next.config.*`, `vercel.json`, `.env*` names, `process.env` usages.
- Headers and CORS: `next.config.*` `headers()`, any `OPTIONS` exports.
- The real layout comes from the System Map.

## Looks wrong but is fine

- `Access-Control-Allow-Origin: *` on endpoints that are deliberately public, carry no cookies, and are authenticated by an explicit header token.
- `export const dynamic = 'force-dynamic'` on routes that read cookies or headers.
- `next-env.d.ts` and `.next/` present locally (generated).
- `'use client'` on interactive leaf components.

## Version notes

- Next.js 15: `cookies()`, `headers()` and `params` are async; sync access logs warnings and later errors.
- Next.js 15.2.3 / 14.2.25 fixed the middleware-bypass CVE-2025-29927; earlier versions are vulnerable if middleware is the only guard.
- React 19 is required by Next.js 15 App Router.
- Verify against the installed version (`node_modules/next/package.json`).
