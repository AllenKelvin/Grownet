import { getCountries } from '../lib/fiveSim.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const countries = await getCountries()
    res.status(200).json({ countries })
  } catch (error) {
    res.status(502).json({ error: 'Unable to load 5sim countries right now.' })
  }
}
