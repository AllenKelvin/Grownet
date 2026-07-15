import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const overridesPath = path.join(__dirname, '..', 'data', 'phoneNumberPriceOverrides.json')

function parseOverrides() {
  const envValue = process.env.SMS_PRICE_OVERRIDES
  if (envValue) {
    try {
      const parsed = JSON.parse(envValue)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // fall back to file-based overrides
    }
  }

  if (fs.existsSync(overridesPath)) {
    try {
      const raw = fs.readFileSync(overridesPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore invalid overrides and fall back to empty config
    }
  }

  return {}
}

function normalizeKey(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function readPriceValue(source) {
  if (typeof source === 'number' && Number.isFinite(source)) return Number(source.toFixed(2))
  if (typeof source === 'string' && source.trim()) {
    const parsed = Number(source)
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2))
  }
  return null
}

function normalizeOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return {}

  const normalized = {}
  Object.entries(overrides).forEach(([key, value]) => {
    const parsed = readPriceValue(value)
    if (parsed !== null) normalized[normalizeKey(key)] = parsed
  })

  return normalized
}

export function getAllPhoneNumberPriceOverrides() {
  return normalizeOverrides(parseOverrides())
}

export function savePhoneNumberPriceOverrides(overrides) {
  const normalized = normalizeOverrides(overrides)
  fs.writeFileSync(overridesPath, JSON.stringify(normalized, null, 2) + '\n')
  return normalized
}

export function getCustomPhoneNumberPrice(productName, country = '', fallbackPrice = 0) {
  const overrides = normalizeOverrides(parseOverrides())
  const normalizedCountry = normalizeKey(country)
  const normalizedProduct = normalizeKey(productName)

  const candidates = []
  if (normalizedCountry && normalizedProduct) candidates.push(`${normalizedCountry}:${normalizedProduct}`)
  if (normalizedCountry) candidates.push(normalizedCountry)
  if (normalizedProduct) candidates.push(normalizedProduct)
  candidates.push('default')

  for (const key of candidates) {
    const direct = readPriceValue(overrides[normalizeKey(key)])
    if (direct !== null) return direct
  }

  return Number(Number(fallbackPrice || 0).toFixed(2))
}
