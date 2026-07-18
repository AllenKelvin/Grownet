import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Package, ShoppingCart } from 'lucide-react'
import { api } from '../lib/api'
import { convertLocalRate, formatMoney } from '../lib/currency'
import { PageHeader, Spinner, EmptyState } from '../components/ui'

export default function ServiceCatalog({ user, onOrder }: any) {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [svcs, cats] = await Promise.all([api.listServices(), api.listCategories()])
        if (!cancelled) {
          setServices(svcs)
          setCategories(cats)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = services
    if (catFilter !== 'All') list = list.filter((s) => s.category === catFilter)
    if (query) {
      const lc = query.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(lc) ||
          String(s.local_service_id).includes(lc) ||
          s.category.toLowerCase().includes(lc),
      )
    }
    return list
  }, [services, catFilter, query])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.syncServices()
      const [svcs, cats] = await Promise.all([api.listServices(), api.listCategories()])
      setServices(svcs)
      setCategories(cats)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <Spinner label="Loading services…" />

  return (
    <div>
      <PageHeader
        title="Social Media Boost"
        subtitle="Browse all available SMM services with live local pricing."
        action={
          <button onClick={handleSync} disabled={syncing} className="btn-ghost">
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Provider'}
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or category…"
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCatFilter('All')}
            className={`chip whitespace-nowrap ${catFilter === 'All' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : ''}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`chip whitespace-nowrap ${catFilter === c ? 'border-brand-500 bg-brand-500/10 text-brand-400' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No services found" subtitle="Try adjusting your search or category filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-850 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Rate / 1K</th>
                  <th className="px-4 py-3 text-right font-medium">Min</th>
                  <th className="px-4 py-3 text-right font-medium">Max</th>
                  <th className="px-4 py-3 text-center font-medium">Refill</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {filtered.map((s) => {
                  const rate = convertLocalRate(s.local_rate, user.currency)
                  return (
                    <tr key={s._id} className="table-row-hover">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">#{s.local_service_id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200">{s.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip">{s.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-400">
                        {formatMoney(rate, user.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">{s.min_quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{s.max_quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {s.refill_policy ? (
                          <span className="badge bg-brand-500/10 text-brand-400">Yes</span>
                        ) : (
                          <span className="badge bg-ink-700 text-slate-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOrder && onOrder(s)}
                          disabled={!onOrder}
                          className={`btn-ghost px-3 py-1.5 text-xs ${!onOrder ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <ShoppingCart size={13} />
                          Order
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
