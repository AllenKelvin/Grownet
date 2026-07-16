import { Router } from 'express'
import axios from 'axios'
import { FIVE_SIM_API_URL, FIVE_SIM_API_KEY, PROVIDER_OPERATOR, USE_REAL_PROVIDER } from '../config/index.js'
import { getAllPhoneNumberPriceOverrides, getCustomPhoneNumberPrice, savePhoneNumberPriceOverrides } from '../config/phoneNumberPricing.js'

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

router.get('/sms/pricing-overrides', (_req, res) => {
  res.json({ overrides: getAllPhoneNumberPriceOverrides() })
})

router.put('/sms/pricing-overrides', (req, res) => {
  try {
    const { overrides } = req.body || {}
    const saved = savePhoneNumberPriceOverrides(overrides)
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
    const products = normalizeProducts(data)
      .filter((item) => item.qty > 0)
      .map((item) => {
        const basePrice = convertFiveSimPrice(item.price, 'GHS')
        return {
          ...item,
          price: getCustomPhoneNumberPrice(item.name, country, basePrice),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    res.json({ products })
  } catch (error) {
    console.error('[5sim] products failed', error.message)
    res.status(502).json({ error: 'Unable to load 5sim products right now.' })
  }
})

router.post('/sms/buy-number', async (req, res) => {
  try {
    const { country = 'any', product, currency = 'GHS' } = req.body || {}

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
      return res.json({ ok: true, order: provResp.data })
    }

    if (provResp.status === 400 && provResp.data && String(JSON.stringify(provResp.data)).toLowerCase().includes('not enough')) {
      return res.status(402).json({ error: 'Insufficient wallet balance at provider', detail: provResp.data })
    }

    return res.status(provResp.status || 502).json({ error: 'Provider buy failed', detail: provResp.data })
  } catch (error) {
    console.error('[5sim] buy-number failed', error.message)
    res.status(502).json({ error: 'Unable to create the SMS activation request right now.', detail: error.message })
  }
})

export default router
