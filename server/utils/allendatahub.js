import { ALLENDATAHUB_API_KEY, ALLENDATAHUB_BASE_URL } from '../config/index.js'

function buildFallbackProducts() {
  const fallbackPackages = [
    { id: 'mtn-1gb', name: 'MTN 1GB', network: 'MTN', dataAmount: '1GB', description: 'MTN 1GB bundle', apiPrice: 2.5 },
    { id: 'mtn-2gb', name: 'MTN 2GB', network: 'MTN', dataAmount: '2GB', description: 'MTN 2GB bundle', apiPrice: 4.5 },
    { id: 'mtn-3gb', name: 'MTN 3GB', network: 'MTN', dataAmount: '3GB', description: 'MTN 3GB bundle', apiPrice: 6.5 },
    { id: 'mtn-4gb', name: 'MTN 4GB', network: 'MTN', dataAmount: '4GB', description: 'MTN 4GB bundle', apiPrice: 8.5 },
    { id: 'mtn-5gb', name: 'MTN 5GB', network: 'MTN', dataAmount: '5GB', description: 'MTN 5GB bundle', apiPrice: 10.5 },
    { id: 'mtn-8gb', name: 'MTN 8GB', network: 'MTN', dataAmount: '8GB', description: 'MTN 8GB bundle', apiPrice: 16.5 },
    { id: 'mtn-10gb', name: 'MTN 10GB', network: 'MTN', dataAmount: '10GB', description: 'MTN 10GB bundle', apiPrice: 20.5 },
    { id: 'mtn-15gb', name: 'MTN 15GB', network: 'MTN', dataAmount: '15GB', description: 'MTN 15GB bundle', apiPrice: 30.5 },
    { id: 'mtn-20gb', name: 'MTN 20GB', network: 'MTN', dataAmount: '20GB', description: 'MTN 20GB bundle', apiPrice: 40.5 },
    { id: 'mtn-25gb', name: 'MTN 25GB', network: 'MTN', dataAmount: '25GB', description: 'MTN 25GB bundle', apiPrice: 50.5 },
    { id: 'mtn-30gb', name: 'MTN 30GB', network: 'MTN', dataAmount: '30GB', description: 'MTN 30GB bundle', apiPrice: 60.5 },
    { id: 'telecel-5gb', name: 'Telecel 5GB', network: 'Telecel', dataAmount: '5GB', description: 'Telecel 5GB bundle', apiPrice: 10.5 },
    { id: 'telecel-10gb', name: 'Telecel 10GB', network: 'Telecel', dataAmount: '10GB', description: 'Telecel 10GB bundle', apiPrice: 20.5 },
    { id: 'telecel-15gb', name: 'Telecel 15GB', network: 'Telecel', dataAmount: '15GB', description: 'Telecel 15GB bundle', apiPrice: 30.5 },
    { id: 'telecel-20gb', name: 'Telecel 20GB', network: 'Telecel', dataAmount: '20GB', description: 'Telecel 20GB bundle', apiPrice: 40.5 },
    { id: 'telecel-25gb', name: 'Telecel 25GB', network: 'Telecel', dataAmount: '25GB', description: 'Telecel 25GB bundle', apiPrice: 50.5 },
    { id: 'telecel-30gb', name: 'Telecel 30GB', network: 'Telecel', dataAmount: '30GB', description: 'Telecel 30GB bundle', apiPrice: 60.5 },
    { id: 'telecel-40gb', name: 'Telecel 40GB', network: 'Telecel', dataAmount: '40GB', description: 'Telecel 40GB bundle', apiPrice: 80.5 },
    { id: 'airteltigo-1gb', name: 'AirtelTigo 1GB', network: 'AirtelTigo', dataAmount: '1GB', description: 'AirtelTigo 1GB bundle', apiPrice: 2.5 },
    { id: 'airteltigo-2gb', name: 'AirtelTigo 2GB', network: 'AirtelTigo', dataAmount: '2GB', description: 'AirtelTigo 2GB bundle', apiPrice: 4.5 },
    { id: 'airteltigo-3gb', name: 'AirtelTigo 3GB', network: 'AirtelTigo', dataAmount: '3GB', description: 'AirtelTigo 3GB bundle', apiPrice: 6.5 },
    { id: 'airteltigo-4gb', name: 'AirtelTigo 4GB', network: 'AirtelTigo', dataAmount: '4GB', description: 'AirtelTigo 4GB bundle', apiPrice: 8.5 },
    { id: 'airteltigo-5gb', name: 'AirtelTigo 5GB', network: 'AirtelTigo', dataAmount: '5GB', description: 'AirtelTigo 5GB bundle', apiPrice: 10.5 },
    { id: 'airteltigo-6gb', name: 'AirtelTigo 6GB', network: 'AirtelTigo', dataAmount: '6GB', description: 'AirtelTigo 6GB bundle', apiPrice: 12.5 },
    { id: 'airteltigo-7gb', name: 'AirtelTigo 7GB', network: 'AirtelTigo', dataAmount: '7GB', description: 'AirtelTigo 7GB bundle', apiPrice: 14.5 },
    { id: 'airteltigo-8gb', name: 'AirtelTigo 8GB', network: 'AirtelTigo', dataAmount: '8GB', description: 'AirtelTigo 8GB bundle', apiPrice: 16.5 },
    { id: 'airteltigo-10gb', name: 'AirtelTigo 10GB', network: 'AirtelTigo', dataAmount: '10GB', description: 'AirtelTigo 10GB bundle', apiPrice: 20.5 },
    { id: 'airteltigo-12gb', name: 'AirtelTigo 12GB', network: 'AirtelTigo', dataAmount: '12GB', description: 'AirtelTigo 12GB bundle', apiPrice: 24.5 },
    { id: 'airteltigo-15gb', name: 'AirtelTigo 15GB', network: 'AirtelTigo', dataAmount: '15GB', description: 'AirtelTigo 15GB bundle', apiPrice: 30.5 },
    { id: 'airteltigo-20gb', name: 'AirtelTigo 20GB', network: 'AirtelTigo', dataAmount: '20GB', description: 'AirtelTigo 20GB bundle', apiPrice: 40.5 },
  ]

  return fallbackPackages.map((product) => ({
    id: product.id,
    name: product.name,
    network: product.network,
    dataAmount: product.dataAmount,
    description: product.description,
    apiPrice: Number(product.apiPrice || 0),
    local_price: Number(product.apiPrice || 0),
    currency: 'GHS',
    source: 'allendatahub-fallback',
  }))
}

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
  try {
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
  } catch (error) {
    console.warn('[allendatahub] falling back to built-in package catalog', error.message)
    return buildFallbackProducts()
  }
}

export async function fetchAllenDataHubOrderStatus(orderId, apiKey = ALLENDATAHUB_API_KEY, baseUrl = ALLENDATAHUB_BASE_URL) {
  const data = await requestAllenDataHub(`/api/v1/orders/${encodeURIComponent(String(orderId))}`, { apiKey, baseUrl, method: 'GET' })
  return data?.order || data
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
