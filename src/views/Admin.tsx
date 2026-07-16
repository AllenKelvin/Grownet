import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { PageHeader, Spinner, EmptyState, StatusBadge } from '../components/ui'
import { RefreshCw, PlusSquare, Users, Package, FileText, Phone, Trash2, Save } from 'lucide-react'

export default function Admin({ user }: any) {
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [pricingOverrides, setPricingOverrides] = useState<any[]>([])
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingMessage, setPricingMessage] = useState('')
  const [newPricingKey, setNewPricingKey] = useState('')
  const [newPricingValue, setNewPricingValue] = useState('')

  // form state for create service
  const [form, setForm] = useState({ provider_service_id: '', category: 'Data', name: '', gig: '', description: '', wholesale_rate_usd: '', local_rate: '', min_quantity: 1, max_quantity: 1000, refill_policy: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (tab !== 'pricing') return
    loadPricingOverrides()
  }, [tab])

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
      setForm({ provider_service_id: '', category: 'Data', name: '', gig: '', description: '', wholesale_rate_usd: '', local_rate: '', min_quantity: 1, max_quantity: 1000, refill_policy: true })
      const s = await api.listServices()
      setServices(s)
      setTab('services')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function loadPricingOverrides() {
    try {
      const data = await api.getPhoneNumberPriceOverrides()
      const entries = Object.entries(data.overrides || {})
        .map(([key, value]) => ({ key, value: String(value) }))
        .sort((a, b) => a.key.localeCompare(b.key))
      setPricingOverrides(entries.length ? entries : [{ key: 'default', value: '5' }])
      setPricingMessage('')
    } catch (err) {
      console.error(err)
      setPricingMessage('Unable to load pricing overrides.')
    }
  }

  function updatePricingEntry(index: number, field: 'key' | 'value', value: string) {
    setPricingOverrides((prev) => prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry))
  }

  function removePricingEntry(index: number) {
    setPricingOverrides((prev) => prev.filter((_, i) => i !== index))
  }

  function addPricingEntry() {
    const key = newPricingKey.trim()
    const value = newPricingValue.trim()
    if (!key || !value) return

    setPricingOverrides((prev) => [...prev, { key, value }])
    setNewPricingKey('')
    setNewPricingValue('')
  }

  async function savePricingOverrides() {
    setPricingSaving(true)
    setPricingMessage('')

    try {
      const payload: Record<string, number> = {}
      pricingOverrides.forEach((entry) => {
        const key = String(entry.key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
        const value = Number(entry.value)
        if (key && Number.isFinite(value)) payload[key] = Number(value.toFixed(2))
      })

      await api.updatePhoneNumberPriceOverrides({ overrides: payload })
      setPricingMessage('Phone number prices updated successfully.')
    } catch (err) {
      console.error(err)
      setPricingMessage('Unable to save pricing overrides.')
    } finally {
      setPricingSaving(false)
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tab label="Users" id="users" icon={Users} active={tab === 'users'} onClick={() => setTab('users')} />
        <Tab label="Orders" id="orders" icon={FileText} active={tab === 'orders'} onClick={() => setTab('orders')} />
        <Tab label="Services" id="services" icon={Package} active={tab === 'services'} onClick={() => setTab('services')} />
        <Tab label="Phone Pricing" id="pricing" icon={Phone} active={tab === 'pricing'} onClick={() => setTab('pricing')} />
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

          {tab === 'pricing' && (
            <section>
              <div className="card p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white">Phone number pricing overrides</h3>
                  <p className="mt-1 text-sm text-slate-400">Set the prices your customers pay for phone-number activations. Entries like <span className="font-semibold text-brand-400">usa</span>, <span className="font-semibold text-brand-400">telegram</span>, or <span className="font-semibold text-brand-400">default</span> override the provider default.</p>
                </div>

                <div className="space-y-3">
                  {pricingOverrides.map((entry, index) => (
                    <div key={`${entry.key}-${index}`} className="flex flex-col gap-2 rounded-2xl border border-ink-700 bg-ink-850/70 p-3 sm:flex-row">
                      <input
                        value={entry.key}
                        onChange={(e) => updatePricingEntry(index, 'key', e.target.value)}
                        placeholder="default, usa, telegram..."
                        className="input sm:max-w-[220px]"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.value}
                        onChange={(e) => updatePricingEntry(index, 'value', e.target.value)}
                        placeholder="Price"
                        className="input sm:max-w-[140px]"
                      />
                      <button type="button" onClick={() => removePricingEntry(index)} className="btn-ghost shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-ink-700 bg-ink-850/40 p-3 sm:flex-row">
                  <input
                    value={newPricingKey}
                    onChange={(e) => setNewPricingKey(e.target.value)}
                    placeholder="Add key (default, usa, telegram...)"
                    className="input sm:max-w-[220px]"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPricingValue}
                    onChange={(e) => setNewPricingValue(e.target.value)}
                    placeholder="Price"
                    className="input sm:max-w-[140px]"
                  />
                  <button type="button" onClick={addPricingEntry} className="btn-ghost shrink-0">
                    <PlusSquare size={15} />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={savePricingOverrides} className="btn bg-brand-500 text-ink-950" disabled={pricingSaving}>
                    {pricingSaving ? <><Save size={15} className="animate-pulse" /> Saving…</> : <><Save size={15} /> Save pricing</>}
                  </button>
                  {pricingMessage && <p className={`text-sm ${pricingMessage.includes('successfully') ? 'text-emerald-400' : 'text-amber-400'}`}>{pricingMessage}</p>}
                </div>
              </div>
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

                <label className="text-xs text-slate-400">Gig amount</label>
                <input value={form.gig} onChange={(e) => setForm({ ...form, gig: e.target.value })} className="input" placeholder="e.g. 1.5 GB" />

                <label className="text-xs text-slate-400">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="e.g. valid for 7 days" />

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
