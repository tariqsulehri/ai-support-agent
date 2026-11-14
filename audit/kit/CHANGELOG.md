# Changelog

## 0.2.0 (2026-11-08)

- New dimension `ai-llm` (prefix `AIL`): prompt injection, output handling, control tokens, data sent to model providers, unbounded consumption, model-call reliability, evaluation. Wired into `tools/build-report.mjs`, `templates/findings.schema.json`, `core/05-finding-schema.md` and `core/02-discovery.md`.
- New stack modules: `stacks/nextjs.md` (App Router, middleware, route handlers, Vercel limits), `stacks/mongodb-mongoose.md`, `stacks/llm-voice-providers.md` (OpenAI, Groq, ElevenLabs, browser audio).
- Discovery: detection signals for Next.js, MongoDB/Mongoose and AI providers; new project type `ai-agent`.
- `PROMPTS.md`: removed hard-coded paths from a previous project, now uses `<KIT>`; added prompt 19 (AI and LLM features only).

## 0.1.0

- First release.
