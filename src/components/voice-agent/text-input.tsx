'use client'

import { memo, useState, useRef, useCallback, useImperativeHandle, forwardRef, useId } from 'react'
import type { Phase } from '@/types'

interface TextInputProps {
  phase:  Phase
  onSend: (text: string) => void
  /** Rendered between the textarea and the send button (e.g. the mic). */
  accessory?: React.ReactNode
}

export interface TextInputHandle {
  submit: () => void
}

const EMAIL_ATTEMPT_RE = /\S+@\S+/g
const VALID_EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function findInvalidEmails(text: string): string[] {
  // Ignore trailing sentence punctuation such as "me at a@b.com."
  return (text.match(EMAIL_ATTEMPT_RE) ?? [])
    .map((attempt) => attempt.replace(/[.,;:!?)\]]+$/, ''))
    .filter((attempt) => !VALID_EMAIL_RE.test(attempt))
}

/** Phases in which a typed message can be sent (speaking = interrupt + send). */
function canSendInPhase(phase: Phase): boolean {
  return phase === 'idle' || phase === 'error' || phase === 'speaking'
}

export const TextInput = memo(forwardRef<TextInputHandle, TextInputProps>(
  function TextInput({ phase, onSend, accessory }, ref) {
    const [value, setValue]           = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const errorId  = useId()

    const isDisabled = phase === 'connecting' || phase === 'ended'
    const isBusy     = phase === 'thinking' || phase === 'transcribing' || phase === 'listening'
    const hasText    = value.trim().length > 0
    const canSend    = hasText && canSendInPhase(phase)

    const handleSend = useCallback(() => {
      const text = value.trim()
      if (!text || !canSendInPhase(phase)) return
      const invalid = findInvalidEmails(text)
      if (invalid.length > 0) {
        setEmailError(`"${invalid[0]}" doesn't look like a valid email. Please check it.`)
        inputRef.current?.focus()
        return
      }
      // Clear immediately (optimistic) — the message appears in the transcript
      // in the same render via the hook's TRANSCRIBED dispatch.
      setValue('')
      setEmailError(null)
      onSend(text)
      inputRef.current?.focus()
    }, [value, phase, onSend])

    // Expose submit() for callers that trigger sending from outside
    useImperativeHandle(ref, () => ({ submit: handleSend }), [handleSend])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      setEmailError(null)
    }, [])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Don't hijack Enter while an IME composition is active
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault()
          handleSend()
        }
      }, [handleSend],
    )

    const placeholder =
      phase === 'ended'      ? 'Call completed'
      : phase === 'connecting' ? 'Connecting…'
      : phase === 'listening'  ? 'Listening…'
      : 'Type a message…'

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <div className={`flex-1 min-w-0 flex items-end rounded-xl border bg-surface-hover transition-colors
            ${emailError
              ? 'border-ms-red'
              : 'border-surface-border focus-within:border-ms-blue focus-within:ring-2 focus-within:ring-ms-blue/15'}`}>
            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              aria-label="Message"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? errorId : undefined}
              enterKeyHint="send"
              className="
                flex-1 resize-none bg-transparent px-3 py-2.5
                text-sm text-ms-text placeholder-ms-muted
                focus:outline-none disabled:opacity-50
                disabled:cursor-not-allowed leading-5
                max-h-28 overflow-y-auto
              "
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>

          {accessory}

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label={isBusy && hasText ? 'Send message (waiting for the agent)' : 'Send message'}
            title={isBusy && hasText ? 'Waiting for the agent…' : 'Send message'}
            className="
              shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
              bg-ms-teal text-white hover:bg-ms-teal-dk active:scale-95
              disabled:bg-surface disabled:text-ms-muted disabled:cursor-not-allowed disabled:active:scale-100
              transition-[transform,background-color] duration-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ms-blue focus-visible:ring-offset-2
            "
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true"
                 stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        {emailError && (
          <p id={errorId} role="alert" className="text-[11px] text-ms-red px-1">{emailError}</p>
        )}
      </div>
    )
  },
))
