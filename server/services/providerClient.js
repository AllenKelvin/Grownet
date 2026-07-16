// Provider client for 5SIM-compatible order placement and status checks.
// The app can run fully offline with the built-in mock fallback, but when a real
// API key is configured and USE_REAL_PROVIDER=true, it will call the vendor API.

import axios from 'axios'
import {
  PROVIDER_API_URL,
  PROVIDER_API_KEY,
  PROVIDER_API_TYPE,
  PROVIDER_COUNTRY,
  PROVIDER_OPERATOR,
  PROVIDER_REF,
  FIVE_SIM_API_URL,
  FIVE_SIM_API_KEY,
  SMMZIO_API_URL,
  SMMZIO_API_KEY,
  PROVIDER_TIMEOUT_MS,
  USE_REAL_PROVIDER,
} from '../config/index.js'

function getBaseUrl() {
  if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
    return String(SMMZIO_API_URL || 'https://smmzio.com/api/v2').replace(/\/+$/, '')
  }
  return String(FIVE_SIM_API_URL || PROVIDER_API_URL || 'https://5sim.net/v1').replace(/\/+$/, '')
}

function getHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...extra }
  if (String(PROVIDER_API_TYPE || '').toLowerCase() !== 'smmzio') {
    const apiKey = FIVE_SIM_API_KEY || PROVIDER_API_KEY
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
}

async function requestProvider(path, { method = 'GET', body, headers } = {}) {
  if (!USE_REAL_PROVIDER) return null
  const url = `${getBaseUrl()}${path || ''}`
  try {
    const opts = {
      method,
      url,
      ...(body !== undefined ? { data: body } : {}),
      headers: getHeaders(headers),
      timeout: PROVIDER_TIMEOUT_MS,
    }

    // SMMZIO expects POST form-encoded requests to the /v2 endpoint
    if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
      opts.method = 'POST'
      // if body is an object, convert to URLSearchParams
      if (body && typeof body === 'object' && !(body instanceof URLSearchParams)) {
        const params = new URLSearchParams()
        for (const [k, v] of Object.entries(body)) {
          if (v !== undefined && v !== null) params.append(k, String(v))
        }
        opts.data = params.toString()
        opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...(opts.headers || {}) }
      }
    }

    const { data } = await axios.request(opts)
    return data
  } catch (err) {
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message
    console.warn(`[provider] ${method.toUpperCase()} ${path} failed: ${detail}`)
    return null
  }
}

function normalizeOrderId(data) {
  const candidates = [
    data?.id,
    data?.order,
    data?.order_id,
    data?.data?.id,
    data?.data?.order,
    data?.data?.order_id,
    data?.order_id?.id,
    data?.orderId,
    data?.data?.orderId,
  ]
  const found = candidates.find((value) => value !== undefined && value !== null && value !== '')
  return found ? String(found) : null
}

function normalizeStatus(data) {
  const status = data?.status ?? data?.state ?? data?.data?.status ?? data?.data?.state ?? 'Pending'
  const remains = data?.remains ?? data?.remaining ?? data?.data?.remains ?? data?.data?.remaining ?? 0
  const charge = data?.charge ?? data?.price ?? data?.cost ?? data?.data?.charge ?? '0.0000'
  const startCount = data?.start_count ?? data?.start ?? data?.data?.start_count ?? data?.data?.start ?? 0
  return {
    status: String(status),
    start_count: Number(startCount ?? 0),
    remains: Number(remains ?? 0),
    charge: String(charge ?? '0.0000'),
  }
}

function normalizeServices(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.services)) return data.services
  if (Array.isArray(data?.data)) return data.data
  if (data && typeof data === 'object') {
    const values = Object.values(data).filter((item) => item && typeof item === 'object')
    if (values.length && Array.isArray(values[0])) return values[0]
  }
  return []
}

// Mock helpers removed for production — provider client no longer uses local mock ids or services.

/**
 * Place an order with the upstream provider.
 * Returns: { order: <provider_order_id> }
 */
export async function providerAddOrder({ service, link, quantity }) {
  if (!USE_REAL_PROVIDER) {
    throw new Error('USE_REAL_PROVIDER=false — provider calls are disabled in configuration')
  }

  // SMMZIO add order
  if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
    const payload = { key: SMMZIO_API_KEY, action: 'add', service, link, quantity }
    const data = await requestProvider('', { method: 'POST', body: payload })
    if (data && (data.order || data.id)) return { order: String(data.order || data.id) }
    const detail = data ? JSON.stringify(data) : 'no response'
    throw new Error(`[provider] smmzio add-order failed: ${detail}`)
  }

  // 5SIM add order
  const country = String(PROVIDER_COUNTRY || 'england').trim()
  const operator = String(PROVIDER_OPERATOR || 'any').trim()
  const product = String(service ?? 'amazon').trim()
  const activationPath = `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`

  const data = await requestProvider(activationPath, { method: 'GET' })
  const normalized = normalizeOrderId(data)
  if (normalized) return { order: normalized }
  const detail = data ? JSON.stringify(data) : 'no response'
  throw new Error(`[provider] add-order failed: ${detail}`)
}

/**
 * Check the status of an order with the upstream provider.
 * Returns: { status, start_count, remains, charge }
 */
export async function providerCheckStatus(providerOrderId) {
  if (!USE_REAL_PROVIDER) {
    throw new Error('USE_REAL_PROVIDER=false — provider status checks are disabled')
  }

  if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
    const payload = { key: SMMZIO_API_KEY, action: 'status', order: providerOrderId }
    const data = await requestProvider('', { method: 'POST', body: payload })
    if (data) {
      const normalized = normalizeStatus(data)
      if (normalized && (normalized.status || normalized.remains !== undefined)) return normalized
    }
    const detail = data ? JSON.stringify(data) : 'no response'
    throw new Error(`[provider] smmzio status check failed: ${detail}`)
  }

  const data = await requestProvider(`/user/check/${encodeURIComponent(String(providerOrderId))}`, { method: 'GET' })
  if (data) {
    const normalized = normalizeStatus(data)
    if (normalized && (normalized.status || normalized.remains !== undefined)) return normalized
  }
  const detail = data ? JSON.stringify(data) : 'no response'
  throw new Error(`[provider] 5sim status check failed: ${detail}`)
}

/**
 * Fetch the provider's service catalog (wholesale USD rates).
 */
export async function providerFetchServices() {
  if (!USE_REAL_PROVIDER) { throw new Error('USE_REAL_PROVIDER=false — fetching provider catalog is disabled') }
    if (USE_REAL_PROVIDER) {
    if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
      const payload = { key: SMMZIO_API_KEY, action: 'services' }
      const data = await requestProvider('', { method: 'POST', body: payload })
      const normalized = normalizeServices(data)
      if (normalized.length) {
        return normalized.map((item, index) => ({
          service: item.service ?? item.id ?? item.code ?? index + 1,
          name: item.name ?? item.service ?? item.code ?? 'Service',
          category: item.category ?? item.type ?? 'SMM',
          rate: Number(item.rate ?? item.price ?? item.cost ?? 0) || 0,
          min: Number(item.min ?? item.min_quantity ?? 1) || 1,
          max: Number(item.max ?? item.max_quantity ?? 10000) || 10000,
          refill: item.refill ?? true,
        }))
      }
      console.warn('[provider] smmzio services response was empty or not in expected shape')
    } else {
      const data = await requestProvider('/guest/prices', { method: 'GET' })
      const normalized = normalizeServices(data)
      if (normalized.length) {
        return normalized.map((item, index) => ({
          service: item.service ?? item.id ?? item.code ?? index + 1,
          name: item.name ?? item.service ?? item.code ?? 'Service',
          category: item.category ?? 'SMS',
          rate: item.rate ?? item.price ?? item.cost ?? 0,
          min: item.min ?? item.min_quantity ?? 1,
          max: item.max ?? item.max_quantity ?? 10000,
          refill: item.refill ?? true,
        }))
      }

      if (data && typeof data === 'object') {
        const priceEntries = Object.entries(data)
        if (priceEntries.length) {
          return priceEntries.slice(0, 20).map(([serviceKey, value]) => {
            const nested = value && typeof value === 'object' ? value : {}
            const priceValue = nested.cost ?? nested.price ?? nested.rate ?? 0
            return {
              service: serviceKey,
              name: serviceKey,
              category: 'SMS',
              rate: Number(priceValue) || 0,
              min: 1,
              max: 10000,
              refill: true,
            }
          })
        }
      }

      console.warn('[provider] services response was empty or not in expected shape')
    }
  }

  throw new Error('Provider catalog unavailable or returned unexpected shape')
}

export async function providerCheckConnection() {
  if (!USE_REAL_PROVIDER) {
    return { ok: false, provider: 'disabled', message: 'USE_REAL_PROVIDER=false' }
  }

  if (String(PROVIDER_API_TYPE || '').toLowerCase() === 'smmzio') {
    const data = await requestProvider('', { method: 'POST', body: { key: SMMZIO_API_KEY, action: 'balance' } })
    if (!data) return { ok: false, provider: 'smmzio', error: 'Unable to validate SMMZIO credentials' }
    return { ok: true, provider: 'smmzio', data }
  }

  const profile = await requestProvider('/user/profile', { method: 'GET' })
  if (!profile) {
    return { ok: false, provider: '5sim', error: 'Unable to validate 5SIM credentials via /user/profile' }
  }
  return { ok: true, provider: '5sim', data: profile }
}
