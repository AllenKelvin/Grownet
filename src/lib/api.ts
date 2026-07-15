// Frontend API client. Talks to the Express backend via the Vite proxy locally
// and to the deployed Render backend in production.

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function request(path: string, options: any = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error(data.error || `Request failed (${res.status})`)
    err.payload = data
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // users
  getUser: (id) => request(`/users/${id}`),
  listUsers: () => request('/users'),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),

  // services
  listServices: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/services${qs ? '?' + qs : ''}`)
  },
  listCategories: () => request('/categories'),
  syncServices: () => request('/services/sync', { method: 'POST' }),
  createService: (body) => request('/services', { method: 'POST', body: JSON.stringify(body) }),

  // orders
  placeOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  placeMassOrder: (body) => request('/orders/mass', { method: 'POST', body: JSON.stringify(body) }),
  listOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/orders${qs ? '?' + qs : ''}`)
  },

  // deposits
  createDeposit: (body) => request('/deposits', { method: 'POST', body: JSON.stringify(body) }),
  listDeposits: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/deposits${qs ? '?' + qs : ''}`)
  },

  // dashboard
  dashboardStats: (userId) => request(`/dashboard/${userId}`),

  // phone number pricing overrides
  getPhoneNumberPriceOverrides: () => request('/sms/pricing-overrides'),
  updatePhoneNumberPriceOverrides: (body) => request('/sms/pricing-overrides', { method: 'PUT', body: JSON.stringify(body) }),
}
