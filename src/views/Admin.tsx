import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { PageHeader, Spinner, EmptyState, StatusBadge } from '../components/ui'
import { RefreshCw, PlusSquare, Users, Package, FileText } from 'lucide-react'

export default function Admin({ user }: any) {
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  // form state for create service
  const [form, setForm] = useState({ provider_service_id: '', category: '', name: '', wholesale_rate_usd: '', local_rate: '', min_quantity: 1, max_quantity: 1000, refill_policy: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [u, o, s] = await Promise.all([api.listUsers(), api.listOrders(), api.listServices()])
      setUsers(u)
      setOrders(o)
      setServices(s)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleUserStatus(u: any) {
    try {
      const next = u.account_status === 'Active' ? 'Suspended' : 'Active'
      await api.updateUser(u._id, { account_status: next })
      await fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSyncServices() {
    setLoading(true)
    try {
      await api.syncServices()
      const s = await api.listServices()
      setServices(s)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateService(e: any) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createService(form)
      setForm({ provider_service_id: '', category: '', name: '', wholesale_rate_usd: '', local_rate: '', min_quantity: 1, max_quantity: 1000, refill_policy: true })
      const s = await api.listServices()
      setServices(s)
      setTab('services')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin Console"
        subtitle="Overview: users, orders, and services"
        action={(
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="btn-ghost" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      />

      <div className="mb-6 flex items-center gap-3">
        <Tab label="Users" id="users" icon={Users} active={tab === 'users'} onClick={() => setTab('users')} />
        <Tab label="Orders" id="orders" icon={FileText} active={tab === 'orders'} onClick={() => setTab('orders')} />
        <Tab label="Services" id="services" icon={Package} active={tab === 'services'} onClick={() => setTab('services')} />
        <Tab label="Create Service" id="create" icon={PlusSquare} active={tab === 'create'} onClick={() => setTab('create')} />
      </div>

      {loading ? (
        <Spinner label="Loading admin data…" />
      ) : (
        <div>
          {tab === 'users' && (
            <section>
              {users.length === 0 ? <EmptyState icon={Users} title="No users" /> : (
                <div className="overflow-x-auto rounded-lg border border-ink-700">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-900">
                      <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3">Balance</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id} className="odd:bg-ink-950">
                          <td className="p-3">{u.name}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3 text-right">{u.currency === 'GHS' ? '₵' : '₦'}{(u.wallet_balance || 0).toLocaleString()}</td>
                          <td className="p-3 text-center"><span className="text-xs text-slate-300">{u.account_status}</span></td>
                          <td className="p-3 text-center">
                            <button onClick={() => toggleUserStatus(u)} className="btn-sm">{u.account_status === 'Active' ? 'Suspend' : 'Activate'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'orders' && (
            <section>
              {orders.length === 0 ? <EmptyState icon={FileText} title="No orders" /> : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o._id} className="card flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{o.service_name} <span className="text-xs text-slate-500">(#{o.local_service_id})</span></div>
                        <div className="text-xs text-slate-400">{o.target_link}</div>
                        <div className="mt-1 text-xs text-slate-500">User: {o.user_id}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">{o.quantity}</div>
                          <div className="text-xs text-slate-500">{o.currency_used} {o.total_charged_local}</div>
                        </div>
                        <StatusBadge status={o.order_status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'services' && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-400">{services.length} services</div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSyncServices} className="btn">Sync from provider</button>
                </div>
              </div>

              {services.length === 0 ? <EmptyState icon={Package} title="No services" /> : (
                <div className="overflow-x-auto rounded-lg border border-ink-700">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-900">
                      <tr>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Rate</th>
                        <th className="p-3">Min</th>
                        <th className="p-3">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s._id} className="odd:bg-ink-950">
                          <td className="p-3">{s.local_service_id}</td>
                          <td className="p-3">{s.name}</td>
                          <td className="p-3 text-center">{s.category}</td>
                          <td className="p-3 text-right">{s.local_rate}</td>
                          <td className="p-3 text-right">{s.min_quantity}</td>
                          <td className="p-3 text-right">{s.max_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'create' && (
            <section>
              <form onSubmit={handleCreateService} className="grid max-w-lg gap-3">
                <label className="text-xs text-slate-400">Provider service id</label>
                <input value={form.provider_service_id} onChange={(e) => setForm({ ...form, provider_service_id: e.target.value })} className="input" />

                <label className="text-xs text-slate-400">Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />

                <label className="text-xs text-slate-400">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />

                <label className="text-xs text-slate-400">Wholesale rate (USD)</label>
                <input value={form.wholesale_rate_usd} onChange={(e) => setForm({ ...form, wholesale_rate_usd: e.target.value })} className="input" />

                <label className="text-xs text-slate-400">Local rate</label>
                <input value={form.local_rate} onChange={(e) => setForm({ ...form, local_rate: e.target.value })} className="input" />

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Min quantity</label>
                    <input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })} className="input" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Max quantity</label>
                    <input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })} className="input" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.refill_policy} onChange={(e) => setForm({ ...form, refill_policy: e.target.checked })} /> Refill policy
                </label>

                <div>
                  <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Create service'}</button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Tab({ label, id, active, onClick, icon: Icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:bg-ink-800'}`}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  )
}
