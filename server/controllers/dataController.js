import { Service, DataOrder, User } from '../models/index.js'

export async function listDataOrders(req, res) {
  try {
    const { user_id } = req.query
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }
    const orders = await DataOrder.find({ user_id }).sort({ created_at: -1 })
    return res.json(orders)
  } catch (err) {
    console.error('[dataOrders] list failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export async function createDataOrder(req, res) {
  try {
    const { user_id, local_service_id, recipient_number, currency } = req.body
    if (!user_id || !local_service_id || !recipient_number || !currency) {
      return res.status(400).json({ error: 'user_id, local_service_id, recipient_number and currency are required' })
    }

    const normalizedNumber = String(recipient_number || '').replace(/\D/g, '')
    if (normalizedNumber.length !== 10) {
      return res.status(400).json({ error: 'recipient_number must be 10 digits' })
    }

    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const service = await Service.findOne({ local_service_id: Number(local_service_id) })
    if (!service) return res.status(404).json({ error: 'Data package not found' })

    const order = await DataOrder.create({
      user_id,
      local_service_id: service.local_service_id,
      recipient_number: normalizedNumber,
      package_name: service.name,
      package_gig: service.gig || 'Unknown',
      package_description: service.description || '',
      price_local: Number(service.local_rate || 0),
      currency_used: currency,
      order_status: 'pending',
    })

    return res.status(201).json({ ok: true, order })
  } catch (err) {
    console.error('[dataOrders] create failed', err)
    return res.status(500).json({ error: err.message })
  }
}
