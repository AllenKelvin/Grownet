// Controllers for users, services, deposits, and dashboard stats.

import bcrypt from 'bcryptjs'
import { User, Service, Order, Deposit } from '../models/index.js'
import { computeLocalRate, convertCurrency } from '../utils/exchange.js'
import { providerFetchServices } from '../services/providerClient.js'
import { PROVIDER_API_TYPE } from '../config/index.js'

// ---- Users ----
export async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json(stripInternal(user))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function listUsers(req, res) {
  const users = await User.find({})
  return res.json(users.map(stripInternal))
}

export async function updateUser(req, res) {
  try {
    const { name, email, currency } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const updates = {}
    if (name !== undefined) updates.name = String(name)
    if (email !== undefined) updates.email = String(email)

    if (currency !== undefined && currency !== user.currency) {
      if (!['NGN', 'GHS'].includes(currency)) {
        return res.status(400).json({ error: 'Currency must be NGN or GHS' })
      }
      updates.currency = currency
      updates.wallet_balance = convertCurrency(user.wallet_balance, user.currency, currency)
    }

    const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates })
    return res.json(stripInternal(updated))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function signupUser(req, res) {
  try {
    const { name, email, password, currency = 'NGN' } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' })
    }
    if (!['NGN', 'GHS'].includes(currency)) {
      return res.status(400).json({ error: 'currency must be NGN or GHS' })
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' })
    }

    const hashedPassword = await bcrypt.hash(String(password), 10)
    const user = await User.create({
      name: String(name),
      email: String(email).toLowerCase(),
      password: hashedPassword,
      wallet_balance: 0,
      currency,
      account_status: 'Active',
    })

    return res.status(201).json(stripInternal(user))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password')
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(String(password), user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    return res.json(stripInternal(user))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists, we have sent reset instructions.' })
    }

    return res.status(200).json({ success: true, message: 'If an account exists, we have sent reset instructions.' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ---- Services ----
export async function listServices(req, res) {
  const { category, q } = req.query
  let services = await Service.find({})
  if (category && category !== 'All') {
    services = services.filter((s) => s.category === category)
  }
  if (q) {
    const lc = q.toLowerCase()
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(lc) ||
        String(s.local_service_id).includes(lc) ||
        s.category.toLowerCase().includes(lc),
    )
  }
  return res.json(services)
}

export async function listCategories(req, res) {
  const services = await Service.find({})
  const cats = [...new Set(services.map((s) => s.category))].sort()
  return res.json(cats)
}

// Sync services from provider catalog + apply margin matrix
export async function syncServices(req, res) {
  try {
    const providerServices = await providerFetchServices()
    const existing = await Service.find({})
    const existingMap = new Map(existing.map((s) => [s.provider_service_id, s]))
    let nextLocalId = (existing.reduce((m, s) => Math.max(m, s.local_service_id), 0) || 0) + 1

    // We compute local_rate for BOTH currencies and store NGN by default; the
    // frontend re-computes per the user's currency for display. We store the
    // NGN local_rate as the canonical value.
    for (const ps of providerServices) {
      const localRate = computeLocalRate(Number(ps.rate), 'NGN')
      if (existingMap.has(ps.service)) {
        const existingSvc = existingMap.get(ps.service)
        await Service.findByIdAndUpdate(existingSvc._id, {
          $set: {
            name: ps.name,
            category: ps.category,
            wholesale_rate_usd: Number(ps.rate),
            local_rate: localRate,
            min_quantity: ps.min,
            max_quantity: ps.max,
            refill_policy: !!ps.refill,
          },
        })
      } else {
        await Service.create({
          local_service_id: nextLocalId++,
          provider_service_id: ps.service,
          category: ps.category,
          name: ps.name,
          wholesale_rate_usd: Number(ps.rate),
          local_rate: localRate,
          min_quantity: ps.min,
          max_quantity: ps.max,
          refill_policy: !!ps.refill,
        })
      }
    }
    const refreshed = await Service.find({})
    return res.json({ success: true, count: refreshed.length, services: refreshed })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// Create a single service (admin)
export async function createService(req, res) {
  try {
    const { provider_service_id, category, name, wholesale_rate_usd, local_rate, gig, description, min_quantity, max_quantity, refill_policy } = req.body
    if (!provider_service_id || !category || !name || !wholesale_rate_usd || !local_rate) {
      return res.status(400).json({ error: 'provider_service_id, category, name, wholesale_rate_usd, and local_rate are required' })
    }
    const existing = await Service.find({})
    const nextLocalId = (existing.reduce((m, s) => Math.max(m, s.local_service_id), 0) || 0) + 1

    const svc = await Service.create({
      local_service_id: nextLocalId,
      provider_service_id: Number(provider_service_id),
      category: String(category),
      name: String(name),
      wholesale_rate_usd: Number(wholesale_rate_usd),
      local_rate: Number(local_rate),
      gig: String(gig || ''),
      description: String(description || ''),
      min_quantity: Number(min_quantity) || 1,
      max_quantity: Number(max_quantity) || 10000,
      refill_policy: !!refill_policy,
    })

    return res.status(201).json(svc)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ---- Orders ----
export async function listOrders(req, res) {
  const { user_id, status } = req.query
  const filter = {}
  if (user_id) filter.user_id = user_id
  if (status) filter.order_status = status
  const orders = await Order.find(filter)
  // attach service name for display
  const services = await Service.find({})
  const svcMap = new Map(services.map((s) => [s.local_service_id, s]))
  const enriched = orders.map((o) => ({
    ...o,
    service_name: svcMap.get(o.local_service_id)?.name || 'Unknown',
    category: svcMap.get(o.local_service_id)?.category || '',
  }))
  return res.json(enriched)
}

// ---- Deposits ----
export async function createDeposit(req, res) {
  try {
    const { user_id, amount, method } = req.body
    if (!user_id || !amount || !method) {
      return res.status(400).json({ error: 'user_id, amount, and method are required' })
    }
    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    // For Paystack flows we return a payment initialization object and
    // keep the deposit pending until Paystack webhook confirms payment.
    if (String(method).toLowerCase() === 'paystack') {
      // frontend should call /deposits/paystack-init instead; keep this as
      // a fallback for direct requests.
      const deposit = await Deposit.create({
        user_id,
        amount: Number(amount),
        currency: user.currency,
        method: 'paystack',
        status: 'pending',
      })
      return res.status(201).json({ success: true, deposit })
    }

    const deposit = await Deposit.create({
      user_id,
      amount: Number(amount),
      currency: user.currency,
      method,
      status: 'Completed',
    })

    await User.findByIdAndUpdate(user_id, { $inc: { wallet_balance: Number(amount) } })
    const refreshed = await User.findById(user_id)
    return res.status(201).json({ success: true, deposit, wallet_balance: refreshed.wallet_balance })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// Initialize a Paystack transaction and return authorization_url
export async function initPaystackDeposit(req, res) {
  try {
    const { user_id, amount } = req.body
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount are required' })
    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { PAYSTACK_SECRET } = await import('../config/index.js')
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: 'Paystack is not configured on the server' })

    // create pending deposit
    const deposit = await Deposit.create({
      user_id,
      amount: Number(amount),
      currency: user.currency,
      method: 'paystack',
      status: 'pending',
    })

    // initialize Paystack transaction
    const axios = (await import('axios')).default
    const initializeUrl = 'https://api.paystack.co/transaction/initialize'
    const payload = {
      email: user.email,
      amount: Math.round(Number(amount) * 100), // kobo/ cents
      callback_url: '',
      metadata: { deposit_id: deposit._id.toString(), user_id: user_id.toString() },
    }

    const resp = await axios.post(initializeUrl, payload, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    })

    if (!resp.data || !resp.data.data) {
      return res.status(500).json({ error: 'Paystack initialization failed' })
    }

    return res.json({ success: true, deposit, payment: resp.data.data })
  } catch (err) {
    console.error('[paystack-init] error', err)
    return res.status(500).json({ error: err.message })
  }
}

export async function listDeposits(req, res) {
  const { user_id } = req.query
  const filter = user_id ? { user_id } : {}
  const deposits = await Deposit.find(filter)
  return res.json(deposits)
}

// ---- Dashboard stats ----
export async function dashboardStats(req, res) {
  try {
    const { user_id } = req.params
    const orders = await Order.find({ user_id })
    const deposits = await Deposit.find({ user_id })
    const user = await User.findById(user_id)

    const totalSpent = orders.reduce((s, o) => s + o.total_charged_local, 0)
    const totalFunded = deposits.reduce((s, d) => s + d.amount, 0)
    const byStatus = orders.reduce((acc, o) => {
      acc[o.order_status] = (acc[o.order_status] || 0) + 1
      return acc
    }, {})

    return res.json({
      wallet_balance: user?.wallet_balance ?? 0,
      currency: user?.currency ?? 'NGN',
      total_orders: orders.length,
      total_spent: totalSpent,
      total_funded: totalFunded,
      by_status: byStatus,
      recent_orders: orders.slice(-5).reverse(),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function stripInternal(u) {
  if (!u) return null
  const obj = u.toObject ? u.toObject() : u
  const { save, password, __v, ...rest } = obj
  return rest
}
