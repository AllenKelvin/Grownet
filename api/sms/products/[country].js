import { getProducts } from '../../lib/fiveSim.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const country = String(req.query.country || '').trim()
    if (!country) {
      res.status(400).json({ error: 'A country is required.' })
      return
    }

    const products = await getProducts(country)
    res.status(200).json({ products })
  } catch (error) {
    res.status(502).json({ error: 'Unable to load 5sim products right now.' })
  }
}
