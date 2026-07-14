// Shared currency formatting + exchange helpers for the frontend.
// Constants duplicated from server/config to avoid importing server code into
// the browser bundle.

export const PROFIT_MULTIPLIER = 3.5
export const NGN_USD_RATE = 1370
export const GHS_USD_RATE = 11.4

export const CURRENCY_META = {
  NGN: { code: 'NGN', symbol: '₦', rate: NGN_USD_RATE, label: 'Nigerian Naira' },
  GHS: { code: 'GHS', symbol: '₵', rate: GHS_USD_RATE, label: 'Ghanaian Cedi' },
}

// local_rate is stored as a per-1000 retail rate in the app's base currency.
// For this project we now treat it as GHS-based for display and calculation.
export function convertLocalRate(localRate, targetCurrency) {
  if (targetCurrency === 'GHS') return localRate
  if (targetCurrency === 'NGN') {
    const usd = localRate / GHS_USD_RATE
    return Math.round(usd * NGN_USD_RATE * 100) / 100
  }
  return localRate
}

export function formatMoney(amount, currency) {
  const meta = CURRENCY_META[currency] || CURRENCY_META.NGN
  const n = Number(amount || 0)
  return `${meta.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function computeTotal(localRatePer1000, quantity) {
  return Math.round((localRatePer1000 / 1000) * quantity * 100) / 100
}
