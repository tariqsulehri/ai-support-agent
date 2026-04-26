'use client'

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import type { Phase } from '@/types'

interface TextInputProps {
  phase:  Phase
  onSend: (text: string) => void
}

export interface TextInputHandle {
  submit: () => void
}

const EMAIL_ATTEMPT_RE = /\S+@\S+/g
const VALID_EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function findInvalidEmails(text: string): string[] {
  return (text.match(EMAIL_ATTEMPT_RE) ?? []).filter(a => !VALID_EMAIL_RE.test(a))
}

export const TextInput = forwardRef<TextInputHandle, TextInputProps>(
  function TextInput({ phase, onSend }, ref) {
    const [value, setValue]           = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const isDisabled = phase === 'connecting' || phase === 'thinking' || phase === 'transcribing'
    const canSend    = value.trim().length > 0 && (phase === 'idle' || phase === 'error')

    const handleSend = useCallback(() => {
      if (!canSend) return
      const invalid = findInvalidEmails(value.trim())
      if (invalid.length > 0) {
        setEmailError(`"${invalid[0]}" doesn't look like a valid email. Please check it.`)
        inputRef.current?.focus()
        return
      }
      onSend(value.trim())
      setValue('')
      setEmailError(null)
      inputRef.current?.focus()
    }, [canSend, value, onSend])

    // Expose submit() so the parent's send button can trigger it
    useImperativeHandle(ref, () => ({ submit: handleSend }), [handleSend])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      if (emailError) setEmailError(null)
    }, [emailError])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
      }, [handleSend]
    )

    return (
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className={`flex items-end rounded-xl border bg-surface-hover transition-colors
          ${emailError
            ? 'border-ms-red'
            : 'border-surface-border focus-within:border-ms-blue'}`}>
          <textarea
            ref={inputRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isDisabled ? 'Please wait…' : 'Type a message…'}
            disabled={isDisabled}
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
        {emailError && (
          <p className="text-[11px] text-ms-red px-1">{emailError}</p>
        )}
      </div>
    )
  }
)
