# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Website Visitors & Customers**: End users interacting with the embeddable voice and text agent on customer websites seeking instant support, business inquiries, service details, or issue resolution.
2. **Tenant Administrators & Business Operators**: Companies configuring AI agent personas, knowledge base entries, tone, supported languages, voices, and reviewing conversation transcripts and captured leads.
3. **Platform Administrators**: Superusers managing multi-tenant provisioning, encrypted secret keys, database connections, system health, and usage metrics.

## Product Purpose

ai-support-agent is a production-grade, multi-tenant AI voice and text customer support system. It delivers real-time, low-latency conversational audio streaming (Whisper STT, GPT-4o-mini, OpenAI TTS / ElevenLabs) with automatic language detection, intelligent lead capture, automated call summarization, and strict multi-tenant data isolation.

## Positioning

An enterprise-ready, embeddable voice support agent combining real-time streaming speech with strict multi-tenant data sovereignty (tenant-isolated database routing), zero-plaintext secret architecture, and resilient browser autoplay compliance.

## Operating Context

- **Embeddable Web Widget (`/voice`)**: Iframe-embedded across client sites in inline or floating launcher modes, inheriting parent-page branding via CSS variables (`--va-primary`), with push-to-talk microphone, text fallback, and audio replay.
- **Admin Management Console (`/admin`)**: Analytical dashboard featuring KPI metrics, glossy 3D chart geometry, tenant configuration editors, and encrypted secret management.
- **Hands-Free CLI Agents (`src/cli/voice.ts`, `src/cli/text.ts`)**: Direct terminal voice/text agent execution with Sox VAD audio recording and macOS `afplay`.

## Capabilities and Constraints

- **Capabilities**:
  - Hands-free Voice Activity Detection (VAD) and push-to-talk recording.
  - Multi-language auto-detection (`franc`) supporting English, Urdu, Arabic, Spanish, French, German, Hindi, and 10+ additional languages.
  - Hidden token extraction protocol (`[LEAD:{...}]`, `[END_CALL]`) for structured CRM data capture without polluting user-facing transcripts.
  - Automated post-call summarization and email dispatch via Nodemailer SMTP.
  - Dynamic tenant database routing to dedicated MongoDB Atlas or self-hosted clusters, with resilient platform database fallback.
  - AES-256-GCM encrypted secrets vault for OpenAI API keys, database connection strings, and SMTP passwords.
- **Constraints**:
  - **Browser Autoplay Policy**: Modern browsers restrict unmuted audio playback prior to initial user interaction. The system eagerly buffers greeting audio, transitions cleanly to idle (`● Online`), and triggers playback upon first user gesture (`click`, `pointerdown`, `keydown`, `touchstart`) or via a dedicated "Listen" button.
  - **Connection Boundaries**: Network database connections enforce strict timeouts (`serverSelectionTimeoutMS: 5000`) and cache connection promises by URI hash to avoid socket exhaustion in serverless/SSR environments.

## Brand Commitments

- **Visual Identity**: Clean, modern, trustworthy, and solution-oriented.
- **Palette**: Signature AIScripto Royal Blue (`#194ad9`) paired with Mint/Teal accents (`#4CBAAB`), soft neutral surfaces (`#F0F2F5`, `#FFFFFF`), and subtle borders (`#EDEBE9`).
- **Typography**: Clean, readable system font stack (`Segoe UI`, `-apple-system`, `BlinkMacSystemFont`, `Inter`, sans-serif) optimized for high legibility across diverse scripts (Latin, Arabic, Urdu).

## Evidence on Hand

- Production web widget at `src/components/voice-agent/` and `/voice`.
- Admin console at `src/app/admin/` and `src/components/admin/`.
- Native MongoDB v7 data layer at `src/lib/db/` and `src/lib/tenants/`.
- Live tenant test records (AI-Scripto Automations, Vital Steer Technologies) with 60+ knowledge base entries and active encrypted secrets.

## Product Principles

1. **Never Drop Customer Data**: If a tenant's external database cluster is unreachable (e.g. firewall or network boundary), fall back gracefully to the platform store so customer leads and transcripts are preserved.
2. **Sub-Second Perceived Latency**: Stream chat completions via SSE and buffer TTS chunks eagerly ahead of playback.
3. **Strict Multi-Tenant Sovereignty**: Secrets are encrypted at rest; credentials and tenant conversations remain strictly isolated.
4. **Resilient Interaction**: If audio playback is blocked by browser autoplay rules, remain online, display the greeting, and unlock audio immediately upon the first user gesture.
