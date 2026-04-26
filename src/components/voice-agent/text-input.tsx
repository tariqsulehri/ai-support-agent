'use client'

import { useState, useRef, useCallback } from 'react'
import type { Phase } from '@/types'

interface TextInputProps {
  phase:  Phase
  onSend: (text: string) => void
}

// Matches anything that looks like an email attempt: word@anything
const EMAIL_ATTEMPT_RE = /\S+@\S+/g
// RFC-5321-compliant enough for UX validation
const VALID_EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function findInvalidEmails(text: string): string[] {
  const attempts = text.match(EMAIL_ATTEMPT_RE) ?? []
  return attempts.filter((a) => !VALID_EMAIL_RE.test(a))
}

export function TextInput({ phase, onSend }: TextInputProps) {
  const [value, setValue]     = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isDisabled = phase === 'connecting' || phase === 'thinking' || phase === 'transcribing'
  const canSend    = value.trim().length > 0 && (phase === 'idle' || phase === 'error')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Clear the error as soon as user starts correcting
    if (emailError) setEmailError(null)
  }, [emailError])

  const handleSend = useCallback(() => {
    if (!canSend) return

    const invalid = findInvalidEmails(value.trim())
    if (invalid.length > 0) {
      setEmailError(
        `"${invalid[0]}" doesn't look like a valid email address. Please check and re-type it.`
      )
      inputRef.current?.focus()
      return
    }

    onSend(value.trim())
    setValue('')
    setEmailError(null)
    inputRef.current?.focus()
  }, [canSend, value, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          disabled={isDisabled}
          className={`
            flex-1 resize-none rounded-xl bg-surface-card
            border px-4 py-3 text-sm text-gray-200 placeholder-gray-600
            focus:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed
            leading-5 max-h-32 overflow-y-auto transition-colors
            ${emailError
              ? 'border-red-500 focus:border-red-400'
              : 'border-surface-border focus:border-indigo-500'
            }
          `}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="
            shrink-0 flex items-center justify-center
            w-11 h-11 rounded-xl
            bg-indigo-600 hover:bg-indigo-500
            disabled:bg-surface-raised disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {emailError && (
        <p className="text-xs text-red-400 px-1">
          {emailError}
        </p>
      )}
    </div>
  )
}
