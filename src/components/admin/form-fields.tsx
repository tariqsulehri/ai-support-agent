import type { ReactNode } from 'react'
import { formatLabel } from '@/lib/admin/forms'

const labelText = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const controlBase =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0052ff] focus:ring-4 focus:ring-[#0052ff]/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

function Hint({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{children}</span>
}

export function Field({
  label,
  name,
  required,
  type = 'text',
  placeholder,
  defaultValue,
  autoComplete,
  hint,
  disabled,
  minLength,
  maxLength,
  min,
  max,
  inputMode,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  placeholder?: string
  defaultValue?: string
  autoComplete?: string
  hint?: ReactNode
  disabled?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  inputMode?: 'text' | 'email' | 'numeric' | 'url'
}) {
  return (
    <label className="block min-w-0">
      <span className={labelText}>
        {label}
        {required && <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        disabled={disabled}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        inputMode={inputMode}
        className={`${controlBase} h-10`}
      />
      <Hint>{hint}</Hint>
    </label>
  )
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  disabled,
}: {
  label: string
  name: string
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>
  defaultValue?: string
  disabled?: boolean
}) {
  return (
    <label className="block min-w-0">
      <span className={labelText}>{label}</span>
      <select name={name} defaultValue={defaultValue} disabled={disabled} className={`${controlBase} h-10`}>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const text = typeof option === 'string' ? formatLabel(option) : option.label
          return (
            <option key={value} value={value}>
              {text}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function TextArea({
  label,
  name,
  rows = 4,
  placeholder,
  defaultValue,
  hint,
  disabled,
  maxLength,
}: {
  label: string
  name: string
  rows?: number
  placeholder?: string
  defaultValue?: string
  hint?: ReactNode
  disabled?: boolean
  maxLength?: number
}) {
  return (
    <label className="block min-w-0">
      <span className={labelText}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        maxLength={maxLength}
        className={`${controlBase} py-2 leading-relaxed`}
      />
      <Hint>{hint}</Hint>
    </label>
  )
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  disabled,
}: {
  label: string
  name: string
  defaultChecked?: boolean
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100/70 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0052ff]/15">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 accent-[#0052ff]"
      />
      {label}
    </label>
  )
}
