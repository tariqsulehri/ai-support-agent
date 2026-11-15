# 01 — UI/UX and Design System

> Stack-agnostic. Every rule is written as an outcome. Map it to the host's mechanism:
> CSS custom properties, a Tailwind theme, a CSS-in-JS theme object, SCSS variables, or a
> component-library theme (MUI, Vuetify, Ant, Chakra, Blazor, etc.).

---

## 1. Principles

1. **Tokens, never literals.** Components reference semantic tokens (`surface`, `text-1`,
   `danger`), never raw hex, `rgb(…)` numbers or palette classes (`bg-zinc-900`,
   `text-white`). Raw brand hex lives in **one** palette file only.
2. **One source per decision.** A size, colour, radius or spacing change is made once, in
   the token or shared component, and every screen follows.
3. **Space goes to the content.** Compact padding, small type, no line that holds one short
   item, no stacked bars above a table. The frame never competes with the data.
4. **Every state is designed.** Loading, empty, error, success, disabled, read-only and
   permission-denied are part of the design, not afterthoughts.
5. **Accessible by default.** WCAG 2.1 AA minimum: 4.5:1 for text, 3:1 for large text, UI
   borders, focus rings and chart marks. Keyboard reachable. Visible focus.

---

## 2. Colour and theming

### 2.1 Token set (semantic roles)

Define every colour as a **semantic role**. Store values as RGB triplets (or the host's
equivalent) so alpha can be applied: `rgb(var(--accent) / 0.4)`.

| Group | Tokens | Use |
|---|---|---|
| Canvas | `bg` | Page background behind cards |
| Surfaces | `surface`, `surface-2`, `surface-3`, `surface-inverse` | Cards/panels → inputs & table headers → hover/popovers → inverted tooltip |
| Borders | `border`, `border-2` | Default dividers → emphasised/input borders |
| Text | `text-1`, `text-2`, `text-3`, `text-inverse` | Primary → secondary → placeholder/disabled/meta → text on inverse surface |
| Brand accent | `accent`, `accent-h`, `accent-soft`, `accent-txt`, `accent-fg`, `accent-ring` | CTA fill → hover → tinted background → accent text on soft bg → text on accent fill → focus ring |
| Secondary brand | `brand-accent`, `brand-accent-txt`, `brand-accent-soft` | Secondary brand highlight (marks/large text only if contrast < 4.5:1) |
| Semantic | `success`, `warning`, `danger`, `info` + `-soft` + `-fg` each | Status only. `-soft` = tinted background, `-fg` = text on a solid fill |
| Overlay | `scrim` | Modal backdrop |
| Domain | e.g. `level-1…n`, `category-*` | Ordered or categorical domain colours, defined as tokens, never inline |

### 2.2 Reference palette (the look to reproduce)

Brand palette (only file allowed to contain raw hex):

| Name | Hex | Rule |
|---|---|---|
| Brand blue (primary) | `#0755E9` | Accent, CTAs, links |
| Deep blue | `#04338C` | Accent hover (light), gradient end |
| Brand orange | `#EE4200` | Marks and large text only (3.88:1 on white) |
| Text-safe orange | `#BE3500` | Orange text at body size |
| Feather grey | `#D2D9D9` | Dividers, surface-3 |
| Dark | `#1B1B1B` | Text-1 (light), surface (dark) |
| Blue tints | `#3977ED` `#6A99F2` `#9CBBF6` `#CDDDFB` `#E6EEFD` | Dark-mode accent text, soft fills |
| Grey tints | `#494949` `#767676` `#A4A4A4` `#D1D1D1` `#E8E8E8` | Neutral ramp |

Theme values:

| Token | Light | Dark |
|---|---|---|
| `bg` | `#F2F5F5` | `#141414` |
| `surface` / `surface-2` / `surface-3` | `#FFFFFF` / `#EEF1F1` / `#D2D9D9` | `#1B1B1B` / `#242424` / `#2E2E2E` |
| `border` / `border-2` | `#D2D9D9` / `#7E8A8A` | `#333333` / `#6B6B6B` |
| `text-1` / `text-2` / `text-3` | `#1B1B1B` / `#4A4A4A` / `#5E5E5E` | `#FFFFFF` / `#D1D1D1` / `#A4A4A4` |
| `accent` / `accent-h` | `#0755E9` / `#04338C` | `#0755E9` / `#2F6BE6` |
| `accent-soft` / `accent-txt` | `#E6EEFD` / `#0755E9` | `#0A2A66` / `#6A99F2` |
| `success` / `-soft` | `#15803D` / `#DCFCE7` | `#4ADE80` / `#052E16` |
| `warning` / `-soft` | `#A16207` / `#FEF9C3` | `#FACC15` / `#451A03` |
| `danger` / `-soft` | `#B91C1C` / `#FEE2E2` | `#F87171` / `#450A0A` |
| `info` | `#0755E9` | `#6A99F2` |
| `*-fg` (text on solid status fill) | `#FFFFFF` | `#141414` |

If the host already has a brand, **keep the host's brand hues** and apply this token
*structure*, contrast rules and usage rules. Do not overwrite another product's brand
without the owner's approval.

### 2.3 Theme rules

- Themes are token overrides keyed on a class/attribute on the root element (`.dark`,
  `[data-theme="dark"]`). Components never branch on theme in code for colour.
- Every theme defines **every** token. A test asserts token parity across themes.
- Persist the user's choice; apply it with a tiny pre-paint script (or SSR attribute) so
  there is **no flash of the wrong theme**.
- Theme change transitions background (~300 ms) and text (~200 ms) colour only.
- Retired themes may be hidden from the picker; do not delete their code without approval.
- Flat fills by default. At most one brand gradient (e.g. 135° accent → deep accent), used
  sparingly (hero/brand moments), never behind data.
- Hex colours stored in data (e.g. category colours set by admins) are tuned for light
  backgrounds. When used as text, mix toward the theme text colour:
  `color-mix(in srgb, <hex> 60%, rgb(var(--text-1)))`; as a background, use ~8–14% tint.

### 2.4 Contrast rules (test them, don't eyeball them)

- Text on its background ≥ 4.5:1 (≥ 3:1 for ≥ 18.66 px bold / 24 px regular).
- Borders that define a control, focus rings, chart marks, icons that carry meaning ≥ 3:1.
- Status is never colour alone: pair colour with an icon and/or a word.
- Ship an automated contrast test for each theme's key pairs (text-1/2/3 on bg, surface,
  surface-2; accent-txt on accent-soft; `-fg` on each status fill).

---

## 3. Typography

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 18–24 px | 600–700 | One per screen. Sentence case. |
| Section / panel title | 14–16 px | 600 | Sentence case; help "?" sits right after it |
| Body / controls / table cells | 12–14 px (dense screens: 12 px) | 400–500 | |
| Table header / overline / field label | 11–12 px | 600–700 | Uppercase + slight tracking allowed only here and on badges |
| Meta / caption / tooltip | 12 px | 500 | Never below 12 px in the brand theme |
| KPI value | 20–28 px | 600–700 | Tabular figures |

Rules:
- **Fonts:** one sans family for UI (reference: Poppins 400/500/600/700 for brand; Inter as
  neutral fallback), one mono family with tabular figures for numbers (reference: JetBrains
  Mono 500/600). Load brand fonts only when the brand theme is active. Always declare a
  system fallback stack.
- **Numbers use tabular figures** (`font-variant-numeric: tabular-nums`, or the mono font if
  the UI font lacks them) so columns line up and values don't jitter while updating.
- **12 px floor.** Nothing renders smaller, including chart ticks and badges.
- **Sentence case for headings** ("Promotion readiness", not "Promotion Readiness").
- **Weights:** cap at 700. No 800/900 "black" weights.
- **Line height:** 1.4–1.6 for body, 1.2–1.3 for headings and dense table rows.
- **Measure:** long-form text (help, descriptions) max ~65–75 characters per line.
- **Truncation:** single-line descriptions truncate with "…" and show the full text on hover;
  column headings in matrices wrap between words and are never cut.

---

## 4. Layout and spacing

- **Spacing scale:** 4 px base (4, 8, 12, 16, 20, 24, 32). No arbitrary pixel values.
- **Breakpoints:** sm 640, md 768, lg 1024, xl 1280, 2xl 1536. Below **768 px** the sidebar
  collapses and multi-column layouts stack.
- **App shell:** fixed full-viewport shell → top bar 56 px (title area, global search,
  user menu) + sidebar (≈320 px open / ≈68 px collapsed, 200 ms width transition) +
  scrolling content area.
- **Content width:** one constant for the whole app — full window width up to ~1700 px, then
  centred. Screens never set their own narrower wrapper. Padding 16 px (mobile) / 24 px.
- **Cards:** radius 12 px, 1 px `border`, light shadow, padding 12–16 px
  (`px-4 py-3` equivalent). Vertical gap between stacked cards 12 px.
- **Radii:** controls 8 px, cards 12 px, modals 16 px, badges/pills fully rounded.
- **Elevation (3 levels only):**
  - `card`: `0 1px 3px rgb(0 0 0/.07), 0 1px 2px -1px rgb(0 0 0/.07)`
  - `card-hover`: `0 4px 16px rgb(0 0 0/.12)`
  - `elevated` (popovers, toasts, tooltips): `0 8px 24px -4px rgb(0 0 0/.15), 0 2px 8px -2px rgb(0 0 0/.1)`
- **Control heights — exactly two sizes, both 12 px text:**
  - `sm` = 28 px (inside table rows and cards)
  - `md` = 36 px (toolbars, filter bars, forms)
  Controls that share a row share a size. Never set height/padding/font on a single control.
- **Screen header discipline:**
  - One title per screen. Sections do not repeat the screen title, description, search or count.
  - Max **two toolbars** above a table: Row 1 = context (scope picker) → status tabs with
    counts → primary action (far right). Row 2 = filter input + secondary filters → view
    controls (far right).
  - Put descriptions on the title's line; active filter chips on the filter heading line.
  - Hide controls that cannot narrow anything (a filter with one possible value).

---

## 5. Core components (build once, reuse everywhere)

| Component | Required behaviour |
|---|---|
| Button | Variants: primary (accent fill), secondary (surface-2 + border), ghost (text-2, hover surface-2), danger. 150 ms transition, 2 px focus ring in `accent-ring`, disabled 50% opacity + `not-allowed`. Primary hover may lift −1 px with an accent-tinted shadow. |
| Icon button | **Must** have a tooltip (`title`/aria-label). A lint/test enforces it. |
| Input / textarea | `surface-2` fill, 1 px border, radius 8 px, placeholder `text-3`; focus = accent border + 40% accent ring. Error = danger border + message below, linked via `aria-describedby`. |
| Select | **One** shared Select component decides size, font, colours and arrow. No hand-styled native selects. Searchable variant for > ~10 options. |
| Badge / status chip | Pill, 12 px semibold; variants accent/success/warning/danger/neutral (neutral = archived/draft/inactive). Soft background (~14% tint) + text mixed toward `text-1`. Colour + word (+ icon for status). |
| Tooltip | One global tooltip layer that reads `title`/aria attributes. 300 ms delay, inverse colours, max-width ~260 px, 12 px text, shows on keyboard focus as well as hover. |
| Modal / dialog | Portal; scrim ~70% + small blur; max-width ~520 px (wide variant ~860 px); radius 16 px. Closes via X, Cancel, Esc — **not** on backdrop click (protects unsaved input). Locks body scroll, traps focus, returns focus to the trigger. |
| Side panel | Right-hand drawer for row details; same close and focus rules as Modal. |
| Confirm dialog | Promise/hook based; variants danger (default for destructive), warning, info. States the consequence in words ("Deactivate 3 users?"). |
| Toast | Top-right stack, max 5, max-width ~420 px. Durations: success 4 s, info 4 s, warning 4.5 s, error 5 s, loading until resolved. Left colour bar + icon + message; pause on hover; `role="status"` (errors `role="alert"`). |
| Help button | Round "?" (24 px) right after every screen/panel/chart/KPI title. Opens a modal with four parts: **What it shows · What each part means · Example · What to do**. Help text lives in one file per screen and changes in the same commit as the screen. A bulb icon means "tip/insight", never help. |
| Page header / filter bar | One shared header and one shared filter bar per screen type, so spacing changes happen once. Table search placeholder reads "Filter …"; global search reads "Search …". |
| Empty state | Small illustration/brand mark + one sentence saying why it's empty + next action ("No people match this filter. Clear filters"). |
| Error state | Plain-English message (no stack/codes beyond a reference id) + Retry. |
| Skeleton | Shape-matched placeholder with a shimmer sweep (`surface-2` base, `surface-3` sweep, ~1.6 s). Reserves the final layout's exact height. |

---

## 6. Micro-interactions and motion

| Token | Value |
|---|---|
| Ease "smooth" | `cubic-bezier(.16, 1, .3, 1)` |
| Ease "spring" (sparingly) | `cubic-bezier(.34, 1.56, .64, 1)` |
| Fade-in | 200 ms opacity 0 → 1 |
| Slide-up (page/content entry) | 250 ms, 8–10 px + fade |
| Scale-in (modal box) | 200 ms, 0.97 → 1 + fade |
| Stagger children | 60 ms step, max 5 steps |
| Hover colour change | 100–150 ms |
| Shimmer | 1.5–1.6 s loop |

Rules:
- **States:** hover = one step up the surface ramp (or card-hover shadow); active/pressed =
  slight darken; focus = `:focus-visible` 2 px ring with 2 px offset in `bg`; selected nav
  item = `accent-soft` fill + `accent-txt` text + 3 px inset accent rail.
- **Edited-but-unsaved** fields: `warning` border, old value in the tooltip; the Save button
  shows "N unsaved" and is disabled when nothing changed.
- **Respect `prefers-reduced-motion`:** disable non-essential motion; attention effects
  (pulse/glow) only under `motion-safe`, max one per view.
- No layout-shifting animations (animate `opacity`/`transform` only).
- No glassmorphism or glow in the brand theme; keep surfaces flat and quiet.

---

## 7. Accessibility checklist (UI layer)

- Semantic elements first (`button`, `nav`, `table`, `dialog`), ARIA only to fill gaps.
- Every input has a visible label; every icon-only control has an accessible name.
- Full keyboard path: Tab order follows reading order; Enter/Space activate rows that open
  details; Esc closes overlays.
- Charts carry a text summary and a "view as table" alternative (see 03).
- Run an automated a11y scanner (axe or host equivalent) in tests and a11y lint rules.

---

## 8. Enforcement (port these guards to the host)

| Guard | What it checks |
|---|---|
| Raw-colour ratchet | Counts hex / `rgb()` numbers / palette classes per file against a baseline; count may only go down. Allowlist only the palette file and chart-colour modules. |
| Icon-button tooltip test | Every icon-only button has `title`/aria-label. |
| Token parity test | Every theme defines every token; theme-independent tokens defined once. |
| Contrast test | Key text/surface pairs ≥ 4.5:1 in every theme. |
| Control-scale test | Only the two control heights exist; no native selects left. |
| Dead-class check | Classes used in markup actually emit CSS. |
| Visual check | Screenshot each changed screen in every theme and at narrow + wide widths before calling UI work done. |
