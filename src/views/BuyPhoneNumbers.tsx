import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircleMore,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import { formatMoney } from '../lib/currency'

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms)
  const mins = Math.floor(safe / 60000)
  const secs = Math.floor((safe % 60000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getProductMeta(name: string) {
  const label = String(name || '').toLowerCase()
  if (label.includes('telegram')) {
    return { icon: MessageCircleMore, accent: 'from-sky-500/20 to-cyan-500/10' }
  }
  if (label.includes('whatsapp')) {
    return { icon: MessageCircleMore, accent: 'from-emerald-500/20 to-lime-500/10' }
  }
  if (label.includes('google')) {
    return { icon: ShieldCheck, accent: 'from-brand-500/20 to-violet-500/10' }
  }
  if (label.includes('tiktok')) {
    return { icon: Sparkles, accent: 'from-fuchsia-500/20 to-pink-500/10' }
  }
  if (label.includes('discord')) {
    return { icon: MessageSquareText, accent: 'from-amber-500/20 to-orange-500/10' }
  }
  return { icon: ShieldCheck, accent: 'from-blue-500/20 to-indigo-500/10' }
}

function generatePhoneNumber(countryCode: string, appLabel: string) {
  const suffix = `${Math.floor(1000 + Math.random() * 9000)}`
  return `${countryCode} ${appLabel.slice(0, 2).toUpperCase()}${suffix}`
}

function ProductLogo({ name, className = '' }) {
  const [hasError, setHasError] = useState(false)

  const logoState = useMemo(() => {
    const normalized = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    const domainMap: Record<string, string> = {
      telegram: 'telegram.org',
      whatsapp: 'whatsapp.com',
      instagram: 'instagram.com',
      google: 'google.com',
      tiktok: 'tiktok.com',
      discord: 'discord.com',
      amazon: 'amazon.com',
      apple: 'apple.com',
      facebook: 'facebook.com',
      paypal: 'paypal.com',
      uber: 'uber.com',
      netflix: 'netflix.com',
      linkedin: 'linkedin.com',
      github: 'github.com',
      snapchat: 'snapchat.com',
      microsoft: 'microsoft.com',
      gmail: 'gmail.com',
      yahoo: 'yahoo.com',
      twitter: 'x.com',
      x: 'x.com',
    }

    const domain = domainMap[normalized] || `${normalized || 'example'}.com`
    return {
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
      fallback: String(name || '').trim().slice(0, 2).toUpperCase() || '•',
    }
  }, [name])

  if (hasError) {
    return (
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-800 text-sm font-semibold text-slate-200 ${className}`}>
        {logoState.fallback}
      </div>
    )
  }

  return (
    <img
      src={logoState.src}
      alt={String(name || 'service logo')}
      onError={() => setHasError(true)}
      className={`h-10 w-10 rounded-2xl object-cover ${className}`}
    />
  )
}

export default function BuyPhoneNumbers({ user, onUserUpdated }: any) {
  const [countries, setCountries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [appSearch, setAppSearch] = useState('')
  const [showAllApps, setShowAllApps] = useState(false)
  const [showAllCountries, setShowAllCountries] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [walletBalance, setWalletBalance] = useState(user?.wallet_balance || 0)
  const [now, setNow] = useState(Date.now())
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [buying, setBuying] = useState(false)
  const [activeModal, setActiveModal] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setWalletBalance(user?.wallet_balance || 0)
  }, [user?.wallet_balance])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(timeout)
  }, [copied])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase}/sms/countries`)
        const data = await res.json()
        if (!cancelled) {
          const nextCountries = data.countries || []
          setCountries(nextCountries)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setLoadingCountries(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedCountry) {
      setProducts([])
      setSelectedProduct(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoadingProducts(true)
        const res = await fetch(`${apiBase}/sms/products/${encodeURIComponent(selectedCountry)}`)
        const data = await res.json()
        if (!cancelled) {
          const nextProducts = data.products || []
          setProducts(nextProducts)
          setSelectedProduct(null)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedCountry])

  const currency = (user?.currency || 'GHS').toUpperCase()

  const visibleApps = useMemo(() => {
    const filtered = (products || []).filter((app) => app.name.toLowerCase().includes(appSearch.toLowerCase()))
    return showAllApps ? filtered : filtered.slice(0, 5)
  }, [products, appSearch, showAllApps])

  const filteredCountries = useMemo(() => {
    return countries.filter((country) => country.label.toLowerCase().includes(countrySearch.toLowerCase()))
  }, [countries, countrySearch])

  const visibleCountries = useMemo(() => {
    return showAllCountries ? filteredCountries : filteredCountries.slice(0, 8)
  }, [filteredCountries, showAllCountries])

  const selectedCountryMeta = countries.find((country) => country.value === selectedCountry) || countries[0] || null
  const selectedProductMeta = selectedProduct || null

  const localizedPrice = useMemo(() => {
    return Number((selectedProductMeta?.price || 0).toFixed(2))
  }, [selectedProductMeta])

  const handleBuy = async () => {
    if (!selectedCountryMeta || !selectedProductMeta) return
    if (walletBalance < localizedPrice) {
      setFeedback(`Insufficient balance for ${selectedProductMeta.name} in ${selectedCountryMeta.label}.`)
      return
    }

    setBuying(true)
    setFeedback('')

    try {
      const res = await fetch(`${apiBase}/sms/buy-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: selectedCountryMeta.value,
          product: selectedProductMeta,
          currency,
          user_id: user?._id,
          price: localizedPrice,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data || !data.ok || !data.order) {
        const message = data?.error || data?.detail || 'Provider returned an error.'
        setFeedback(String(message))
        return
      }

      const nextOrder = {
        id: data.order.id || `sms-${Date.now()}`,
        country: selectedCountryMeta.label,
        app: selectedProductMeta.name,
        phoneNumber: data.order.phoneNumber,
        expiresAt: data.order.expiresAt || Date.now() + 15 * 60 * 1000,
        code: data.order.statusCode || 'PENDING',
        status: data.order.status || 'Waiting for SMS OTP code...',
        price: data.order.price || localizedPrice,
      }

      setOrders((prev) => [nextOrder, ...prev].slice(0, 6))
      const nextWalletBalance = typeof data.wallet_balance === 'number'
        ? data.wallet_balance
        : Math.max(walletBalance - (nextOrder.price || 0), 0)
      setWalletBalance(nextWalletBalance)
      if (typeof onUserUpdated === 'function') {
        await onUserUpdated()
      }
      setActiveModal(nextOrder)
    } catch (error) {
      console.error(error)
      setFeedback('The activation request could not be created. Please try again.')
    } finally {
      setBuying(false)
    }
  }

  const handleCopy = async () => {
    if (!activeModal?.phoneNumber) return
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(activeModal.phoneNumber)
    }
    setCopied(true)
  }

  return (
    <div>
      <PageHeader
        title="Buy Phone Numbers"
        subtitle="Browse live Grownet countries and current in-stock services, then place an activation request instantly."
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Select country</h2>
              </div>
              <button
                onClick={() => setShowAllCountries((value) => !value)}
                className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300"
              >
                {showAllCountries ? 'Show fewer' : `Show all ${filteredCountries.length}`}
              </button>
            </div>

            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                placeholder="Search country"
                className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none"
              />
            </div>

            {loadingCountries ? (
              <div className="rounded-2xl border border-ink-700 bg-ink-850/70 p-3 text-sm text-slate-400">Loading live countries…</div>
            ) : visibleCountries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/60 p-4 text-sm text-slate-500">No countries available right now.</div>
            ) : (
              <div className="space-y-2">
                {visibleCountries.map((country) => {
                  const selected = country.value === selectedCountry
                  return (
                    <button
                      key={country.value}
                      onClick={() => setSelectedCountry(country.value)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${selected ? 'border-brand-500/40 bg-slate-800/70' : 'border-ink-700 bg-ink-850/70 hover:border-ink-600'}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-lg">{country.flag || '🌐'}</span>
                        <span className="truncate text-sm font-medium text-slate-200">{country.label}</span>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{country.code}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Find website or app</h2>
              </div>
              <button
                onClick={() => setShowAllApps((value) => !value)}
                className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300"
              >
                {showAllApps ? 'Show fewer' : `Show all ${products.length}`}
              </button>
            </div>

            <div className="relative mb-4">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={appSearch}
                onChange={(event) => setAppSearch(event.target.value)}
                placeholder="Search app or service"
                className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none"
              />
            </div>

            {loadingProducts ? (
              <div className="rounded-2xl border border-ink-700 bg-ink-850/70 p-3 text-sm text-slate-400">Loading live products…</div>
            ) : !selectedCountry ? (
              <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/60 p-4 text-sm text-slate-500">
                Select a country first to view available apps and services.
              </div>
            ) : visibleApps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/60 p-4 text-sm text-slate-500">
                No in-stock services are available for this country yet.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleApps.map((app) => {
                  const { icon: Icon, accent } = getProductMeta(app.name)
                  const selected = app.name === selectedProductMeta?.name
                  return (
                    <button
                      key={app.id || app.name}
                      onClick={() => setSelectedProduct(app)}
                      className={`flex w-full flex-col gap-3 rounded-2xl border px-3 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${selected ? 'border-brand-500/40 bg-slate-800/70 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]' : 'border-ink-700 bg-ink-850/70 hover:border-ink-600'}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} p-0.5 text-slate-100`}>
                          <ProductLogo name={app.name} className="h-full w-full rounded-[14px]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Star size={13} className="shrink-0 text-amber-400" fill="currentColor" />
                            <p className="truncate text-sm font-semibold text-white">{app.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">from {formatMoney(app.price, currency)}</p>
                          <p className="text-xs font-medium text-emerald-400">{app.qty} in stock</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          {app.category}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>


          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Select operator</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-ink-800 px-2 py-1 text-xs text-slate-300">
                  <span className="mr-2 text-sm">{selectedCountryMeta?.flag}</span>
                  <span className="truncate">{selectedCountryMeta?.label || 'Select a country'}</span>
                </span>
                <span className="inline-flex -ml-2 items-center rounded-full bg-ink-900 px-2 py-1 text-xs text-slate-300 border border-ink-700">
                  <span className="truncate">{selectedProductMeta?.name || 'Select a service'}</span>
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/60 p-4 text-sm text-slate-400">
              <p className="font-medium text-slate-300">Selected: <span className="text-slate-200">{selectedCountryMeta?.label || '—'}</span> · <span className="text-slate-200">{selectedProductMeta?.name || '—'}</span></p>
              <p className="mt-1 text-sm text-slate-500">You have chosen the country and app above — we'll request a real activation for that selection when you click <strong>Buy number now</strong>.</p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleBuy}
                disabled={buying || !selectedCountryMeta || !selectedProductMeta}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {buying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Buy number now
              </button>
              <div className="rounded-2xl border border-ink-700 bg-ink-850/70 px-3 py-2 text-sm text-slate-400 sm:min-w-[140px]">
                Price: {formatMoney(localizedPrice, currency)}
              </div>
            </div>
            {feedback && <p className="mt-3 text-sm text-amber-400">{feedback}</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareText size={16} className="text-accent-400" />
              <h2 className="text-sm font-semibold text-white">Your Virtual Numbers Log</h2>
            </div>
            <span className="rounded-full bg-ink-800 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {orders.length} active
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-700">
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-ink-700 text-sm">
                <thead className="bg-ink-850 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Country</th>
                    <th className="px-3 py-3">App</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Timer</th>
                    <th className="px-3 py-3">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800 bg-ink-900/70">
                  {orders.map((order) => {
                    const remaining = order.expiresAt - now
                    return (
                      <tr key={order.id} className="align-middle">
                        <td className="px-3 py-3 text-slate-300">{order.country}</td>
                        <td className="px-3 py-3 text-slate-300">{order.app}</td>
                        <td className="px-3 py-3 text-slate-300">{order.phoneNumber}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 text-amber-400">
                            <TimerReset size={14} className="animate-pulse" />
                            <span>{formatCountdown(remaining)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                              {order.code}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Loader2 size={12} className="animate-spin text-amber-400" />
                              <span>{order.status}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 bg-ink-900/70 p-2 md:hidden">
              {orders.map((order) => {
                const remaining = order.expiresAt - now
                return (
                  <div key={order.id} className="rounded-2xl border border-ink-700 bg-ink-850/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.app}</p>
                        <p className="mt-1 text-xs text-slate-500">{order.country}</p>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        {order.code}
                      </div>
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-300">{order.phoneNumber}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-amber-400">
                        <TimerReset size={14} className="animate-pulse" />
                        <span>{formatCountdown(remaining)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 size={12} className="animate-spin text-amber-400" />
                        <span>{order.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-850/70 p-4 text-sm text-slate-400">
            <div className="flex items-center justify-between">
              <span>Current balance</span>
              <span className="font-semibold text-brand-400">
                {formatMoney(walletBalance, currency)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Each purchase deducts the live GHS cost from your wallet and adds the number to your log.
            </p>
          </div>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-brand-500/20 bg-ink-900/95 p-6 shadow-2xl shadow-brand-500/10">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={34} />
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand-400">Purchase successful</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{activeModal.phoneNumber}</h3>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-2 text-sm font-semibold text-brand-300"
                >
                  <Copy size={15} />
                  Copy Number
                </button>
                {copied && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-sm font-semibold text-emerald-400">Copied!</span>}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-850/70 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <TimerReset size={16} className="animate-pulse" />
                <span className="text-3xl font-semibold tracking-[0.2em]">{formatCountdown(activeModal.expiresAt - now)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">15:00 minutes countdown</p>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center text-sm text-amber-300">
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                <span>Waiting for SMS OTP code...</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white"
              >
                Close and track in Log window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
