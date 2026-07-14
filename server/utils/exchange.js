// Exchange & Margin Matrix utility.
// Parses a baseline wholesale USD rate from a provider, applies the global
// PROFIT_MULTIPLIER margin, and converts to local currency.

import { PROFIT_MULTIPLIER, NGN_USD_RATE, GHS_USD_RATE } from '../config/index.js'

/**
 * Compute the local retail rate per 1000 units.
 * @param {number} wholesaleRateUsd - baseline provider rate per 1000 units in USD
 * @param {'NGN'|'GHS'} currency - target local currency
 * @returns {number} local rate per 1000 units, rounded to 2 decimals
 */
export function computeLocalRate(wholesaleRateUsd, currency) {
  const rate = currency === 'NGN' ? NGN_USD_RATE : GHS_USD_RATE
  const retailUsd = wholesaleRateUsd * PROFIT_MULTIPLIER
  return Math.round(retailUsd * rate * 100) / 100
}

/**
 * Compute the total charge in local currency for a given quantity.
 * @param {number} localRatePer1000 - local rate per 1000 units
 * @param {number} quantity - number of units ordered
 * @returns {number} total local charge, rounded to 2 decimals
 */
export function computeOrderTotal(localRatePer1000, quantity) {
  const total = (localRatePer1000 / 1000) * quantity
  return Math.round(total * 100) / 100
}

/**
 * Refund the undelivered portion of a partial/canceled order.
 * @param {number} totalChargedLocal - amount originally charged
 * @param {number} quantity - ordered quantity
 * @param {number} remains - undelivered units remaining
 * @returns {number} refund amount in local currency
 */
export function computeRefund(totalChargedLocal, quantity, remains) {
  if (quantity <= 0) return 0
  const refund = (totalChargedLocal / quantity) * remains
  return Math.round(refund * 100) / 100
}

/**
 * Convert a wallet balance from one local currency to another.
 * @param {number} amount - amount in the source currency
 * @param {'NGN'|'GHS'} from - source currency
 * @param {'NGN'|'GHS'} to - target currency
 * @returns {number} converted amount, rounded to 2 decimals
 */
export function convertCurrency(amount, from, to) {
  if (from === to) return Math.round(Number(amount) * 100) / 100
  const fromRate = from === 'NGN' ? NGN_USD_RATE : GHS_USD_RATE
  const toRate = to === 'NGN' ? NGN_USD_RATE : GHS_USD_RATE
  const usd = Number(amount) / fromRate
  return Math.round(usd * toRate * 100) / 100
}

export { PROFIT_MULTIPLIER, NGN_USD_RATE, GHS_USD_RATE }
