import { formatLabel } from '@/lib/admin/forms'

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-emerald-100/70 text-emerald-800 shadow-2xs'
      : status === 'archived' || status === 'disabled' || status === 'canceled' || status === 'expired'
      ? 'border-purple-200/90 bg-gradient-to-b from-purple-50 to-purple-100/70 text-purple-800 shadow-2xs'
      : status === 'past_due' || status === 'suspended'
      ? 'border-rose-200/90 bg-gradient-to-b from-rose-50 to-rose-100/70 text-rose-800 shadow-2xs'
      : 'border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100/70 text-amber-800 shadow-2xs'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-tight ${tone}`}>
      {formatLabel(status)}
    </span>
  )
}
