import { useEffect, useMemo, useState } from 'react'
import { Zap, ArrowRight, CheckCircle2, X, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/currency'
import { PageHeader, Spinner, EmptyState } from '../components/ui'

const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: 'from-yellow-400 to-amber-500', accent: 'amber', filter: (name: string) => name.toLowerCase().includes('mtn') },
  { id: 'telecel', name: 'Telecel', color: 'from-rose-500 to-red-500', accent: 'rose', filter: (name: string) => name.toLowerCase().includes('telecel') },
  { id: 'airteltigo', name: 'AirtelTigo', color: 'from-sky-500 to-blue-500', accent: 'sky', filter: (name: string) => name.toLowerCase().includes('airteltigo') || name.toLowerCase().includes('airtel') || name.toLowerCase().includes('tigo') },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  delivered: 'Delivered',
}

export default function BuyData({ user }: any) {
  const [services, setServices] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0].id)
  const [selectedPackage, setSelectedPackage] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const all = await api.listServices()
        const dataServices = all.filter((s: any) => String(s.category || '').toLowerCase().includes('data') || ['mtn', 'telecel', 'airteltigo', 'airtel', 'tigo'].some((token) => String(s.name || '').toLowerCase().includes(token)))
        setServices(dataServices)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await api.listDataOrders({ user_id: user._id })
      setHistory(data)
    } catch (err) {
      console.error(err)
    }
  }

  const networkPackages = useMemo(() => {
    const network = NETWORKS.find((item) => item.id === selectedNetwork)
    if (!network) return []
    return services.filter((service) => network.filter(String(service.name || '')))
  }, [services, selectedNetwork])

  const selectedNetworkMeta = NETWORKS.find((item) => item.id === selectedNetwork) || NETWORKS[0]

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg)
    setPhoneNumber('')
    setFeedback('')
  }

  const handleBuy = async (e: any) => {
    e.preventDefault()
    if (!selectedPackage) return
    const digits = String(phoneNumber || '').replace(/\D/g, '')
    if (digits.length !== 10) {
      setFeedback('Enter a valid 10-digit phone number.')
      return
    }

    setSaving(true)
    setFeedback('')
    try {
      const payload = {
        user_id: user._id,
        local_service_id: selectedPackage.local_service_id,
        recipient_number: digits,
        currency: user.currency || 'GHS',
      }
      const data = await api.createDataOrder(payload)
      setHistory((prev) => [data.order, ...prev])
      setSelectedPackage(null)
      setPhoneNumber('')
      setFeedback('Data order created successfully.')
    } catch (err: any) {
      setFeedback(err?.payload?.error || err?.message || 'Unable to create data order.')
    } finally {
      setSaving(false)
    }
  }

  const renderPackage = (pkg: any) => {
    return (
      <button
        key={pkg.local_service_id}
        onClick={() => handleSelectPackage(pkg)}
        className={`rounded-3xl border p-4 text-left transition hover:shadow-lg ${selectedPackage?.local_service_id === pkg.local_service_id ? 'border-brand-500/50 bg-brand-500/5' : 'border-ink-700 bg-ink-900'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{pkg.name}</p>
            <p className="mt-1 text-xs text-slate-500">{pkg.gig || 'Unknown GB'}</p>
          </div>
          <div className="rounded-2xl bg-ink-800 px-3 py-1 text-sm text-slate-300">
            {formatMoney(pkg.local_rate || 0, user.currency || 'GHS')}
          </div>
        </div>
        {pkg.description && <p className="mt-3 text-xs text-slate-400">{pkg.description}</p>}
      </button>
    )
  }

  return (
    <div>
      <PageHeader
        title="Buy Data"
        subtitle="Select a network, choose a package, and buy a data bundle with a real phone number."
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Choose a network</h2>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live data packages</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => setSelectedNetwork(network.id)}
                  className={`rounded-3xl border p-4 text-left transition ${selectedNetwork === network.id ? 'border-brand-500/50 bg-brand-500/5 shadow-lg' : 'border-ink-700 bg-ink-900 hover:border-slate-500'}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${network.color} text-black`}>
                    <Zap size={18} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">{network.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Tap to view packages</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Select a package</h2>
              </div>
              <span className="rounded-full bg-ink-800 px-3 py-1 text-xs text-slate-400">{selectedNetworkMeta.name}</span>
            </div>

            {loading ? (
              <Spinner label="Loading packages…" />
            ) : networkPackages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-700 bg-ink-900 p-8 text-center text-sm text-slate-500">
                No data packages are available for {selectedNetworkMeta.name} yet.
              </div>
            ) : (
              <div className="grid gap-3">{networkPackages.map(renderPackage)}</div>
            )}
          </div>

          {selectedPackage && (
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Enter recipient number</h2>
                </div>
                <span className="rounded-full bg-ink-800 px-3 py-1 text-xs text-slate-400">{selectedPackage.gig || 'Data package'}</span>
              </div>
              <form onSubmit={handleBuy} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone number</label>
                  <input
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="10 digit mobile number"
                    className="mt-2 w-full rounded-2xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-slate-200 outline-none focus:border-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Confirm purchase
                </button>
                {feedback && <p className="text-sm text-amber-400">{feedback}</p>}
              </form>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">History</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Your data orders</h2>
              </div>
              <button onClick={loadHistory} className="btn-ghost text-sm">Refresh</button>
            </div>

            {history.length === 0 ? (
              <EmptyState icon={Zap} title="No data orders yet" subtitle="Your completed and pending orders will appear here." />
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <div key={order._id} className="rounded-3xl border border-ink-700 bg-ink-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.package_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.15em] text-slate-400">{STATUS_LABELS[order.order_status] || order.order_status}</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-ink-950 p-3 text-sm text-slate-300">
                        <div className="text-xs text-slate-500">Recipient</div>
                        <div className="mt-1 font-medium">{order.recipient_number}</div>
                      </div>
                      <div className="rounded-2xl bg-ink-950 p-3 text-sm text-slate-300">
                        <div className="text-xs text-slate-500">Package</div>
                        <div className="mt-1 font-medium">{order.package_gig}</div>
                      </div>
                      <div className="rounded-2xl bg-ink-950 p-3 text-sm text-slate-300 sm:col-span-2">
                        <div className="text-xs text-slate-500">Price</div>
                        <div className="mt-1 font-medium">{formatMoney(order.price_local, order.currency_used)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
