import { formatLabel } from '@/lib/admin/forms'

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active' ? 'bg-emerald-50 text-emerald-700' :
    status === 'archived' || status === 'disabled' || status === 'canceled' || status === 'expired' ? 'bg-slate-100 text-slate-600' :
    status === 'past_due' || status === 'suspended' ? 'bg-rose-50 text-rose-700' :
    'bg-amber-50 text-amber-800'

  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tone}`}>{formatLabel(status)}</span>
}
