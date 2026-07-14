import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { convertLocalRate, formatMoney, computeTotal } from '../lib/currency'
import { PageHeader, Spinner } from '../components/ui'

const emptyRow = () => ({ local_service_id: '', target_link: '', quantity: '' })

export default function MassOrder({ user, onOrdered }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const svcs = await api.listServices()
        if (!cancelled) setServices(svcs)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  }
  const addRow = () => setRows((p) => [...p, emptyRow()])
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i))

  const computed = rows.map((r) => {
    const svc = services.find((s) => String(s.local_service_id) === String(r.local_service_id))
    const qty = Number(r.quantity) || 0
    const rate = svc ? convertLocalRate(svc.local_rate, user.currency) : 0
    const total = svc ? computeTotal(rate, qty) : 0
    return { svc, qty, total }
  })
  const grandTotal = computed.reduce((s, c) => s + c.total, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    const valid = rows.filter((r) => r.local_service_id && r.target_link && r.quantity)
    if (valid.length === 0) return setError('Add at least one complete order row.')
    if (grandTotal > user.wallet_balance) return setError('Insufficient wallet balance for this mass order.')

    setSubmitting(true)
    try {
      const res = await api.placeMassOrder({
        user_id: user._id,
        orders: valid.map((r) => ({
          local_service_id: Number(r.local_service_id),
          target_link: r.target_link,
          quantity: Number(r.quantity),
        })),
      })
      setResult(res)
      setRows([emptyRow()])
      if (onOrdered) await onOrdered()
    } catch (err) {
      setError(err.message || 'Mass order failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner label="Loading services…" />

  return (
    <div>
      <PageHeader
        title="Mass Order"
        subtitle="Submit multiple orders at once. Each row is processed independently."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-850 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Target Link</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {rows.map((row, i) => {
                  const c = computed[i]
                  return (
                    <tr key={i} className="table-row-hover">
                      <td className="px-4 py-3">
                        <select
                          value={row.local_service_id}
                          onChange={(e) => updateRow(i, 'local_service_id', e.target.value)}
                          className="input min-w-[200px]"
                        >
                          <option value="">Select service…</option>
                          {services.map((s) => (
                            <option key={s._id} value={s.local_service_id}>
                              #{s.local_service_id} — {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="url"
                          value={row.target_link}
                          onChange={(e) => updateRow(i, 'target_link', e.target.value)}
                          placeholder="https://…"
                          className="input min-w-[200px]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                          placeholder="0"
                          className="input w-28"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-400">
                        {c.svc ? formatMoney(c.total, user.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} className="btn-ghost p-2 text-rose-400 hover:text-rose-300">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-ink-700 p-4">
            <button type="button" onClick={addRow} className="btn-ghost">
              <Plus size={15} />
              Add Row
            </button>
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate-400">Grand Total</span>
              <span className="text-xl font-bold text-white">{formatMoney(grandTotal, user.currency)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Mass order complete — {result.results.filter((r) => r.success).length} succeeded.
            </div>
            <p className="mt-1 text-xs text-brand-400/80">
              New balance: {formatMoney(result.wallet_balance, user.currency)}
            </p>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
          {submitting ? 'Submitting…' : 'Submit Mass Order'}
        </button>
      </form>
    </div>
  )
}
