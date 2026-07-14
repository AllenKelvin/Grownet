import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Calculator, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { convertLocalRate, formatMoney, computeTotal } from '../lib/currency'
import { PageHeader, Spinner } from '../components/ui'

export default function PlaceOrder({ user, selectedService: prefilledService, onOrdered }) {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [serviceId, setServiceId] = useState(prefilledService ? String(prefilledService.local_service_id) : '')
  const [link, setLink] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

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

  const availableServices = useMemo(() => {
    if (category === 'All') return services
    return services.filter((s) => s.category === category)
  }, [services, category])

  const selectedService = useMemo(
    () => services.find((s) => String(s.local_service_id) === String(serviceId)) || prefilledService,
    [services, serviceId, prefilledService],
  )

  const qty = Number(quantity) || 0
  const localRate = selectedService ? convertLocalRate(selectedService.local_rate, user.currency) : 0
  const total = selectedService ? computeTotal(localRate, qty) : 0
  const withinRange = selectedService && qty >= selectedService.min_quantity && qty <= selectedService.max_quantity
  const insufficient = total > user.wallet_balance

  useEffect(() => {
    if (prefilledService?.local_service_id) {
      setCategory(prefilledService.category || 'All')
      setServiceId(String(prefilledService.local_service_id))
    }
  }, [prefilledService])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!selectedService) return setError('Please select a service.')
    if (!link) return setError('Please enter a target link.')
    if (!withinRange) return setError(`Quantity must be between ${selectedService.min_quantity} and ${selectedService.max_quantity}.`)
    if (insufficient) return setError('Insufficient wallet balance. Please fund your wallet.')

    setSubmitting(true)
    try {
      const res = await api.placeOrder({
        user_id: user._id,
        local_service_id: selectedService.local_service_id,
        target_link: link,
        quantity: qty,
      })
      setResult(res)
      setQuantity('')
      setLink('')
      if (onOrdered) await onOrdered()
    } catch (err) {
      setError(err.message || 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner label="Loading services…" />

  return (
    <div>
      <PageHeader title="Place Order" subtitle="Select a category, pick a service, and calculate your cost in real time." />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 lg:col-span-3">
          <div className="space-y-5">
            <div>
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setServiceId('') }}
                className="input"
              >
                <option value="All">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Service</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="input"
              >
                <option value="">Select a service…</option>
                {availableServices.map((s) => (
                  <option key={s._id} value={s.local_service_id}>
                    #{s.local_service_id} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Target Link (URL)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/yourpost"
                className="input"
              />
            </div>

            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="input"
              />
              {selectedService && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Min: {selectedService.min_quantity.toLocaleString()} · Max: {selectedService.max_quantity.toLocaleString()}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="flex items-start gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <div>
                  Order placed successfully. Provider ref: <span className="font-mono">{result.order?.provider_order_id}</span>
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting || !selectedService} className="btn-primary w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
              {submitting ? 'Placing order…' : 'Place Order'}
            </button>
          </div>
        </form>

        {/* Live calculator */}
        <div className="lg:col-span-2">
          <div className="card sticky top-6 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Calculator size={16} className="text-brand-400" />
              <h3 className="text-sm font-semibold text-white">Price Calculator</h3>
            </div>

            {!selectedService ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Select a service to see pricing.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Service</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">{selectedService.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-ink-850 p-3">
                    <p className="text-xs text-slate-500">Rate / 1,000</p>
                    <p className="mt-1 text-lg font-bold text-brand-400">{formatMoney(localRate, user.currency)}</p>
                  </div>
                  <div className="rounded-xl bg-ink-850 p-3">
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="mt-1 text-lg font-bold text-slate-200">{qty.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Cost</span>
                    <span className="text-2xl font-bold text-white">{formatMoney(total, user.currency)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-ink-700 pt-3 text-xs">
                    <span className="text-slate-500">Wallet Balance</span>
                    <span className={insufficient ? 'text-rose-400' : 'text-brand-400'}>
                      {formatMoney(user.wallet_balance, user.currency)}
                    </span>
                  </div>
                  {qty > 0 && !withinRange && (
                    <p className="mt-2 text-xs text-rose-400">Quantity out of allowed range.</p>
                  )}
                  {qty > 0 && withinRange && insufficient && (
                    <p className="mt-2 text-xs text-rose-400">Insufficient balance — fund your wallet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
