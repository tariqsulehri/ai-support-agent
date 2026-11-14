# AI and LLM features
**Finding ID prefix:** AIL
**Applies when:** the system calls a language model, speech-to-text, text-to-speech, embedding or other AI model service, or builds prompts from user or tenant input. Otherwise record "not applicable".

## Goal
Find where model behaviour can be steered by an attacker, where model output is trusted more than it should be, where personal data leaks to a provider, and where a conversation can run up an unbounded bill or fail with no fallback. Treat the model as an untrusted component that sits between user input and your code.

Use the OWASP Top 10 for LLM Applications as the vocabulary (prompt injection, sensitive information disclosure, improper output handling, excessive agency, system prompt leakage, unbounded consumption).

## What to check

### Prompt construction and injection (LLM01, LLM07)
- [ ] Is user input kept in the `user` role, never concatenated into the `system` prompt?
- [ ] Is tenant-controlled text (knowledge base, custom instructions, greeting) separated from platform rules, so one tenant's text cannot override safety or output-format rules?
- [ ] Can a user make the model reveal the system prompt, other tenants' data, internal tokens or keys? Is anything secret placed in the prompt at all?
- [ ] Are earlier turns (history sent back by the client) trusted? Can the client forge `assistant` or `system` messages in the history it posts?
- [ ] Is retrieved content (knowledge base, search, documents) treated as data, with indirect injection considered?

### Output handling (LLM05, LLM06)
- [ ] Is model output that drives code (structured tokens, JSON, tool calls, flags such as "end call", "escalate", "send email") parsed strictly and validated with a schema before use?
- [ ] Can a user make the model emit a control token on demand (for example ask it to "say [END_CALL]" or to print a fake lead record)? What happens downstream?
- [ ] Is model output rendered as text, never as HTML or Markdown that runs script?
- [ ] Do actions taken on model output (database writes, emails, tickets, escalations) have limits and an owner check, so a crafted conversation cannot spam or overwrite records?
- [ ] Are hidden or internal tokens stripped from everything the user sees and hears, including partial streamed chunks and TTS input?

### Sensitive data (LLM02)
- [ ] Which personal data goes to each provider (voice audio, transcripts, names, phone numbers, emails)? Is it the minimum needed?
- [ ] Is the provider's data retention and training setting known and recorded?
- [ ] Are transcripts and recordings stored, for how long, and who can read them?
- [ ] Are provider API keys (platform and per-tenant) kept server-side only, never in client bundles, JSON shipped to the browser, logs or error messages?

### Unbounded consumption and cost (LLM10)
- [ ] Are there caps per request (input length, audio size and duration, `max_tokens`, TTS text length) enforced on the **server**, not only in the UI or the prompt?
- [ ] Are there caps per session, per tenant and per IP (turns, minutes, requests per minute)?
- [ ] Is a conversation limit that lives only in the prompt ("end after 5 exchanges") backed by a server-side check?
- [ ] Can an anonymous caller reach a paid endpoint (chat, transcribe, speak, embed) directly, outside the UI?
- [ ] Is the cheapest adequate model used per task, and is the model name configured in one place?

### Reliability of model calls
- [ ] Do provider calls have timeouts, a bounded retry policy, and a clear user-facing fallback for quota, invalid key, rate limit and outage errors?
- [ ] Are streaming responses (SSE) closed and cleaned up when the client disconnects, so the provider stream is aborted too?
- [ ] Does a provider failure mid-conversation lose captured data (leads, reviews), or is it saved?
- [ ] Is a fallback provider used (for example a second TTS or chat provider), and does it keep the same safety rules?

### Quality and evaluation
- [ ] Is there a repeatable test set of conversations (golden transcripts) that checks the prompt still produces correct structured output, language and tone after changes?
- [ ] Are classification outputs (sentiment, category, rating) checked against known labels, or trusted blindly in dashboards?
- [ ] Are language detection and multilingual behaviour tested for each supported language?
- [ ] Is prompt text versioned and reviewed like code?

## Severity guidance
| Situation | Severity |
|---|---|
| Provider API key exposed to the browser or committed to source | Critical |
| Anonymous unlimited access to a paid model endpoint on the internet | High |
| User can forge history or control tokens that write records or send emails | High |
| Cross-tenant data or prompt disclosure through the model | High |
| Conversation cap enforced only in the prompt | Medium |
| No golden-transcript test for structured output | Medium |
| Model name hard-coded in several places | Low |

## Common false positives
- "System prompt can be extracted" when the prompt holds no secret and no other tenant's data: report as Low at most.
- Hallucination in free-text replies that the product already labels as AI-generated and never acts on.
- A key in `.env.example` with an obvious placeholder value.

## Strengths to look for
- Server-side caps on input size, tokens, turns and minutes, with tests.
- Strict schema validation of every structured token before it is used.
- Per-tenant isolation of prompts, keys and data.
- Clear fallbacks for quota and key errors, with no stack traces to users.
- A golden-transcript or eval suite run in CI.

## Scorecard hints
- **1:** Paid endpoints open with no caps; model output written to the database or emailed without validation; keys reachable by clients.
- **3:** Keys server-side and output parsed, but limits mostly in the prompt or UI; no eval suite; partial fallbacks.
- **5:** Server-enforced limits, validated structured output, minimal data to providers with known retention, tested fallbacks and a regression eval suite.
