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
  PROVIDER_TIMEOUT_MS,
  USE_REAL_PROVIDER,
} from '../config/index.js'

function getBaseUrl() {
  return String(PROVIDER_API_URL || 'https://5sim.net/v1').replace(/\/+$/, '')
}

function getHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...extra }
  if (PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${PROVIDER_API_KEY}`
  }
  return headers
}

async function requestProvider(path, { method = 'GET', body, headers } = {}) {
  if (!USE_REAL_PROVIDER) return null

  const url = `${getBaseUrl()}${path}`
  try {
    const { data } = await axios.request({
      method,
      url,
      ...(body !== undefined ? { data: body } : {}),
      headers: getHeaders(headers),
      timeout: PROVIDER_TIMEOUT_MS,
    })
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

function buildMockOrderId() {
  return 'PRT-' + Math.floor(100000 + Math.random() * 900000)
}

function buildMockServices() {
  return [
    { service: 1, name: 'Google Voice', category: 'SMS', rate: 0.95, min: 1, max: 1000, refill: true },
    { service: 2, name: 'Telegram', category: 'SMS', rate: 0.8, min: 1, max: 1000, refill: true },
    { service: 3, name: 'WhatsApp', category: 'SMS', rate: 1.1, min: 1, max: 1000, refill: true },
  ]
}

/**
 * Place an order with the upstream provider.
 * Returns: { order: <provider_order_id> }
 */
export async function providerAddOrder({ service, link, quantity }) {
  if (USE_REAL_PROVIDER) {
    const country = String(PROVIDER_COUNTRY || 'england').trim()
    const operator = String(PROVIDER_OPERATOR || 'any').trim()
    const product = String(service ?? 'amazon').trim()
    const activationPath = `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`

    const data = await requestProvider(activationPath, { method: 'GET' })
    const normalized = normalizeOrderId(data)
    if (normalized) return { order: normalized }
    console.warn('[provider] add-order response was not in an expected shape; using mock fallback')
  }

  return { order: buildMockOrderId() }
}

/**
 * Check the status of an order with the upstream provider.
 * Returns: { status, start_count, remains, charge }
 */
export async function providerCheckStatus(providerOrderId) {
  if (USE_REAL_PROVIDER) {
    const data = await requestProvider(`/user/check/${encodeURIComponent(String(providerOrderId))}`, { method: 'GET' })
    if (data) {
      const normalized = normalizeStatus(data)
      if (normalized && (normalized.status || normalized.remains !== undefined)) return normalized
    }
  }

  // Deterministic mock progression to keep cron behavior realistic.
  const seed = parseInt(String(providerOrderId).replace(/\D/g, '').slice(-3) || '1', 10)
  const phase = (seed % 5) + 1 // 1..5
  const statuses = ['Pending', 'In Progress', 'In Progress', 'Completed', 'Partial']
  const status = statuses[Math.min(phase, 4)]
  const remains = status === 'Completed' ? 0 : status === 'Partial' ? Math.floor(seed / 2) : 100
  return {
    status,
    start_count: 0,
    remains,
    charge: '0.0000',
  }
}

/**
 * Fetch the provider's service catalog (wholesale USD rates).
 */
export async function providerFetchServices() {
  if (USE_REAL_PROVIDER) {
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

    console.warn('[provider] services response was empty or not in expected shape; using mock catalog')
  }

  return buildMockServices()
}
