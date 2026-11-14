# LLM and voice providers stack module (OpenAI, Groq, ElevenLabs)

**Status:** vetted
**Last reviewed:** 2026-11-08
**Author:** audit kit maintainer

**Detection signals:** `package.json` with `openai`, `@elevenlabs/elevenlabs-js` (or `elevenlabs`), `groq-sdk`, `@anthropic-ai/sdk`, `ai` (Vercel AI SDK); env names `OPENAI_API_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`; calls to `chat.completions.create`, `responses.create`, `audio.transcriptions.create`, `audio.speech.create`, `textToSpeech.convert`, `embeddings.create`; browser `MediaRecorder`, `SpeechRecognition`, `speechSynthesis`.

**Loads with dimensions:** ai-llm, security, cost, reliability, compliance, performance.

## Vulnerability and defect patterns

### Security
- API key sources: `new OpenAI({ apiKey })` where the key comes from a tenant config file in git, a request header, or `NEXT_PUBLIC_*`. Keys must come from server env or a secret store.
- `dangerouslyAllowBrowser: true` on the OpenAI client: key in the browser.
- Client posts the whole `messages` array (including `system` or `assistant` roles) and the server forwards it: prompt and role forgery. The server should build the system prompt itself and accept only `user`/`assistant` text with length caps.
- Hidden control tokens (`[END_CALL]`, `[LEAD:{...}]`, JSON tags) parsed with a loose regex and `JSON.parse` with no schema: crafted input can inject fields or crash the parser.
- Provider error bodies (`err.message`, `err.response`) returned to clients: can contain request ids, org ids or key prefixes.

### Cost
- `max_tokens` / `max_output_tokens` unset on chat calls.
- No size or duration limit on audio uploaded to `audio.transcriptions.create` (Whisper bills per minute, 25 MB file limit).
- No length limit on text sent to TTS (`audio.speech.create` max 4096 chars; ElevenLabs bills per character).
- Re-synthesising the same greeting or fixed phrases on every call instead of caching audio.
- Summary or classification calls repeated per turn rather than once at the end.
- Per-tenant keys falling back silently to the platform key: tenant usage billed to the platform.

### Reliability
- No `timeout` / `maxRetries` set on the SDK client (OpenAI SDK default timeout is 10 minutes, 2 retries).
- Streaming: `for await (const chunk of stream)` with no abort on client disconnect (`req.signal`, `stream.controller.abort()`).
- Quota (`429 insufficient_quota`), invalid key (`401`), and rate limit (`429`) not told apart; user sees a generic error or silence.
- TTS provider failure with no fallback to a second provider or to text.
- Sentence splitting for streamed TTS that breaks on abbreviations, numbers or non-Latin scripts (Urdu, Arabic, Hindi), causing gaps or repeated audio.

### Data and compliance
- Raw audio, transcripts and contact details sent to providers: record which provider gets what; check zero-retention settings where offered.
- Transcripts stored in full in the database with no retention rule.
- Language detection (`franc` or similar) on very short text is unreliable; check fallbacks.

### Browser audio
- `getUserMedia` called without a user gesture or without handling permission denial.
- `MediaRecorder` mime type assumed (`audio/webm`) though Safari records `audio/mp4`; server must accept both.
- Audio elements and object URLs not revoked (`URL.revokeObjectURL`): memory growth in long sessions.
- Recording caps enforced only by a client timer.

### Testing
- No mock provider for tests; no golden-transcript test of the prompt and token output.

## Framework misconfigurations

- Model names hard-coded in several files instead of one config constant.
- `temperature` high on classification or extraction calls that should be deterministic.
- `response_format: { type: 'json_schema' }` or structured outputs not used where JSON is required.

## Scanner and project commands

Never call a paid provider during an audit. Do not run CLI scripts that call providers (for example `cli:voice`, `cli:text`) unless the user approves and a test key with a spend cap is used.

## Where to look first

- Clients: `src/lib/ai/client.*`, `src/lib/ai/*`.
- Prompts: `src/lib/config/prompt.*`, tenant config files.
- Routes: chat, transcribe, speak, summarize, embed handlers.
- Browser: hooks for recorder, player, speech recognition.

## Looks wrong but is fine

- An empty `openaiApiKey: ""` in a committed tenant file, when the code falls back to the server env key on purpose.
- Greeting text played verbatim without an LLM call (saves cost).
- `gpt-4o-mini` or a similar small model for chat in a voice agent (latency and cost trade-off).

## Version notes

- OpenAI Node SDK v4 vs v5+: import paths, `responses` API and error classes changed.
- ElevenLabs JS SDK v2 renamed the package to `@elevenlabs/elevenlabs-js` and changed method names.
- Verify against the installed version.
