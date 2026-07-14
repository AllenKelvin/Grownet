// Centralized configuration: exchange rates, profit margin, provider endpoint.
// In a real deployment these would come from env vars / a secrets store.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return {}

  const entries = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    entries[key] = value
  }
  return entries
}

const envValues = loadEnvFile()

export const PROFIT_MULTIPLIER = 3.5

// USD -> local currency exchange rates (baseline, configurable)
export const NGN_USD_RATE = 1370 // 1 USD = 1370 NGN
export const GHS_USD_RATE = 11.4  // 1 USD = 11.4 GHS

// 5SIM-compatible provider settings. The app can work offline with the built-in
// mock fallback, but when a real API key is provided the same flow will call the
// vendor endpoint instead.
export const PROVIDER_API_URL = process.env.PROVIDER_API_URL || envValues.PROVIDER_API_URL || 'https://5sim.net/v1'
export const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY || envValues.PROVIDER_API_KEY || ''
export const PROVIDER_API_TYPE = process.env.PROVIDER_API_TYPE || envValues.PROVIDER_API_TYPE || '5sim'
export const PROVIDER_COUNTRY = process.env.PROVIDER_COUNTRY || envValues.PROVIDER_COUNTRY || '1'
export const PROVIDER_OPERATOR = process.env.PROVIDER_OPERATOR || envValues.PROVIDER_OPERATOR || 'any'
export const PROVIDER_REF = process.env.PROVIDER_REF || envValues.PROVIDER_REF || 'grownet'
export const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || envValues.PROVIDER_TIMEOUT_MS || 10000)
export const USE_REAL_PROVIDER = String(process.env.USE_REAL_PROVIDER || envValues.USE_REAL_PROVIDER || 'false').toLowerCase() === 'true'

export const CURRENCIES = {
  NGN: { code: 'NGN', symbol: '₦', rate: NGN_USD_RATE, label: 'Nigerian Naira' },
  GHS: { code: 'GHS', symbol: '₵', rate: GHS_USD_RATE, label: 'Ghanaian Cedi' },
}

export const ORDER_STATUSES = [
  'Pending',
  'In Progress',
  'Completed',
  'Partial',
  'Canceled',
]

export const CRON_INTERVAL_MS = 15000 // status polling interval
