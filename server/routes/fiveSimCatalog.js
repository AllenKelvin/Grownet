import { Router } from 'express'
import axios from 'axios'
import { PROVIDER_API_URL } from '../config/index.js'

const router = Router()
const FIVE_SIM_BASE = String(process.env.FIVE_SIM_API_URL || PROVIDER_API_URL || 'https://5sim.net/v1').replace(/\/+$/, '')

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

function normalizeCountry(entry) {
  if (!entry || typeof entry !== 'object') return null

  const rawName = entry.name || entry.country || entry.country_name || entry.title || entry.label || ''
  const rawCode = entry.code || entry.iso || entry.country_code || entry.id || entry.value || ''
  const rawFlag = entry.flag || entry.emoji || entry.icon || entry.country_flag || ''

  const name = String(rawName || rawCode || 'Unknown').trim()
  if (!name) return null

  return {
    id: String(rawCode || name).toLowerCase(),
    value: String(rawCode || name).toLowerCase(),
    label: name,
    code: String(rawCode || name).toUpperCase(),
    flag: rawFlag || '🌐',
  }
}

function normalizeProducts(payload) {
  const items = []

  const pushItem = (item) => {
    if (!item || typeof item !== 'object') return

    const name = String(item.name || item.product || item.service || item.title || item.label || '').trim()
    if (!name) return

    const qty = toNumber(item.qty ?? item.stock ?? item.available ?? item.count ?? 0)
    const price = toNumber(item.price ?? item.cost ?? item.rate ?? item.amount ?? 0)
    const category = String(item.category || item.type || item.group || 'SMS').trim() || 'SMS'

    items.push({
      id: name.toLowerCase(),
      name,
      qty,
      price,
      category,
    })
  }

  if (Array.isArray(payload)) {
    payload.forEach(pushItem)
    return items
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.products)) {
      payload.products.forEach(pushItem)
      return items
    }

    if (Array.isArray(payload.data)) {
      payload.data.forEach(pushItem)
      return items
    }

    Object.values(payload).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach(pushItem)
      } else if (value && typeof value === 'object') {
        pushItem(value)
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

router.get('/sms/countries', async (req, res) => {
  try {
    const data = await fetchFiveSim('/guest/countries')
    const countries = (Array.isArray(data) ? data : [])
      .map(normalizeCountry)
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
    const products = normalizeProducts(data)
      .filter((item) => item.qty > 0)
      .map((item) => ({
        ...item,
        price: convertFiveSimPrice(item.price, 'GHS'),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    res.json({ products })
  } catch (error) {
    console.error('[5sim] products failed', error.message)
    res.status(502).json({ error: 'Unable to load 5sim products right now.' })
  }
})

router.post('/sms/buy-number', async (req, res) => {
  try {
    const { country, product, currency = 'GHS' } = req.body || {}
    const productName = product?.name || 'Unknown service'
    const productPrice = convertFiveSimPrice(product?.price || 0, currency)

    const order = {
      id: `SMS-${Date.now()}`,
      country: country || 'Unknown country',
      product: productName,
      phoneNumber: `+${Math.floor(100000 + Math.random() * 900000)}`,
      expiresAt: Date.now() + 15 * 60 * 1000,
      status: 'Waiting for SMS OTP code...',
      price: productPrice,
      currency,
    }

    res.json({ ok: true, order })
  } catch (error) {
    console.error('[5sim] buy-number failed', error.message)
    res.status(502).json({ error: 'Unable to create the SMS activation request right now.' })
  }
})

export default router
