import { useEffect, useState } from 'react'
import { Wallet, ShoppingBag, TrendingUp, Package, ArrowRight, Activity } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/currency'
import { PageHeader, Spinner, StatusBadge } from '../components/ui'

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await api.dashboardStats(user._id)
        if (!cancelled) setStats(s)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user._id])

  if (loading || !stats) return <Spinner label="Loading dashboard…" />

  const cards = [
    {
      label: 'Wallet Balance',
      value: formatMoney(stats.wallet_balance, stats.currency),
      icon: Wallet,
      tone: 'brand',
      to: 'wallet',
    },
    {
      label: 'Total Orders',
      value: stats.total_orders,
      icon: ShoppingBag,
      tone: 'sky',
      to: 'history',
    },
    {
      label: 'Total Spent',
      value: formatMoney(stats.total_spent, stats.currency),
      icon: TrendingUp,
      tone: 'accent',
      to: 'history',
    },
    {
      label: 'Total Funded',
      value: formatMoney(stats.total_funded, stats.currency),
      icon: Package,
      tone: 'violet',
      to: 'wallet',
    },
  ]

  const toneMap = {
    brand: 'bg-brand-500/10 text-brand-400',
    sky: 'bg-sky-500/10 text-sky-400',
    accent: 'bg-accent-500/10 text-accent-500',
    violet: 'bg-violet-500/10 text-violet-400',
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Your SMM reseller overview at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.label}
              onClick={() => onNavigate(c.to)}
              className="card card-hover group p-5 text-left"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[c.tone]}`}>
                  <Icon size={18} />
                </div>
                <ArrowRight size={16} className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </div>
              <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">{c.label}</p>
              <p className="mt-1 text-xl font-bold text-white">{c.value}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Status breakdown */}
        <div className="card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Order Status</h3>
          </div>
          <div className="space-y-3">
            {['Pending', 'In Progress', 'Completed', 'Partial', 'Canceled'].map((s) => {
              const count = stats.by_status[s] || 0
              const pct = stats.total_orders ? (count / stats.total_orders) * 100 : 0
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <StatusBadge status={s} />
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {stats.total_orders === 0 && (
              <p className="py-4 text-center text-xs text-slate-500">No orders yet.</p>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
            <button onClick={() => onNavigate('history')} className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </button>
          </div>
          {stats.recent_orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No orders yet. <button onClick={() => onNavigate('catalog')} className="text-brand-400 hover:text-brand-300">Place your first order →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_orders.map((o) => (
                <div key={o._id} className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-850 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">#{o.local_service_id}</p>
                    <p className="truncate text-xs text-slate-500">{o.target_link}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{o.quantity.toLocaleString()} qty</span>
                    <StatusBadge status={o.order_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
