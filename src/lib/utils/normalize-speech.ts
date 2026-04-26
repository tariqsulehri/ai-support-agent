/**
 * Normalizes common Whisper transcription artifacts, particularly around
 * email addresses and special characters that are spoken aloud.
 *
 * Whisper frequently produces these variants for email addresses:
 *   "word @ word.com"        (spaces around @)
 *   "word at word.com"       ("at" spoken instead of @)
 *   "word.word gmail.com"    (@ dropped entirely)
 *   "word dot word at gmail dot com"  (all symbols spoken as words)
 */
export function normalizeSpeechTranscript(text: string): string {
  let result = text

  // ── Step 1: "dot" spoken as a word in domain/email context ────────────────
  // "gmail dot com" → "gmail.com"  |  "tariq dot sulehri" → "tariq.sulehri"
  // Only between alphanumeric tokens (avoids replacing "dot" in normal sentences)
  result = result.replace(
    /([a-zA-Z0-9_+-])\s+dot\s+([a-zA-Z0-9])/gi,
    '$1.$2'
  )

  // ── Step 2: spaces around @ ────────────────────────────────────────────────
  // "word @ word" → "word@word"
  result = result.replace(/(\S+)\s+@\s+(\S+)/g, '$1@$2')

  // ── Step 3: "at" spoken as @ in email context ─────────────────────────────
  // "tariq.sulehri at gmail.com" → "tariq.sulehri@gmail.com"
  // Guard: local part must already contain . _ + or - (typical email username)
  // and domain must look like domain.tld
  result = result.replace(
    /([a-zA-Z0-9][a-zA-Z0-9._+-]*[._+-][a-zA-Z0-9._+-]*)\s+at\s+([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/gi,
    '$1@$2'
  )

  // ── Step 4: @ dropped entirely ────────────────────────────────────────────
  // "tariq.sulehri gmail.com" → "tariq.sulehri@gmail.com"
  // Guard: local must contain . _ or - so we don't join normal word pairs
  result = result.replace(
    /([a-zA-Z0-9][a-zA-Z0-9._-]*[._-][a-zA-Z0-9._-]+)\s+([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g,
    (match) => (match.includes('@') ? match : match.replace(' ', '@'))
  )

  // ── Step 5: stray space between domain and TLD ────────────────────────────
  // "gmail .com" inside an email → "gmail.com"
  result = result.replace(/([\w-]+)\s+\.(com|org|net|io|co|uk|us|edu|gov|dev|app)\b/gi, '$1.$2')

  return result
}
