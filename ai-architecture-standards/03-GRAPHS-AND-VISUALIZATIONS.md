# 03 — Graphs and Visualizations

> Applies to charts, KPI/stat tiles, meters, sparklines and dashboards. Map to the host's
> chart library (Recharts, Chart.js, ECharts, ApexCharts, D3, Highcharts, Plotly, etc.).
> **Audit the data before styling the chart:** binning, aggregation, scale, population and
> null-vs-zero are correctness issues, not taste.

---

## 1. Zero hardcoded charts

- Every chart consumes **live** data via the host's data layer → a **pure adapter** →
  the chart component:

  ```
  API / query / store  →  hook/service (fetch, cache, auth gate)
                       →  adapter (pure function: domain rows → series, summary, table)
                       →  ChartCard (frame + states)  →  chart primitive
  ```

- Adapters are pure, typed and unit-tested. They live next to the component
  (`<chart>Data.ts`), return `{ series, summary, table }`, and never fetch.
- No literal data points, no "demo" series, no hardcoded axis maxima, no invented trend.
- **Don't recompute business metrics in the chart.** Use the server's flags/values or the one
  shared domain helper. One metric has one definition across the app.
- Component props default to `0`, `null` or `false` only — never a realistic-looking number.

### 1.1 Data-truth rules

| Rule | Why |
|---|---|
| **Null is not zero.** Unmeasured values are dropped from the series (no bar, no spoke, gap in line) and labelled "Not assessed" / "—". | A zero bar paints an unmeasured item as a failure. |
| **Same population.** Two numbers side by side (achieved vs target, A vs B) cover the same set of items. Each rate's denominator is the items actually measured; the chart states the population ("of 42 assessed"). | Mixed populations produce impossible comparisons. |
| **Unit discipline.** Know whether a field is a fraction (0–1) or a percent (0–100). Use typed/branded helpers to convert; never guess from the value. | Fraction passed to a percent formatter shows 0%/1%; percent passed to a fraction threshold rates everyone top. |
| **Small groups are suppressed.** Below a minimum group size (e.g. 3) show a lock and no figures. | Privacy and statistical noise. |
| **No trend from one point.** A line needs ≥ 2 periods. | A single point implies a trend that doesn't exist. |
| **Totals are passed, not re-summed** from a truncated/paged table. | Paging hides rows. |
| **Missing fields from an older API are omitted, not guessed.** | Guessing is fake data. |

---

## 2. Every chart's frame (ChartCard)

Build one shared frame and use it for every chart. Required inputs:

| Input | Purpose |
|---|---|
| `title` | Sentence case, followed by the help "?" |
| `definition` | One sentence: what is measured, for whom |
| `help` | Modal content: What it shows · What each part means · Example · What to do |
| `summary` | Screen-reader text summary (figcaption) of the key takeaway |
| `table` | `{ headers, rows }` — the same numbers as a table ("View as table" toggle) |
| `state` | `ready \| loading \| empty \| error` |
| `onRetry` | For the error state |
| `csvName` (optional) | Enables "Download as CSV" from `table` |

State rendering:

| State | UI |
|---|---|
| loading | Skeleton at the chart's final height (no CLS) |
| empty (no data) | "No data to show yet." + brand mark + why/next step |
| zero (data exists, all values 0) | Render the chart with a true zero baseline and say "All values are 0" — distinct from empty |
| error | Plain message + Retry button |
| ready | Chart + summary + table toggle + optional CSV |

---

## 3. Visual consistency

### 3.1 Colour

- Chart colours come from one **chart-colour module** + a **theme hook** that returns
  light/dark values (SVG attributes often can't read CSS variables, so this module is the
  one place hex is allowed besides the brand palette).
- **Categorical palette** (reference, 8 slots):
  - Light: `#0755E9 #EE4200 #0F9F8F #B87A00 #D6458C #2F8F2F #7A4FD6 #E34948`
  - Dark:  `#3977ED #E04E14 #13A08F #C98500 #D55181 #2E9A2E #9085E9 #E66767`
- Assign colours **by fixed slot per category** (stable across screens and filters), never
  by cycling or by sorted value.
- **Status colours (success/warning/danger) are reserved** for good/bad state and always ship
  with an icon or label. Never use them as "series 4" or inside a categorical ramp.
- **Diverging** (shortfall vs surplus): use a colour-blind-safe pair (e.g. amber vs cyan),
  not red vs green.
- **Sequential/severity** ramp: single hue, light → dark (e.g. `#F16833 → #5E1A00`).
- **Target/reference lines:** neutral grey (`#767676`), solid or labelled — not a status colour.
- **One series, one colour.** A histogram is one series; don't colour each bar differently.
- **Validate palettes, don't pick by eye:** adjacent slots must stay distinguishable under
  deuteranopia, protanopia and tritanopia, and each mark ≥ 3:1 against the surface. Keep a
  runnable validator and re-run it on any palette change.

### 3.2 Chrome (quiet by default)

- Grid: solid hairline in the theme grid colour (light `#D2D9D9`, dark `#333333`). Dashed
  lines are reserved for thresholds/targets.
- Axis text `text-3`-ish (light `#5E5E5E`), **≥ 12 px**. No axis lines where gridlines suffice.
- Bars: 4 px rounded data ends, 2 px surface-coloured gap between adjacent fills.
- Thin lines (1.5–2 px), small dots only on hover or for sparse series.
- No 3D, no drop shadows on marks, no gradients in data fills.

### 3.3 Axes and number formatting

- Use shared formatters — never build `${v}%` strings by hand:
  - Percent: integer by default (`42%`); 1 dp only where differences are sub-percent.
  - Scores stored with 2 dp may display 2 dp; round half-up consistently.
  - Currency: locale + ISO currency, compact notation on axes (`$1.2M`), full value in tooltip.
  - Large counts: compact on axes (`12.4k`), exact in tooltip/table.
  - Dates: one app-wide format; axis ticks at natural intervals (day/week/month); time zone stated if it matters.
- Bar charts start at **zero**. Line charts may use a fitted domain but must show it.
- **Fit the domain to the data** (an axis to 4 when the max is 1 hides the signal).
- **Uniform bins** for histograms; two distributions on one screen bin identically.
- **Ordinal scales are not percentages.** Levels (A1–C2, L1–L5, bronze/silver/gold) are
  drawn as segmented meters or ordered categories, never on a 0–100 bar.

### 3.4 Tooltips and legends

- Tooltip: themed surface, radius ~12 px, padding 8×12 px, 12 px text, elevated shadow.
  Shows series name + colour key, exact formatted value, and the denominator
  ("12 of 40 people · 30%"). Keyboard and touch accessible.
- Legend: top-left or top-right above the plot, in series order; omit for a single series
  (the title names it). Prefer direct labels at line ends when ≤ 4 series.
- Labels never overlap: rotate/abbreviate ticks with full text in tooltip, or switch to a
  horizontal bar chart for long category names.

### 3.5 Responsiveness

- Charts sit in a responsive container that measures its parent; height is fixed per chart
  type (reserved before data arrives).
- On narrow screens: reduce tick density, move legend below, switch long-label bars to
  horizontal, allow horizontal scroll only for wide time series.
- Redraw on container resize (ResizeObserver), throttled.

---

## 4. Chart selection matrix

| Question the user asks | Use | Avoid |
|---|---|---|
| How does a value change over time? | **Line** (≤ 5 series); **area** only for one series or cumulative volume | Stacked areas with > 3 layers (unreadable middles) |
| How do categories compare? | **Horizontal bar** (sorted, long labels) / vertical bar (few short labels) | Pie with > 3 slices |
| What is the ranking? | **Ranked bar list** with values at bar end | Radar |
| What is the part-to-whole of one total? | **Stacked 100% bar** or single stacked bar; **donut** only for 2–4 parts with a centre total | Donut with 1 slice (use a stat tile), > 5 slices |
| How do parts-to-whole compare across groups? | **Stacked bar per group** (≤ 5 segments) | Multiple pies |
| How is a value distributed? | **Histogram** (uniform bins) or strip/dot plot | Line chart over bins |
| Is one value on track vs target? | **Bullet chart** / progress bar with target marker, or KPI tile with "/ target" | Gauge |
| Where is an item on an ordered scale? | **Segmented ordinal meter** | 0–100 bar |
| How do two measures relate? | **Scatter** | Dual-axis lines |
| Multi-dimension profile (6–8 axes) | **Radar** only if 3–8 axes; otherwise ranked bars | Radar with > 8 axes |
| A single number matters | **KPI tile** | Any chart |
| Many items × many measures | **Heatmap/matrix** with sequential colour + numbers | Grouped bars with many series |

---

## 5. KPI / stat tiles

- Inputs: `label`, `value` (pre-formatted string), optional `sub` ("/ 70% target"), `note`,
  `status` chip (colour + word), `share` bar (0–100), `icon`, `onClick`, `help`.
- **No data → "—", never 0.** The help explains what "—" means.
- Value in tabular figures; label sentence case; one tile = one metric definition.
- A clickable tile is a real button (keyboard + focus ring) that opens the detail/report it
  summarises; the help "?" sits beside the button, not inside it.
- A row of tiles uses one size; no tile grows the row height with an extra line.

---

## 6. Dashboard composition

- Answer the reader's top question first (top-left), then supporting detail. Max ~6–8
  visuals per view; drill-down for more.
- **The server decides scope** (what this user may see); the dashboard never filters a
  bigger dataset client-side for authorisation.
- A tile that repeats a full report becomes a summary that opens the report.
- One shared filter bar per dashboard; every visual on it obeys the same filters and states
  the active population.
- Every chart and tile has a help "?".

---

## 7. Tests every chart ships with

- Adapter unit tests: normal rows, empty input, all-null field, zero values, mixed
  population, unit conversion (fraction ↔ percent), small-group suppression.
- Component tests: loading/empty/zero/error/ready render; summary text; table toggle shows
  the same numbers; help button exists with label "Help: <title>".
- Palette validator test; minimum font size test for chart text in the brand theme.
