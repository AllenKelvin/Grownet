import { createOrder } from '../lib/fiveSim.js'

export const config = { runtime: 'nodejs20.x' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const order = await createOrder(body)
    res.status(200).json({ ok: true, order })
  } catch (error) {
    res.status(502).json({ error: 'Unable to create the SMS activation request right now.' })
  }
}
