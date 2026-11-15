# 02 — Tables and Data Grids

> Applies to every list, table, grid, matrix and roster. Map to the host's table component
> (native `<table>`, TanStack Table, AG Grid, MUI DataGrid, Vuetify, etc.). Do not add a
> grid library if the host already renders tables another way.

---

## 1. Data binding (non-negotiable)

- Rows come **only** from a live source: an API call through the host's data layer, a
  database query, or a state store fed by one. Never a literal array, a JSON fixture, or
  "sample rows until the API is ready".
- Components never call HTTP directly. A table receives data from a **hook/service/store**
  that owns the request, cache key, and error handling.
- Cache keys include every parameter that changes the result:
  `['users', { page, pageSize, sort, filters, search }]`.
- Fetching is gated on auth/permission: no request fires for a user who may not see it.
- Display what the server sent. Do not recompute business values (status, eligibility,
  totals) in the table; use server-provided flags or one shared domain helper.
- Missing values render as "—" (or a domain word like "Not assessed"), **never `0`**.
  Zero is shown only when zero is the true value.
- Show business identifiers (employee code, order number, SKU), **never database primary
  keys**. If there is no business id, omit the column.

---

## 2. Pagination

| Dataset size (realistic max) | Strategy |
|---|---|
| ≤ ~1,000 rows, already loaded for other reasons | Client-side paging/sort/filter is acceptable |
| > ~1,000 rows or unbounded (logs, history, transactions) | **Server-side** paging, sorting and filtering |
| Very long scroll lists that must stay continuous | Virtualised rendering (05 §1) on top of server paging |

Server contract:
- Request: `page` (1-based) + `pageSize`/`limit`, `sort` (`field:asc,field2:desc`),
  filters, `q`. Validate all of them with a schema at the boundary.
- **Cap page size** server-side (e.g. default 20–25, max 100; logs max 1000) and clamp,
  never trust the client value.
- Response: `{ data: T[], total, page, pageSize }` inside the app's standard envelope.
  Cursor-based paging (`nextCursor`) for append-only feeds.
- Always a deterministic sort (add the primary key as the final tie-breaker) so pages don't
  overlap or skip rows.

UI:
- Pager shows "Showing 21–40 of 312", Prev/Next, page numbers with ellipses; hidden when
  there is one page.
- Default ~20–25 rows per page for compact rows (fits one screen).
- Changing sort, filter or search resets to page 1.
- If a hard limit truncates the result (e.g. "latest 500 rows"), say so on screen.

---

## 3. Sorting

- Every column header that holds sortable data is a sort control. Click = ascending, click
  again = descending. Multi-column sort via Shift+click when the host supports it; show
  sort order numbers on headers.
- Header shows state with an icon (↕ unsorted, ↑, ↓) and an accessible label
  ("Sort by Name, currently ascending"); use `aria-sort` on the `th`.
- **Blanks always sort last** in both directions.
- Sort comparators are type-aware (numbers numerically, dates by timestamp, text
  locale-aware and case-insensitive).
- In editable tables, sort by **saved** values, not the draft, so rows don't jump while typing.

---

## 4. Search and filtering

- **Debounce** free-text search 250–400 ms (server-side search must debounce; client-side
  may use the framework's deferred/transition primitive). Cancel stale in-flight requests.
- The table's own search is a filter: placeholder **"Filter …"**, with a clear (×) button.
  Global navigation search uses "Search …". Never stack two search boxes.
- **Faceted filters:** dropdowns/chips built from the values present in the data (or from
  config), showing counts per facet. Status chips with counts may double as the filter.
- Empty value `''` means "All". Active filters show as removable chips on the filter
  heading line, plus "Clear all".
- Hide a filter that has only one possible value.
- Persist filter/sort/page in the URL query string when the screen is shareable/bookmarkable.
- Show a match count ("12 of 340") only while a filter is active; don't repeat counts
  already on status tabs.

---

## 5. Layout and density

- **Compact density:** rows 32–36 px, body 12–13 px, headers 11–12 px uppercase semibold,
  in-cell controls 26–28 px.
- **Sticky header:** the table scrolls inside its own container
  (`max-height: calc(100vh - <header offset>)`), header `position: sticky; top: 0` with an
  **opaque** background. Wide matrices also stick the first column and the corner cell.
- **Column order:** broad → specific; the row identifier sits next to the columns users act on.
  Give spare width to non-critical columns.
- **Alignment:**
  - Text: left. Numbers, currency, percentages, counts: **right**, tabular figures, fixed
    width. Dates: left or right consistently per app, single format.
  - Status badges / icons / actions: centre or right, consistently.
  - Header alignment matches its column.
- **Repeated labels:** when every row would repeat the same words ("2 below · 0 met"), put
  the words once in a column-heading row and leave only numbers in the rows.
- **Row states:** light hover tint; selected/editing row = `accent-soft` + inset accent bar;
  inactive rows = faint danger tint or muted text + "Inactive" badge; edited-unsaved cells =
  `warning` border with the old value in a tooltip.
- **Zebra striping** optional on flat tables; **off** for child rows in grouped tables.

### Grouped (parent/child) tables
- A value repeated on many rows becomes a **group header row**, not a column.
- Header row: ~8% tint of the group colour, 3 px solid left bar, stronger top border,
  heaviest text weight, collapse chevron, count summary, and a warning when the whole
  group has no data. Child rows: 50% bar in the same colour, medium weight, no striping.
- 6 px gap between groups. Provide "Collapse all / Expand all" and a flat-list toggle.

### Matrix (many narrow numeric columns)
- Every data column the same width (≈48 px); vertical column headings that wrap between
  words, never truncate (full name in tooltip), header height capped (~150 px).
- Every column sits under a labelled group title (3 px group-colour bar; colour never
  carries the text). Sticky corner + header + first column. Corner cell says what rows are
  and how they're sorted. Tints are opaque (sticky) and tested at 4.5:1.

---

## 6. Status, actions, and row interaction

- **Status badges:** shared badge component; colour + word (+ icon). Status colours are
  reserved for state (success/warning/danger/neutral), never decoration.
- **Actions:**
  - ≤ 3 actions: inline ghost icon buttons in a right-aligned Actions column, each with a
    tooltip.
  - > 3 actions: an overflow (⋯) menu with keyboard support (arrow keys, Esc, focus return).
  - Destructive actions go through the confirm dialog and state the consequence.
  - Actions the user may not perform are **hidden** (or disabled with a reason tooltip) —
    and the backend still enforces the rule.
- **Row click** that opens details: whole row is focusable (`tabindex=0`), opens on
  Enter/Space, and opens a side panel or detail route — not a navigation that loses filters.
- **Bulk actions:** checkbox column + header select-all (current page vs all results stated
  explicitly) + a bulk-action bar showing "N selected".

---

## 7. Loading, empty, error

| State | Required UI |
|---|---|
| Initial load | **Skeleton rows** matching column widths and row height (5–10 rows), header visible. No spinner-only screen; no layout jump when data arrives. |
| Refetch (paging/sorting) | Keep previous rows visible (dimmed or with a thin progress bar); never blank the table. |
| Empty (no data at all) | Sentence explaining why + primary next action ("No users yet. Add user"). |
| Empty (filters exclude all) | "No rows match these filters." + "Clear filters". |
| Error | Inline alert with plain message + Retry; keep toolbar usable. |
| Permission denied | Explain the user lacks access; do not render an empty table that suggests "no data". |
| Partial | If the server caps or truncates, say so ("Showing latest 500"). |

---

## 8. Responsive behaviour

- ≥ 768 px: full table, horizontal scroll inside the table container if needed (never the
  whole page), sticky first column for wide tables.
- < 768 px: either (a) horizontal scroll with sticky identifier column, or (b) collapse each
  row into a **card** (identifier + 2–4 key fields + status + actions). Choose per table;
  keep the same data and actions.
- Toolbars wrap; primary action stays visible.

---

## 9. Export

- CSV export uses the **same** filtered/sorted dataset the user sees (or explicitly "all
  rows" via a server export for large sets).
- Neutralise formula injection: prefix cells beginning with `= + - @` (and tab/CR) with `'`.
- Write a UTF-8 BOM so spreadsheets open non-ASCII names correctly.
- Missing values export as empty cells, never `0`. Headers are human-readable.

---

## 10. Tests every table ships with

- Renders rows from mocked **hook/service** output (not a hardcoded array inside the component).
- Loading, empty, filtered-empty, error and permission-denied states.
- Sort toggles and blank-last ordering; filter + search narrowing; pagination boundaries.
- Server endpoint: rejects invalid paging params, clamps page size, returns `total`.
- Accessibility: header sort labels, focusable clickable rows, icon buttons have names.
