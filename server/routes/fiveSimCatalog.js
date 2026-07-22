import { Router } from 'express'
import axios from 'axios'
import { FIVE_SIM_API_URL, FIVE_SIM_API_KEY, PROVIDER_OPERATOR, USE_REAL_PROVIDER } from '../config/index.js'
import { getAllPhoneNumberPriceOverrides, getCustomPhoneNumberPrice, savePhoneNumberPriceOverrides } from '../config/phoneNumberPricing.js'
import { providerCancelOrder, providerFinishOrder } from '../services/providerClient.js'
import { User, PhoneNumberOrder } from '../models/index.js'

const router = Router()
const FIVE_SIM_BASE = String(FIVE_SIM_API_URL || 'https://5sim.net/v1').replace(/\/+$/, '')

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function convertFiveSimPrice(price, currency = 'GHS') {
  const amount = toNumber(price)
  if (!amount) return 0
  if (currency !== 'GHS') return Number(amount.toFixed(2))

  // 5sim pricing commonly arrives in RUB or USD. We use a conservative estimate:
  // if the value is large, assume RUB and convert to USD before moving to GHS.
  const usd = amount > 1000 ? amount / 90 : amount
  return Number((usd * 11.4).toFixed(2))
}

function getFlagEmoji(code = '') {
  const clean = String(code || '').trim().toUpperCase()
  if (!clean || clean.length > 2) return '🌐'

  const codePoints = Array.from(clean).map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

function normalizeCountry(entry, fallbackKey = '') {
  if (!entry || typeof entry !== 'object') return null

  const rawName = entry.text_en || entry.name || entry.country || entry.country_name || entry.title || entry.label || ''
  const rawCode = entry.code || entry.iso || entry.country_code || entry.id || entry.value || ''
  const rawFlag = entry.flag || entry.emoji || entry.icon || entry.country_flag || ''

  const name = String(rawName || fallbackKey || 'Unknown').trim()
  if (!name) return null

  const codeValue = rawCode && typeof rawCode === 'object' ? Object.keys(rawCode)[0] || fallbackKey : rawCode || fallbackKey
  const normalizedCode = String(codeValue || fallbackKey || name).toLowerCase()
  const codeDisplay = String(codeValue || fallbackKey || name).toUpperCase()
  const providerSlug = String(fallbackKey || normalizedCode || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

  return {
    id: providerSlug || normalizedCode,
    value: providerSlug || normalizedCode,
    label: name,
    code: codeDisplay,
    flag: rawFlag || getFlagEmoji(codeDisplay) || '🌐',
  }
}

function normalizeProducts(payload) {
  const items = []

  const pushItem = (item, fallbackKey = '') => {
    if (!item || typeof item !== 'object') return

    const nameSource = item.name || item.product || item.service || item.title || item.label || fallbackKey || ''
    const name = String(nameSource || '').trim()
    if (!name) return

    const qty = toNumber(item.qty ?? item.Qty ?? item.stock ?? item.available ?? item.count ?? 0)
    const price = toNumber(item.price ?? item.Price ?? item.cost ?? item.rate ?? item.amount ?? 0)
    const category = String(item.category || item.Category || item.type || item.group || 'SMS').trim() || 'SMS'

    items.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
      qty,
      price,
      category,
    })
  }

  if (Array.isArray(payload)) {
    payload.forEach((item) => pushItem(item))
    return items
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.products)) {
      payload.products.forEach((item) => pushItem(item))
      return items
    }

    if (Array.isArray(payload.data)) {
      payload.data.forEach((item) => pushItem(item))
      return items
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => pushItem(item, key))
      } else if (value && typeof value === 'object') {
        pushItem({ ...value, name: key }, key)
      }
    })
  }

  return items
}

async function fetchFiveSim(path) {
  const { data } = await axios.get(`${FIVE_SIM_BASE}${path}`, {
    timeout: 10000,
    headers: { Accept: 'application/json' },
  })
  return data
}

router.get('/sms/pricing-overrides', async (_req, res) => {
  try {
    const overrides = await getAllPhoneNumberPriceOverrides()
    res.json({ overrides })
  } catch (error) {
    console.error('[5sim] pricing overrides read failed', error.message)
    res.status(500).json({ error: 'Unable to load phone-number pricing overrides.' })
  }
})

router.put('/sms/pricing-overrides', async (req, res) => {
  try {
    const { overrides } = req.body || {}
    const saved = await savePhoneNumberPriceOverrides(overrides)
    res.json({ ok: true, overrides: saved })
  } catch (error) {
    console.error('[5sim] pricing overrides failed', error.message)
    res.status(500).json({ error: 'Unable to save phone-number pricing overrides.' })
  }
})

router.get('/sms/countries', async (req, res) => {
  try {
    const data = await fetchFiveSim('/guest/countries')
    const countries = Object.entries(data || {})
      .map(([key, value]) => normalizeCountry(value, key))
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label))

    res.json({ countries })
  } catch (error) {
    console.error('[5sim] countries failed', error.message)
    res.status(502).json({ error: 'Unable to load 5sim countries right now.' })
  }
})

router.get('/sms/products/:country', async (req, res) => {
  try {
    const { country } = req.params
    const data = await fetchFiveSim(`/guest/products/${encodeURIComponent(country)}/any`)
    const products = await Promise.all(
      normalizeProducts(data)
        .filter((item) => item.qty > 0)
        .map(async (item) => {
          const basePrice = convertFiveSimPrice(item.price, 'GHS')
          return {
            ...item,
            price: await getCustomPhoneNumberPrice(item.name, country, basePrice),
          }
        }),
    )

    res.json({ products: products.sort((a, b) => a.name.localeCompare(b.name)) })
  } catch (error) {
    console.error('[5sim] products failed', error.message)
    res.status(502).json({ error: 'Unable to load 5sim products right now.' })
  }
})

router.post('/sms/buy-number', async (req, res) => {
  try {
    const { country = 'any', product, currency = 'GHS', user_id, price } = req.body || {}

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required to place a phone number order.' })
    }

    if (!USE_REAL_PROVIDER) {
      return res.status(503).json({ error: 'Provider integration disabled. Set USE_REAL_PROVIDER=true to enable real purchases.' })
    }

    const activationUrl = `${FIVE_SIM_BASE}/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(PROVIDER_OPERATOR || 'any')}/${encodeURIComponent(product || '')}`
    const provResp = await axios.get(activationUrl, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${FIVE_SIM_API_KEY}` },
      timeout: 15000,
      validateStatus: () => true,
    })

    if (provResp.status === 200) {
      const orderData = provResp.data || {}
      const normalizedPhone = orderData.phoneNumber || orderData.phone || orderData.number || orderData.phone_number || ''
      const providerOrderId = orderData.id || orderData.order || orderData.order_id || orderData.orderId || ''
      const statusMessage = String(orderData.status || orderData.statusCode || 'Waiting for SMS OTP code...')
      const smsMessages = []
      if (Array.isArray(orderData.sms)) smsMessages.push(...orderData.sms.map((item) => String(item).trim()).filter(Boolean))
      if (Array.isArray(orderData.messages)) smsMessages.push(...orderData.messages.map((item) => String(item).trim()).filter(Boolean))
      if (orderData.code) smsMessages.push(String(orderData.code).trim())
      if (orderData.otp) smsMessages.push(String(orderData.otp).trim())
      const normalizedOrder = { ...orderData, phoneNumber: normalizedPhone }
      const chargeAmount = Number(price || product?.price || 0)
      if (user_id) {
        const user = await User.findById(user_id)
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }

        const userBalance = Number(user.wallet_balance || 0)
        if (userBalance < chargeAmount) {
          return res.status(402).json({ error: 'Insufficient wallet balance', required: chargeAmount, available: userBalance })
        }

        const savedOrder = await PhoneNumberOrder.create({
          user_id,
          country: String(country || ''),
          app: String(req.body.productName || ''),
          phone_number: normalizedPhone,
          provider_order_id: providerOrderId,
          order_status: 'In Progress',
          status_message: statusMessage,
          sms_messages: smsMessages,
          price: chargeAmount,
          currency_used: String(currency || 'GHS'),
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        })

        const responseOrder = {
          ...savedOrder.toObject(),
          phoneNumber: normalizedPhone,
          expiresAt: savedOrder.expires_at,
        }

        const updatedUser = await User.findByIdAndUpdate(user_id, { $inc: { wallet_balance: -chargeAmount } }, { new: true })
        return res.json({ ok: true, order: responseOrder, wallet_balance: updatedUser?.wallet_balance ?? userBalance })
      }

      return res.json({ ok: true, order: normalizedOrder })
    }

    if (provResp.status === 400 && provResp.data && String(JSON.stringify(provResp.data)).toLowerCase().includes('not enough')) {
      return res.status(402).json({ error: 'Insufficient wallet balance at provider', detail: provResp.data })
    }

    return res.status(provResp.status || 502).json({ error: 'Provider buy failed', detail: provResp.data })
  } catch (error) {
    console.error('[5sim] buy-number failed', {
      message: error.message,
      body: req.body,
      status: error.response?.status,
      data: error.response?.data,
    })
    res.status(502).json({ error: 'Unable to create the SMS activation request right now.', detail: error.message })
  }
})

router.get('/sms/orders', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })
    const orders = await PhoneNumberOrder.find({ user_id })
      .sort({ created_at: -1 })
      .lean()

    const formatted = orders.map((order) => ({
      ...order,
      phoneNumber: order.phone_number,
      expiresAt: order.expires_at,
    }))
    res.json({ ok: true, orders: formatted })
  } catch (error) {
    console.error('[5sim] list phone orders failed', error.message)
    res.status(500).json({ error: 'Unable to load phone number orders right now.' })
  }
})

router.post('/sms/orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.body || {}
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })

    const order = await PhoneNumberOrder.findOne({ _id: id, user_id })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (['Completed', 'Canceled'].includes(order.order_status)) {
      return res.status(400).json({ error: 'Order cannot be completed' })
    }
    if (!order.provider_order_id) {
      return res.status(500).json({ error: 'Provider order id missing for this order' })
    }

    const providerResult = await providerFinishOrder(order.provider_order_id)
    if (!providerResult?.ok) {
      return res.status(502).json({ error: 'Unable to finalize order with provider', detail: providerResult?.error || providerResult?.data || 'provider error' })
    }

    order.order_status = 'Completed'
    order.status_message = 'Order completed by user'
    order.updated_at = new Date()
    await order.save()

    res.json({ ok: true, order: { ...order.toObject(), phoneNumber: order.phone_number, expiresAt: order.expires_at } })
  } catch (error) {
    console.error('[5sim] complete phone order failed', error.message)
    res.status(500).json({ error: 'Unable to complete order right now.' })
  }
})

router.post('/sms/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.body || {}
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })

    const order = await PhoneNumberOrder.findOne({ _id: id, user_id })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (['Canceled', 'Completed'].includes(order.order_status)) {
      return res.status(400).json({ error: 'Order cannot be canceled' })
    }
    if (!order.provider_order_id) {
      return res.status(500).json({ error: 'Provider order id missing for this order' })
    }

    const providerResult = await providerCancelOrder(order.provider_order_id)
    if (!providerResult?.ok) {
      return res.status(502).json({ error: 'Unable to cancel order with provider', detail: providerResult?.error || providerResult?.data || 'provider error' })
    }

    const refund = Number(order.price || 0)
    order.order_status = 'Canceled'
    order.status_message = 'Order canceled by user'
    order.updated_at = new Date()
    await order.save()

    const updatedUser = await User.findByIdAndUpdate(user_id, { $inc: { wallet_balance: refund } }, { new: true })

    res.json({ ok: true, order: { ...order.toObject(), phoneNumber: order.phone_number, expiresAt: order.expires_at }, wallet_balance: updatedUser?.wallet_balance ?? 0 })
  } catch (error) {
    console.error('[5sim] cancel phone order failed', error.message)
    res.status(500).json({ error: 'Unable to cancel order right now.' })
  }
})

export default router
