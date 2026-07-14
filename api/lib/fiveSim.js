const FIVE_SIM_BASE = String(process.env.FIVE_SIM_API_URL || 'https://5sim.net/v1').replace(/\/+$/, '')

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function convertFiveSimPrice(price, currency = 'GHS') {
  const amount = toNumber(price)
  if (!amount) return 0
  if (currency !== 'GHS') return Number(amount.toFixed(2))

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

    const name = String(item.name || item.product || item.service || item.title || item.label || fallbackKey || '').trim()
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
  const response = await fetch(`${FIVE_SIM_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`5sim request failed with ${response.status}`)
  }

  return response.json()
}

export async function getCountries() {
  const data = await fetchFiveSim('/guest/countries')
  return Object.entries(data || {})
    .map(([key, value]) => normalizeCountry(value, key))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function getProducts(country) {
  const data = await fetchFiveSim(`/guest/products/${encodeURIComponent(country)}/any`)
  return normalizeProducts(data)
    .filter((item) => item.qty > 0)
    .map((item) => ({
      ...item,
      price: convertFiveSimPrice(item.price, 'GHS'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createOrder({ country, product, currency = 'GHS' }) {
  const productName = product?.name || 'Unknown service'
  const productPrice = convertFiveSimPrice(product?.price || 0, currency)

  return {
    id: `SMS-${Date.now()}`,
    country: country || 'Unknown country',
    product: productName,
    phoneNumber: `+${Math.floor(100000 + Math.random() * 900000)}`,
    expiresAt: Date.now() + 15 * 60 * 1000,
    status: 'Waiting for SMS OTP code...',
    price: productPrice,
    currency,
  }
}
