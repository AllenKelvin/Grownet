import { useEffect, useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Layers, Wallet, History, Zap, Menu, X, UserCircle, FileText, Phone, Send } from 'lucide-react'
import { api } from './lib/api'
import AuthPage from './views/Auth'
import Dashboard from './views/Dashboard'
import ServiceCatalog from './views/ServiceCatalog'
import WalletDeposits from './views/WalletDeposits'
import OrderHistory from './views/OrderHistory'
import Profile from './views/Profile'
import Admin from './views/Admin'
import BuyPhoneNumbers from './views/BuyPhoneNumbers'
import BuyData from './views/BuyData'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'buy-numbers', label: 'Buy Phone Numbers', icon: Phone },
  { id: 'buy-data', label: 'Buy Data', icon: Zap },
  { id: 'catalog', label: 'Social Media Boost', icon: Package },
  { id: 'wallet', label: 'Wallet Deposits', icon: Wallet },
  { id: 'history', label: 'Order History', icon: History },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'admin', label: 'Admin Console', icon: FileText },
]

const MOBILE_HIDDEN_IDS = ['wallet', 'profile']
const MOBILE_QUICK_ITEMS = [
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: UserCircle },
]

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggedOut, setLoggedOut] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)

  useEffect(() => {
    const saved = localStorage.getItem('grownet-user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem('grownet-user')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const refreshUser = async () => {
    if (!user) return
    const u = await api.getUser(user._id)
    setUser(u)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500 pulse-glow" />
          <p className="text-sm text-slate-400">Loading Grownet…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthenticate={(u) => {
          setUser(u)
          setLoggedOut(false)
          localStorage.setItem('grownet-user', JSON.stringify(u))
          setActive('dashboard')
        }}
        loggedOut={loggedOut}
      />
    )
  }

  const ActiveView = () => {
    switch (active) {
      case 'dashboard': return <Dashboard user={user} onNavigate={setActive} />
      case 'buy-numbers': return <BuyPhoneNumbers user={user} />
      case 'buy-data': return <BuyData user={user} />
      case 'catalog': return <ServiceCatalog user={user} />
      case 'wallet': return <WalletDeposits user={user} onDeposited={refreshUser} />
      case 'history': return <OrderHistory user={user} />
      case 'profile': return <Profile user={user} onUpdated={refreshUser} onLogout={() => {
        setLoggedOut(true)
        setUser(null)
        localStorage.removeItem('grownet-user')
      }} />
      case 'admin': return <Admin user={user} />
      default: return <Dashboard user={user} onNavigate={setActive} />
    }
  }

  const visibleNavItems = NAV.filter((item) => !isMobileView || !MOBILE_HIDDEN_IDS.includes(item.id))

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-slate-200">
      {mobileOpen && <div className="fixed inset-0 z-10 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-700 bg-ink-900/90 px-3 py-2.5 backdrop-blur">
        <Brand />
        <div className="flex items-center gap-1.5">
          {isMobileView && (
            <div className="flex items-center gap-1 rounded-full border border-ink-700/80 bg-ink-850/70 p-1">
              {MOBILE_QUICK_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActive(item.id); setMobileOpen(false) }}
                    className={`rounded-full p-2 transition-colors ${isActive ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'}`}
                    aria-label={item.label}
                  >
                    <Icon size={16} />
                  </button>
                )
              })}
            </div>
          )}
          <button onClick={() => setMobileOpen((v) => !v)} className="btn-ghost p-2">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? 'block' : 'hidden'
          } md:block fixed md:sticky top-0 z-20 h-screen w-[84vw] max-w-[280px] shrink-0 border-r border-ink-700 bg-ink-900/80 backdrop-blur-md`}
        >
          <div className="flex h-full flex-col">
            <div className="hidden md:flex px-5 py-5">
              <Brand />
            </div>
            <nav className="flex-1 space-y-1 px-3 md:py-4 py-16 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActive(item.id); setMobileOpen(false) }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500/10 text-brand-400 shadow-glow'
                        : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
            <div className="border-t border-ink-700 p-4">
              <button
                onClick={() => { setActive('profile'); setMobileOpen(false) }}
                className={`card w-full p-3 text-left transition-all ${
                  active === 'profile' ? 'border-brand-500/50 bg-brand-500/5' : 'hover:border-ink-600 hover:bg-ink-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 text-sm font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2">
                  <span className="text-xs text-slate-500">Balance</span>
                  <span className="text-sm font-semibold text-brand-400">
                    ₵{user.wallet_balance.toLocaleString()}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-3 py-3 pb-24 sm:px-5 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto max-w-6xl animate-fade-in min-h-[calc(100dvh-5rem)] md:min-h-0">
            <ActiveView />
          </div>
        </main>
      </div>

      <a
        href="https://t.me/grownet09"
        target="_blank"
        rel="noreferrer"
        aria-label="Join Grownet Telegram channel"
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0088cc] text-white shadow-[0_12px_35px_rgba(0,136,204,0.35)] transition-transform hover:scale-105"
      >
        <Send size={22} />
      </a>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-ink-950 shadow-glow">
        <Zap size={18} fill="currentColor" />
      </div>
      <div>
        <p className="text-sm font-bold tracking-tight text-white">Grownet</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">SMM Reseller</p>
      </div>
    </div>
  )
}
