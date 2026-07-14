import { useEffect, useState } from 'react'
import { History, RefreshCw, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/currency'
import { PageHeader, Spinner, StatusBadge, EmptyState } from '../components/ui'

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Partial', 'Canceled']

export default function OrderHistory({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try {
      const data = await api.listOrders({ user_id: user._id })
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // auto-refresh so cron updates appear
    return () => clearInterval(t)
  }, [user._id])

  const filtered = filter === 'All' ? orders : orders.filter((o) => o.order_status === filter)

  if (loading) return <Spinner label="Loading orders…" />

  return (
    <div>
      <PageHeader
        title="Order History"
        subtitle="All your orders with live status updates from the provider."
        action={
          <button onClick={load} disabled={refreshing} className="btn-ghost">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Status filter chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`chip whitespace-nowrap ${filter === s ? 'border-brand-500 bg-brand-500/10 text-brand-400' : ''}`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No orders found"
          subtitle="Orders you place will appear here with live status from the provider."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-850 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Charged</th>
                  <th className="px-4 py-3 text-right font-medium">Remains</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Provider Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {filtered.map((o) => (
                  <tr key={o._id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">#{o.local_service_id}</p>
                      <p className="text-xs text-slate-500">{o.service_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <a
                        href={o.target_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 truncate text-xs text-sky-400 hover:text-sky-300"
                      >
                        <span className="truncate">{o.target_link}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{o.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200">
                      {formatMoney(o.total_charged_local, o.currency_used)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{o.remains.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={o.order_status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {o.provider_order_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
