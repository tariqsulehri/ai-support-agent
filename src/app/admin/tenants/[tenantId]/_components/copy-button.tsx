'use client'

import { useEffect, useState } from 'react'
import { buttonClasses, type ButtonVariant } from '@/components/admin/button-styles'

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied!',
  variant = 'secondary',
  className,
  ariaLabel,
}: {
  value: string
  label?: string
  copiedLabel?: string
  variant?: ButtonVariant | 'link'
  className?: string
  ariaLabel?: string
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  const text = state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label
  const classes =
    variant === 'link'
      ? 'rounded font-semibold text-[#0052ff] outline-none hover:text-[#0043d9] focus-visible:ring-2 focus-visible:ring-[#0052ff]/30'
      : buttonClasses(variant, 'sm')

  return (
    <button type="button" onClick={copy} aria-label={ariaLabel} className={`${classes} ${className ?? ''}`}>
      <span aria-live="polite">{text}</span>
    </button>
  )
}

/** Shows a masked value with an explicit reveal toggle and a copy button. */
export function MaskedValue({ value, masked }: { value: string; masked: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-[#121417] p-3.5 font-mono text-xs leading-relaxed text-emerald-400">
        {revealed ? value : masked}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          className={buttonClasses('secondary', 'sm')}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <CopyButton value={value} label="Copy Key" copiedLabel="Copied Key!" />
      </div>
    </div>
  )
}
