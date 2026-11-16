// Single source for card elevation and header bands across the app (admin +
// dashboard). Server-safe: plain class strings, no React.
//
// Elevation is three layers: a crisp 1px contact shadow, a soft mid shadow and a
// wide ambient shadow, so cards read as raised sections rather than flat boxes.

export const CARD_SHADOW =
  'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.12),0_24px_48px_-24px_rgba(15,23,42,0.18)]'

/** Slightly stronger lift for interactive cards on hover. */
export const CARD_SHADOW_HOVER =
  'hover:shadow-[0_1px_2px_rgba(15,23,42,0.08),0_12px_32px_-8px_rgba(15,23,42,0.18),0_32px_56px_-24px_rgba(15,23,42,0.22)]'

/** Standard card surface: white, hairline border, rounded, elevated. */
export const cardSurface = `rounded-2xl border border-slate-200/90 bg-white ${CARD_SHADOW}`

/** Tinted header band that marks the top of every card as its header. */
export const cardHeaderBand = 'border-b border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white'
