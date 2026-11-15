/**
 * Network helpers for useVoiceAgent: JSON parsing with useful errors and an
 * abortable Server-Sent-Events reader for /api/chat.
 */

type ApiErrorBody = {
  error?: string
  detail?: string
}

const MAX_KEEPALIVE_BODY_BYTES = 60_000

export function keepaliveForBody(body: string): Pick<RequestInit, 'keepalive'> {
  return body.length <= MAX_KEEPALIVE_BODY_BYTES ? { keepalive: true } : {}
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error) {
    return err.name === 'AbortError' || /abort|aborted|canceled|cancelled/i.test(err.message)
  }
  return typeof err === 'string' && /abort|aborted|canceled|cancelled/i.test(err)
}

export async function readJsonResponse<T>(res: Response, endpoint: string): Promise<T> {
  const text = await res.text()
  let data: unknown = null

  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Invalid JSON from ${endpoint}`)
    }
  }

  if (!res.ok) {
    const apiError = data as ApiErrorBody | null
    throw new Error(apiError?.detail ?? apiError?.error ?? `${endpoint} failed (${res.status})`)
  }

  if (data === null) {
    throw new Error(`Empty response from ${endpoint}`)
  }

  return data as T
}

export async function readErrorText(res: Response, endpoint: string): Promise<string> {
  const text = await res.text().catch(() => '')
  return text.trim() || `${endpoint} failed (${res.status})`
}

/**
 * Iterates `data: {...}` SSE events from a response body. Each read is bounded
 * by `readTimeoutMs`; on timeout, abort or early exit the underlying reader is
 * cancelled so the connection is released instead of leaking.
 */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
  readTimeoutMs: number,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>> {
  const reader  = body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  try {
    while (true) {
      if (signal?.aborted) return
      const { done, value } = await readWithTimeout(reader, readTimeoutMs)
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue
        let event: Record<string, unknown>
        try {
          event = JSON.parse(part.slice(6))
        } catch {
          continue
        }
        yield event
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Chat response timed out. Please try again.'))
    }, timeoutMs)

    reader.read()
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout))
  })
}

/** File name whose extension matches the recorder's container, for Whisper. */
export function audioFileName(blob: Blob): string {
  const type = blob.type.toLowerCase()
  if (type.includes('mp4') || type.includes('aac') || type.includes('m4a')) return 'audio.mp4'
  if (type.includes('ogg')) return 'audio.ogg'
  if (type.includes('wav')) return 'audio.wav'
  return 'audio.webm'
}
