import { useState } from 'react'
import { User as UserIcon, Mail, Wallet, Globe, LogOut, Loader2, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney, CURRENCY_META } from '../lib/currency'
import { PageHeader } from '../components/ui'

const COUNTRIES = [
  { code: 'NG', label: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', label: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
]

export default function Profile({ user, onUpdated, onLogout }) {
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [currency, setCurrency] = useState(user.currency || 'NGN')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const selectedCountry = COUNTRIES.find((c) => c.currency === currency) || COUNTRIES[0]
  const balanceBefore = user.wallet_balance
  const balanceAfter = currency !== user.currency
    ? convertForDisplay(balanceBefore, user.currency, currency)
    : balanceBefore

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!name.trim()) return setError('Name cannot be empty.')
    if (!email.trim()) return setError('Email cannot be empty.')

    setSaving(true)
    try {
      const updated = await api.updateUser(user._id, {
        name: name.trim(),
        email: email.trim(),
        currency,
      })
      setResult(updated)
      if (onUpdated) await onUpdated()
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account details, country, and sign out." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/15 text-2xl font-bold text-brand-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <p className="mt-4 text-lg font-bold text-white">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge bg-brand-500/10 text-brand-400">
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                {selectedCountry.label}
              </span>
              <span className="badge bg-ink-800 text-slate-400">{user.currency}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-ink-700 pt-5">
            <Row icon={Wallet} label="Wallet Balance" value={formatMoney(user.wallet_balance, user.currency)} />
            <Row icon={Globe} label="Currency" value={CURRENCY_META[user.currency]?.label || user.currency} />
            <Row icon={MapPin} label="Country" value={selectedCountry.label} />
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="card p-6 lg:col-span-2">
          <h3 className="mb-5 text-sm font-semibold text-white">Account Details</h3>

          <div className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Country / currency selector */}
            <div>
              <label className="label">Country &amp; Currency</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {COUNTRIES.map((c) => {
                  const active = currency === c.currency
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.currency)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-500/10 shadow-glow'
                          : 'border-ink-700 bg-ink-850 hover:border-ink-600'
                      }`}
                    >
                      <span className="text-3xl leading-none">{c.flag}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${active ? 'text-brand-400' : 'text-slate-200'}`}>
                          {c.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {CURRENCY_META[c.currency].label} ({CURRENCY_META[c.currency].symbol})
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {currency !== user.currency && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 px-4 py-3 text-xs text-accent-500">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Switching currency converts your wallet balance at the current exchange rate.
                    Your balance will become <span className="font-semibold">{formatMoney(balanceAfter, currency)}</span>.
                  </span>
                </div>
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
                Profile updated successfully.
              </div>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Logout */}
      <div className="mt-6 card p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Sign Out</h3>
            <p className="mt-1 text-xs text-slate-500">
              Log out of your SwiftBoost account. You'll need to reload to sign back in.
            </p>
          </div>
          <button onClick={onLogout} className="btn-ghost text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30">
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  )
}

function convertForDisplay(amount, from, to) {
  if (from === to) return amount
  const NGN = 1370
  const GHS = 11.4
  const fromRate = from === 'NGN' ? NGN : GHS
  const toRate = to === 'NGN' ? NGN : GHS
  const usd = Number(amount) / fromRate
  return Math.round(usd * toRate * 100) / 100
}
