import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Globe2,
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
import { api } from '../lib/api'
import { formatMoney } from '../lib/currency'

const COUNTRY_OPTIONS = [
  { value: 'england', label: 'England', flag: '🇬🇧', code: '+44' },
  { value: 'usa', label: 'USA', flag: '🇺🇸', code: '+1' },
  { value: 'canada', label: 'Canada', flag: '🇨🇦', code: '+1' },
  { value: 'nigeria', label: 'Nigeria', flag: '🇳🇬', code: '+234' },
  { value: 'ghana', label: 'Ghana', flag: '🇬🇭', code: '+233' },
  { value: 'france', label: 'France', flag: '🇫🇷', code: '+33' },
]

const APP_OPTIONS = [
  { id: 'telegram', label: 'Telegram', icon: MessageCircleMore, baseUsd: 1.45, stock: 342, accent: 'from-sky-500/20 to-cyan-500/10' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircleMore, baseUsd: 1.82, stock: 268, accent: 'from-emerald-500/20 to-lime-500/10' },
  { id: 'google', label: 'Google', icon: ShieldCheck, baseUsd: 2.1, stock: 195, accent: 'from-brand-500/20 to-violet-500/10' },
  { id: 'tiktok', label: 'TikTok', icon: Sparkles, baseUsd: 2.54, stock: 157, accent: 'from-fuchsia-500/20 to-pink-500/10' },
  { id: 'discord', label: 'Discord', icon: MessageSquareText, baseUsd: 1.63, stock: 144, accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'paypal', label: 'PayPal', icon: ShieldCheck, baseUsd: 2.95, stock: 99, accent: 'from-blue-500/20 to-indigo-500/10' },
]

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms)
  const mins = Math.floor(safe / 60000)
  const secs = Math.floor((safe % 60000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function generatePhoneNumber(countryCode: string, appLabel: string) {
  const suffix = `${Math.floor(1000 + Math.random() * 9000)}`
  return `${countryCode} ${appLabel.slice(0, 2).toUpperCase()}${suffix}`
}

export default function BuyPhoneNumbers({ user }) {
  const [selectedCountry, setSelectedCountry] = useState('usa')
  const [selectedApp, setSelectedApp] = useState('telegram')
  const [countrySearch, setCountrySearch] = useState('')
  const [appSearch, setAppSearch] = useState('')
  const [showAllApps, setShowAllApps] = useState(false)
  const [orders, setOrders] = useState<any[]>([
    {
      id: 'seed-1',
      country: 'USA',
      app: 'Telegram',
      phoneNumber: '+1 TG10345',
      expiresAt: Date.now() + 14 * 60 * 1000,
      code: 'A9D2',
      status: 'Waiting for SMS OTP code...',
    },
  ])
  const [walletBalance, setWalletBalance] = useState(user?.wallet_balance || 0)
  const [now, setNow] = useState(Date.now())
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

  const currency = (user?.currency || 'GHS').toUpperCase()

  const visibleApps = useMemo(() => {
    const filtered = APP_OPTIONS.filter((app) => app.label.toLowerCase().includes(appSearch.toLowerCase()))
    return showAllApps ? filtered : filtered.slice(0, 4)
  }, [appSearch, showAllApps])

  const visibleCountries = useMemo(() => {
    return COUNTRY_OPTIONS.filter((country) => country.label.toLowerCase().includes(countrySearch.toLowerCase()))
  }, [countrySearch])

  const selectedCountryMeta = COUNTRY_OPTIONS.find((country) => country.value === selectedCountry) || COUNTRY_OPTIONS[0]
  const selectedAppMeta = APP_OPTIONS.find((app) => app.id === selectedApp) || APP_OPTIONS[0]

  const localizedPrice = useMemo(() => {
    const base = selectedAppMeta.baseUsd
    if (currency === 'NGN') return base * 1370
    if (currency === 'GHS') return base * 11.4
    return base
  }, [currency, selectedAppMeta.baseUsd])

  const handleBuy = async () => {
    if (!selectedCountryMeta || !selectedAppMeta) return
    if (walletBalance < localizedPrice) {
      setFeedback(`Insufficient balance for ${selectedAppMeta.label} in ${selectedCountryMeta.label}.`)
      return
    }

    setBuying(true)
    setFeedback('')

    try {
      const response = await api.mockSmsBuy({
        userBalance: walletBalance,
        currency,
        country: selectedCountryMeta.value,
        app: selectedAppMeta.label,
        tierLabel: selectedAppMeta.label,
        priceUsd: selectedAppMeta.baseUsd,
      })

      const phoneNumber = response.order?.phoneNumber || generatePhoneNumber(selectedCountryMeta.code, selectedAppMeta.label)
      const nextOrder = {
        id: response.order?.id || `sms-${Date.now()}`,
        country: selectedCountryMeta.label,
        app: selectedAppMeta.label,
        phoneNumber,
        expiresAt: response.order?.expiresAt || Date.now() + 15 * 60 * 1000,
        code: response.order?.statusCode || 'PENDING',
        status: 'Waiting for SMS OTP code...',
      }

      setOrders((prev) => [nextOrder, ...prev].slice(0, 6))
      setWalletBalance(response.balanceAfter ?? Math.max(walletBalance - localizedPrice, 0))
      setActiveModal(nextOrder)
    } catch {
      const fallback = {
        id: `sms-${Date.now()}`,
        country: selectedCountryMeta.label,
        app: selectedAppMeta.label,
        phoneNumber: generatePhoneNumber(selectedCountryMeta.code, selectedAppMeta.label),
        expiresAt: Date.now() + 15 * 60 * 1000,
        code: 'PENDING',
        status: 'Waiting for SMS OTP code...',
      }
      setOrders((prev) => [fallback, ...prev].slice(0, 6))
      setWalletBalance((prev) => Math.max(prev - localizedPrice, 0))
      setActiveModal(fallback)
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
        subtitle="Reserve virtual numbers through a 5sim-style flow with localized pricing and live OTP tracking."
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Find website or app</h2>
              </div>
              <button
                onClick={() => setShowAllApps((value) => !value)}
                className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300"
              >
                {showAllApps ? 'Show fewer' : 'Show all 1205'}
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

            <div className="space-y-2">
              {visibleApps.map((app) => {
                const Icon = app.icon
                const selected = app.id === selectedApp
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${selected ? 'border-brand-500/40 bg-slate-800/70 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]' : 'border-ink-700 bg-ink-850/70 hover:border-ink-600'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${app.accent} text-slate-100`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Star size={13} className="text-amber-400" fill="currentColor" />
                          <p className="text-sm font-semibold text-white">{app.label}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">from {formatMoney(localizedPrice, currency)}</p>
                        <p className="text-xs font-medium text-emerald-400">{app.stock} in stock</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {app.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Select country</h2>
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

            <div className="space-y-2">
              {visibleCountries.map((country) => {
                const selected = country.value === selectedCountry
                return (
                  <button
                    key={country.value}
                    onClick={() => setSelectedCountry(country.value)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${selected ? 'border-brand-500/40 bg-slate-800/70' : 'border-ink-700 bg-ink-850/70 hover:border-ink-600'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-sm font-medium text-slate-200">{country.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">{country.code}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Select operator</h2>
              </div>
              <div className="rounded-full bg-ink-800 px-3 py-1 text-xs text-slate-500">
                {selectedCountryMeta.label} • {selectedAppMeta.label}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/60 p-4 text-sm text-slate-400">
              <p className="font-medium text-slate-300">Select service and country</p>
              <p className="mt-1 text-sm text-slate-500">Choose a provider, confirm your destination, and buy a number instantly.</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleBuy}
                disabled={buying}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {buying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Buy number now
              </button>
              <div className="rounded-2xl border border-ink-700 bg-ink-850/70 px-3 py-2 text-sm text-slate-400">
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

          <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-850/70 p-4 text-sm text-slate-400">
            <div className="flex items-center justify-between">
              <span>Current balance</span>
              <span className="font-semibold text-brand-400">
                {formatMoney(walletBalance, currency)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Mock flows mirror the real activation lifecycle so you can attach a provider later without changing the UI.
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
