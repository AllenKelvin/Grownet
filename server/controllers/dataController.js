import { Service, DataOrder, User, DataPackage } from '../models/index.js'
import { fetchAllenDataHubProducts, purchaseAllenDataHubOrder } from '../utils/allendatahub.js'

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
    const { user_id, data_package_id, recipient_number, currency } = req.body
    if (!user_id || !data_package_id || !recipient_number || !currency) {
      return res.status(400).json({ error: 'user_id, data_package_id, recipient_number and currency are required' })
    }

    const normalizedNumber = String(recipient_number || '').replace(/\D/g, '')
    if (normalizedNumber.length !== 10) {
      return res.status(400).json({ error: 'recipient_number must be 10 digits' })
    }

    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const pkg = await DataPackage.findById(String(data_package_id))
    if (!pkg) return res.status(404).json({ error: 'Data package not found' })

    const order = await DataOrder.create({
      user_id,
      data_package_id: pkg._id,
      recipient_number: normalizedNumber,
      package_name: pkg.name,
      package_gig: pkg.gig || 'Unknown',
      package_description: pkg.description || '',
      price_local: Number(pkg.local_price || 0),
      currency_used: currency,
      order_status: 'pending',
    })

    return res.status(201).json({ ok: true, order })
  } catch (err) {
    console.error('[dataOrders] create failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export async function listAllenDataHubProducts(req, res) {
  try {
    const products = await fetchAllenDataHubProducts()
    return res.json(products)
  } catch (err) {
    console.error('[allendatahub] products failed', err)
    return res.status(err?.status || 500).json({ error: err.message, payload: err.payload })
  }
}

export async function createAllenDataHubPurchase(req, res) {
  try {
    const { user_id, network, volume, phoneNumber, currency } = req.body
    if (!user_id || !network || !volume || !phoneNumber || !currency) {
      return res.status(400).json({ error: 'user_id, network, volume, phoneNumber and currency are required' })
    }

    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const response = await purchaseAllenDataHubOrder({ network, volume, phoneNumber, apiKey: undefined })
    const order = await DataOrder.create({
      user_id,
      data_package_id: null,
      recipient_number: response.normalizedPhoneNumber,
      package_name: `${network} ${volume}GB`,
      package_gig: `${volume}GB`,
      package_description: 'Purchased via AllenDataHub API',
      price_local: Number(response?.order?.price || 0),
      currency_used: currency,
      order_status: response?.order?.status || 'pending',
    })

    return res.status(201).json({ ok: true, order, provider: 'allendatahub', response })
  } catch (err) {
    console.error('[dataOrders] allendatahub failed', err)
    return res.status(err?.status || 500).json({ error: err.message, payload: err.payload })
  }
}
