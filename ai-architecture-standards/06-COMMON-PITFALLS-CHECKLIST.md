# 06 — Common Pitfalls Checklist (run before finishing ANY task)

> Copy this checklist into your final report and mark every line `[x]` (pass), `[ ]` (fail —
> fix it before finishing) or `N/A` (with a reason). A task is not done while any line is
> `[ ]`. Cite the file/test that proves each pass where possible.

---

## A. Business functionality preserved
- [ ] Were any existing features, routes, URLs, or event handlers broken or removed? (Must be **No**.)
- [ ] Every API request/response field the app used before is still sent/read the same way.
- [ ] Every validation rule, permission check and domain calculation still exists and behaves the same.
- [ ] Nothing that rendered before has disappeared without an approved product decision.
- [ ] No null guard (`?.`, `??`, explicit checks) was removed just because a type allowed it.
- [ ] The commit message does not claim "no behaviour change" unless the diff proves it.
- [ ] Visual refactors and logic changes are in separate commits.

## B. Real data only
- [ ] Are there any hardcoded strings, mock arrays, or fake chart numbers left in the code? (Must be **No**.)
- [ ] Every table, chart and KPI reads from an API / query / store through the host's data layer.
- [ ] No invented fallbacks: `?? 0`, `|| 'N/A'`-as-a-number, or realistic prop defaults (defaults are `0`/`null`/`false` only).
- [ ] Missing data shows as missing ("—", "Not assessed"), never as zero.
- [ ] Side-by-side numbers cover the same population; denominators are stated.
- [ ] Fraction vs percent (and other unit pairs) converted with the shared helper.
- [ ] Business values (levels, thresholds, weights, labels) come from config/DB, not literals.
- [ ] UI shows business identifiers, never database primary keys.

## C. Native stack
- [ ] Did the LLM introduce foreign libraries instead of using the host application's native stack? (Must be **No**, or owner-approved with a reason.)
- [ ] Existing shared components/hooks were reused; the component catalogue was checked and updated for any new shared piece.
- [ ] No duplicate of an existing primitive (second button/select/modal/table style).

## D. States
- [ ] Are loading, error, and empty states implemented for every asynchronous view?
- [ ] Loading uses skeletons that reserve final size (no layout shift).
- [ ] Filtered-empty differs from truly-empty; permission-denied differs from empty.
- [ ] Error states have a plain message and Retry; no stack traces or raw codes shown.
- [ ] Buttons are disabled while saving; success/failure confirmed with a toast.
- [ ] Destructive actions go through a confirm dialog that states the consequence.

## E. Design system consistency
- [ ] Are responsive breakpoints and theme tokens applied consistently?
- [ ] No raw hex / `rgb()` numbers / palette classes / inline colour styles outside the palette and chart-colour modules.
- [ ] Checked in **every** theme (light/dark/…); contrast ≥ 4.5:1 for text, ≥ 3:1 for UI/marks.
- [ ] Checked at narrow (~375 px), medium (~768 px) and wide (≥ 1440 px) widths; no page-level horizontal scroll.
- [ ] Only the two control heights; one Select component; sentence-case headings; 12 px text floor; tabular figures for numbers.
- [ ] Max two toolbars above a table; no repeated title/search/count.
- [ ] Every icon-only button has a tooltip/accessible name.
- [ ] Every screen, chart and KPI tile has a help "?" with all four parts, updated in the same change.
- [ ] Keyboard path works (Tab, Enter/Space on clickable rows, Esc closes overlays); focus is visible.

## F. Tables and charts
- [ ] Large/unbounded lists are server-paginated with a server-side page-size cap.
- [ ] Sort works on every sortable column; blanks sort last; changing sort/filter resets to page 1.
- [ ] Search is debounced and cancels stale requests.
- [ ] Numbers right-aligned; sticky opaque header on scrolling tables.
- [ ] Chart type matches the question (03 §4); status colours not used as series colours; palette validated.
- [ ] Charts have a summary, a "view as table" alternative, and formatted axes/tooltips via shared formatters.
- [ ] Bar charts start at zero; ordinal levels not drawn as 0–100 bars; no trend line from one point.

## G. Security
- [ ] Every new/changed backend route has an auth + role/permission guard (public allowlist unchanged).
- [ ] All inputs (params, query, body) validated with a schema; unknown fields rejected on writes.
- [ ] Data access is scoped to what the caller may see (row-level / tenant filter on the server).
- [ ] No raw SQL concatenation; sensitive models use a column allowlist.
- [ ] No raw-HTML rendering of user content without sanitising.
- [ ] No secrets, tokens, keys or environment URLs in code, tests, docs or the frontend bundle.
- [ ] New env variables added to the startup schema and `.env.example`.
- [ ] Error responses generic for 5xx/DB errors; logs redact auth headers, cookies and secrets.
- [ ] Tokens never written to localStorage/sessionStorage.

## H. Performance
- [ ] No N+1 queries (no query inside a loop); only needed columns selected.
- [ ] New filter/sort columns are indexed; new tables have `created_at`/`updated_at`.
- [ ] Every new query hook sets an explicit cache/stale time and a precise cache key.
- [ ] New screens are lazy-loaded; heavy libraries load only where used.
- [ ] Lists > ~200 visible rows are paginated or virtualised.
- [ ] Expensive derived values memoised; no unnecessary re-renders from broad store selectors.

## I. Code quality and verification
- [ ] No `any` / unchecked casts; external data validated at the boundary.
- [ ] Business rule implemented once; no copy-pasted calculation.
- [ ] Tests added: ≥ 80% line coverage on new/changed files (checked per file, not just the total).
- [ ] Tests cover loading, empty, error, success, disabled-while-saving, and permission-denied.
- [ ] One key rule was broken on purpose to prove a test fails, then restored.
- [ ] Type-check, lint, tests and build all pass locally.
- [ ] Changed screens opened in a real browser (each theme, each relevant role) and looked at — not just "tests pass".
- [ ] Nothing was pushed, merged, migrated, seeded or deleted on shared/production systems without explicit approval.

## J. Final report contains
- [ ] What changed (files), and why.
- [ ] How each change was verified (tests, screenshots, commands run, with results).
- [ ] What was **not** verified and why.
- [ ] Any behaviour difference (should be none unless approved).
- [ ] Open gaps found but deliberately left alone.
