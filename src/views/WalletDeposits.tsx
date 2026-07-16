import { useEffect, useState } from 'react'
import { Wallet, CreditCard, Building2, Smartphone, Loader2, CheckCircle2, ArrowDownCircle } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/currency'
import { PageHeader, Spinner } from '../components/ui'

// Only Paystack is supported as a gateway. We expose two UX options but both use Paystack.
const METHODS = [
  { id: 'card', label: 'Debit / Card (Paystack)', desc: 'Visa / Verve / Mastercard via Paystack', icon: CreditCard },
  { id: 'bank', label: 'Bank Transfer (Paystack)', desc: 'Direct transfer to your Paystack virtual account', icon: Building2 },
]

const QUICK_AMOUNTS = [50, 100, 200, 500]

export default function WalletDeposits({ user, onDeposited }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('card')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState(null)

  const loadHistory = async () => {
    const d = await api.listDeposits({ user_id: user._id })
    setHistory(d)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter a valid amount.')

    setSubmitting(true)
    try {
      // Use Paystack initialization flow
      const res = await api.paystackInit({ user_id: user._id, amount: amt })
      if (res && res.payment && res.payment.authorization_url) {
        // open Paystack checkout in a new tab
        window.open(res.payment.authorization_url, '_blank')
        setResult({ info: 'Redirected to Paystack. Complete payment to fund your wallet.' })
      } else {
        setError('Unable to initialize Paystack payment.')
      }
      setAmount('')
    } catch (err) {
      setError(err.message || 'Deposit failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Wallet Deposits" subtitle="Fund your wallet with local payment methods via Paystack." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balance card */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Wallet size={16} />
            <span className="text-xs uppercase tracking-wider">Current Balance</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{formatMoney(user.wallet_balance, user.currency)}</p>
          <p className="mt-1 text-xs text-slate-500">{user.currency === 'GHS' ? 'Ghanaian Cedi' : 'Nigerian Naira'}</p>

          <div className="mt-6 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500">Quick Amounts</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="btn-ghost px-3 py-2 text-xs"
                >
                  {formatMoney(a, user.currency)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deposit form */}
        <form onSubmit={handleSubmit} className="card p-6 lg:col-span-2">
          <div className="mb-5">
            <label className="label">Amount ({user.currency})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input text-lg"
            />
          </div>

          <label className="label">Payment Method</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {METHODS.map((m) => {
              const Icon = m.icon
              const active = method === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    active
                      ? 'border-brand-500 bg-brand-500/10 shadow-glow'
                      : 'border-ink-700 bg-ink-850 hover:border-ink-600'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-brand-500/20 text-brand-400' : 'bg-ink-800 text-slate-400'}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${active ? 'text-brand-400' : 'text-slate-200'}`}>{m.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{m.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-ink-600 bg-ink-850 p-3 text-xs text-slate-500">
            <span className="font-medium text-slate-400">Live funding:</span> Your wallet is updated once the deposit request is accepted.
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
              <CheckCircle2 size={16} />
              Deposit successful. New balance: {formatMoney(result.wallet_balance, user.currency)}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />}
            {submitting ? 'Processing…' : `Fund Wallet`}
          </button>
        </form>
      </div>

      {/* Deposit history */}
      {history && history.length > 0 && (
        <div className="mt-6 card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Recent Deposits</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((d) => (
              <div key={d._id} className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-850 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <ArrowDownCircle size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200 capitalize">{d.method}</p>
                    <p className="text-xs text-slate-500">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-brand-400">+{formatMoney(d.amount, d.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
