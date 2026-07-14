// Shared currency formatting + pricing helpers for the frontend.
// Prices are displayed and calculated directly in Ghanaian cedis.

export const PROFIT_MULTIPLIER = 3.5
export const GHS_USD_RATE = 11.4

export const CURRENCY_META = {
  GHS: { code: 'GHS', symbol: '₵', rate: GHS_USD_RATE, label: 'Ghanaian Cedi' },
}

export function convertLocalRate(localRate) {
  return Number(localRate || 0)
}

export function formatMoney(amount, currency = 'GHS') {
  const meta = CURRENCY_META[currency] || CURRENCY_META.GHS
  const n = Number(amount || 0)
  return `${meta.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function computeTotal(localRatePer1000, quantity) {
  return Math.round((Number(localRatePer1000 || 0) / 1000) * Number(quantity || 0) * 100) / 100
}
