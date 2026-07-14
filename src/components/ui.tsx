import { CheckCircle2, Clock, Loader2, AlertCircle, XCircle } from 'lucide-react'

export function StatusBadge({ status }: any) {
  const map: any = {
    'Pending': { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', Icon: Clock },
    'In Progress': { cls: 'bg-sky-500/10 text-sky-400 border border-sky-500/20', Icon: Loader2 },
    'Completed': { cls: 'bg-brand-500/10 text-brand-400 border border-brand-500/20', Icon: CheckCircle2 },
    'Partial': { cls: 'bg-accent-500/10 text-accent-500 border border-accent-500/20', Icon: AlertCircle },
    'Canceled': { cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', Icon: XCircle },
  }
  const { cls, Icon } = map[status] || map['Pending']
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} className={status === 'In Progress' ? 'animate-spin' : ''} />
      {status}
    </span>
  )
}

export function PageHeader({ title, subtitle, action }: any) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Spinner({ label }: any) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
      <Loader2 size={18} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle }: any) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-800 text-slate-500">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="max-w-sm text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}
