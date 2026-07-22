import { useState } from 'react'
import { Mail, Lock, User, ArrowLeft, CheckCircle2, Key, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'

const ADMIN_EMAIL = 'Admin001@gmail.com'
const ADMIN_PASSWORD = 'Password100'

export default function AuthPage({ mode, onModeChange, onAuthenticate, loggedOut }: any) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currency] = useState('GHS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isLogin = mode === 'login'
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const title = isLogin ? 'Welcome back' : isSignup ? 'Create your account' : 'Forgot your password'
  const subtitle = isLogin
    ? 'Enter your email and password to sign in.'
    : isSignup
    ? 'Create a new CloudNum account to get instant virtual numbers.'
    : 'Enter your email and we will send reset instructions.'

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        const normalizedEmail = String(email).trim().toLowerCase()
        const normalizedPassword = String(password)

        if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && normalizedPassword === ADMIN_PASSWORD) {
          onAuthenticate({
            _id: 'admin-console',
            name: 'Admin',
            email: normalizedEmail,
            currency: 'GHS',
            wallet_balance: 0,
            account_status: 'Active',
            isAdmin: true,
          })
          return
        }

        const user = await api.login({ email, password })
        onAuthenticate(user)
      } else if (isSignup) {
        const user = await api.signup({ name, email, password, currency })
        onAuthenticate(user)
      } else {
        await api.forgotPassword({ email })
        setMessage('If an account exists, reset instructions have been sent to your email.')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] border border-ink-700 bg-ink-900/90 p-8 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">CloudNum</p>
              <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
              <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500 text-ink-950">
              <ShieldCheck size={28} />
            </div>
          </div>

          {loggedOut && (
            <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-brand-200">
              You have been signed out. Please log in again to continue.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`btn ${isLogin ? 'btn-primary' : 'btn-ghost'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={`btn ${isSignup ? 'btn-primary' : 'btn-ghost'}`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => onModeChange('forgot')}
              className={`btn ${isForgot ? 'btn-primary' : 'btn-ghost'}`}
            >
              Forgot Password
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error && (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
              {message}
            </div>
          )}

          {isSignup && (
            <div className="mb-4">
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kelvin Allen"
                  className="input pl-10"
                />
              </div>
            </div>
          )}

          {isSignup && (
            <div className="mb-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
              All pricing is shown in Ghanaian cedis, so your wallet will be set up in GHS by default.
            </div>
          )}

          <div className="mb-4">
            <label className="label">Email address</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@cloudnum.org"
                className="input pl-10"
              />
            </div>
          </div>

          {!isForgot && (
            <div className="mb-4">
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {isSignup && (
            <div className="mb-4">
              <label className="label">Confirm password</label>
              <div className="relative">
                <Key size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="input pl-10"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
              {loading ? 'Working…' : isForgot ? 'Send Reset Link' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className="btn-ghost w-full sm:w-auto"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
