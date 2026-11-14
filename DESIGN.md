---
name: ai-support-agent
description: Multi-tenant, embeddable conversational voice and text AI support agent
colors:
  primary: "#194ad9"
  primary-dark: "#133cb4"
  primary-light: "#eef2ff"
  primary-medium: "#dbe5fe"
  secondary-teal: "#4CBAAB"
  secondary-teal-dark: "#3DA898"
  secondary-teal-light: "#EBF8F6"
  surface-bg: "#F0F2F5"
  surface-card: "#FFFFFF"
  surface-border: "#EDEBE9"
  surface-hover: "#F5F5F5"
  text-main: "#323130"
  text-sub: "#605E5C"
  text-muted: "#8A8886"
  status-online: "#107C10"
  status-recording: "#C4314B"
  status-warning: "#F7630C"
typography:
  display:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  bubble: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-mic:
    backgroundColor: "{colors.secondary-teal-light}"
    textColor: "{colors.secondary-teal}"
    rounded: "{rounded.lg}"
    padding: "8px 8px"
  bubble-assistant:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
  bubble-user:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
---

# Design System: ai-support-agent

## Overview
ai-support-agent provides a calm, responsive, and trustworthy conversational interface. It is engineered to seamlessly embed on client websites (via an iframe or floating widget) while adopting parent-brand identity through dynamic CSS variables (`--va-primary`). The aesthetic prioritizes high legibility, micro-interactions for speech state, and effortless voice-to-text transitions.

## Colors
- **Primary Brand (AIScripto Royal Blue):** `#194ad9`, with dark shade `#133cb4`, light tint `#eef2ff`, and medium tint `#dbe5fe`. Driven dynamically by CSS variables `rgb(var(--va-primary) / <alpha-value>)` for instant tenant re-theming.
- **Secondary Accent (Mint Teal):** `#4CBAAB`, dark `#3DA898`, light `#EBF8F6`. Used for support agent accents, mic button highlights, and active audio rings.
- **Surfaces & Shell:** `#F0F2F5` for canvas backgrounds, `#FFFFFF` for chat bubbles and cards, `#EDEBE9` for hairline dividers, `#F5F5F5` for hover states.
- **Neutrals & Text:** `#323130` for high-contrast body text, `#605E5C` for secondary labels, `#8A8886` for metadata and timestamps.
- **Semantic Status Signals:** `#107C10` (Online green dot), `#C4314B` (Recording/alert red dot), `#F7630C` (Warning/amber dot).

## Typography
- **Font Stack:** `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif`.
- **Hierarchies:**
  - **Header & Agent Title:** 14px / 16px, Semi-bold (600), tracking normal.
  - **Chat Message Body:** 14px (0.875rem), Regular (400), line height 1.5, with `[overflow-wrap:anywhere]` for unbreakable strings and URLs.
  - **Role & Metadata Labels:** 11px (0.6875rem), Medium (500), muted color `#8A8886`.
  - **Push-to-Talk Hints:** 11px, Semi-bold, animated pulse on recording.

## Layout
- **Widget Dimensions:** Clean 400px–440px width container with flexible viewport height (`min-h-dvh` in standalone, fixed or responsive drawer in floating embed).
- **Z-Index Hierarchy:** Floating launcher (`z-50`), drawer backdrop (`z-40`), modal dialogs (`z-50`), audio waveform indicators (`z-10`).
- **Transcript Scroll Area:** `flex-1 overflow-y-auto scrollbar-thin` with subtle 4px track, auto-scrolling smoothly on incoming streamed tokens and user inputs.

## Elevation & Depth
- **Card Shadow:** `0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)`
- **Message Bubble Shadow:** `0 1px 2px rgba(0,0,0,0.08)`
- **Header Shadow:** `0 2px 6px rgba(0,0,0,0.12)`
- **3D Chart Elements (Admin):** Glossy donut charts and extruded bar tracks with subtle gradient dropshadows (`drop-shadow(0 6px 12px rgba(15, 23, 42, 0.12))`).

## Shapes
- **Message Bubbles:** Asymmetrical radius for visual flow — Assistant bubbles use `rounded-2xl rounded-bl-sm` (16px corners, 2px anchor bottom-left); User bubbles use `rounded-2xl rounded-br-sm` (16px corners, 2px anchor bottom-right).
- **Interactive Controls:** Buttons and input bars use `rounded-xl` (12px); status pills and audio badges use `rounded-full` (9999px).

## Components
- **Microphone Button (`MicButton`):** Push-to-talk with dual-state feedback (idle teal icon vs active pulsating crimson ring `ring 1.4s ease-out infinite`).
- **Status Indicator (`StatusIndicator`):** Header badge displaying agent availability (green `● Online`, yellow `● Connecting`, crimson `● Recording`).
- **Audio Replay Button:** Subtle inline speaker icon button (`🔊 Listen`) attached to assistant messages for on-demand playback.
- **Typing Indicator (`TypingDots`):** Three animated 6px dots with staggered delay (`0s`, `0.2s`, `0.4s`) bouncing vertically during LLM thinking phases.

## Do's and Don'ts
- **DO** support multi-language text rendering cleanly, ensuring Arabic and Urdu fonts have proper line heights and punctuation alignment.
- **DO** handle browser autoplay restrictions gracefully: keep the agent in `Online` state and unlock pre-buffered speech on user gesture.
- **DON'T** display raw hidden tokens (`[LEAD:{...}]`, `[END_CALL]`) in chat bubbles or audio streams.
- **DON'T** hardcode fixed brand colors in component styles; always rely on theme variables (`var(--va-primary)`) to respect tenant styling.

