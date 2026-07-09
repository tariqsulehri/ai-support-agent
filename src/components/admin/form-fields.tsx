import { formatLabel } from '@/lib/admin/forms'

export function Field({
  label,
  name,
  required,
  type = 'text',
  placeholder,
  defaultValue,
  autoComplete,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  placeholder?: string
  defaultValue?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500"
      />
    </label>
  )
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string
  name: string
  options: readonly string[]
  defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>{formatLabel(option)}</option>
        ))}
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
}: {
  label: string
  name: string
  rows?: number
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500"
      />
    </label>
  )
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string
  name: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
      />
      {label}
    </label>
  )
}
