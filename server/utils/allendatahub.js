import { ALLENDATAHUB_API_KEY, ALLENDATAHUB_BASE_URL } from '../config/index.js'

export function normalizePhoneNumber(phoneNumber) {
  const digits = String(phoneNumber || '').replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('233') && digits.length === 12) {
    return `0${digits.slice(3)}`
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return digits
  }

  if (digits.length === 9) {
    return `0${digits}`
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits
  }

  return digits.length >= 10 ? digits.slice(-10) : digits
}

async function requestAllenDataHub(path, { apiKey = ALLENDATAHUB_API_KEY, baseUrl = ALLENDATAHUB_BASE_URL, method = 'GET', body } = {}) {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '')
  const targetUrl = `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.message || data?.error || 'AllenDataHub request failed'
    const err = new Error(message)
    err.status = response.status
    err.payload = data
    throw err
  }

  return data
}

export async function fetchAllenDataHubProducts(apiKey = ALLENDATAHUB_API_KEY, baseUrl = ALLENDATAHUB_BASE_URL) {
  const data = await requestAllenDataHub('/api/v1/products', { apiKey, baseUrl, method: 'GET' })
  const products = Array.isArray(data?.products) ? data.products : []

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    network: product.network,
    dataAmount: product.dataAmount,
    description: product.description || '',
    apiPrice: Number(product.apiPrice || 0),
    local_price: Number(product.apiPrice || 0),
    currency: 'GHS',
    source: 'allendatahub',
  }))
}

export async function purchaseAllenDataHubOrder({ network, volume, phoneNumber, webhookUrl, apiKey = ALLENDATAHUB_API_KEY, baseUrl = ALLENDATAHUB_BASE_URL }) {
  const payload = {
    network,
    volume,
    phoneNumber: normalizePhoneNumber(phoneNumber),
  }

  if (webhookUrl) {
    payload.webhookUrl = webhookUrl
  }

  const data = await requestAllenDataHub('/api/v1/data/purchase', { apiKey, baseUrl, method: 'POST', body: payload })
  return {
    ...data,
    normalizedPhoneNumber: payload.phoneNumber,
  }
}
