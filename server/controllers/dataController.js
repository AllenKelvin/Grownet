import { Service, DataOrder, User, DataPackage } from '../models/index.js'
import { fetchAllenDataHubProducts, purchaseAllenDataHubOrder } from '../utils/allendatahub.js'

function normalizeTag(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

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

    const price = Number(pkg.local_price || 0)
    if (Number(user.wallet_balance || 0) < price) {
      return res.status(402).json({ error: 'Insufficient wallet balance', required: price, available: Number(user.wallet_balance || 0) })
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, { $inc: { wallet_balance: -price } }, { new: true })

    const order = await DataOrder.create({
      user_id,
      data_package_id: pkg._id,
      recipient_number: normalizedNumber,
      package_name: pkg.name,
      package_gig: pkg.gig || 'Unknown',
      package_description: pkg.description || '',
      price_local: price,
      currency_used: currency,
      order_status: 'pending',
    })

    return res.status(201).json({ ok: true, order, wallet_balance: updatedUser?.wallet_balance ?? user.wallet_balance })
  } catch (err) {
    console.error('[dataOrders] create failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export async function listAllenDataHubProducts(req, res) {
  try {
    const products = await fetchAllenDataHubProducts()
    const overrides = await DataPackage.find({}).lean()
    const overrideMap = new Map()

    overrides.forEach((pkg) => {
      const networkKey = normalizeTag(pkg.network)
      const nameKey = normalizeTag(pkg.name)
      const gigKey = normalizeTag(pkg.gig)
      if (networkKey && nameKey) {
        overrideMap.set(`${networkKey}:${nameKey}:${gigKey}`, pkg)
        overrideMap.set(`${networkKey}:${nameKey}`, pkg)
      }
      if (networkKey && gigKey) {
        overrideMap.set(`${networkKey}:${gigKey}`, pkg)
      }
    })

    const merged = products.map((product) => {
      const networkKey = normalizeTag(product.network)
      const nameKey = normalizeTag(product.name)
      const gigKey = normalizeTag(product.dataAmount || product.gig || '')
      const override = overrideMap.get(`${networkKey}:${nameKey}:${gigKey}`) || overrideMap.get(`${networkKey}:${nameKey}`) || overrideMap.get(`${networkKey}:${gigKey}`)

      return {
        ...product,
        name: override?.name || product.name,
        network: override?.network || product.network,
        gig: override?.gig || product.dataAmount || product.gig || '',
        local_price: Number(override?.local_price ?? product.local_price ?? product.apiPrice ?? 0),
        apiPrice: Number(override?.local_price ?? product.apiPrice ?? 0),
        description: override?.description || product.description || '',
      }
    })

    return res.json(merged)
  } catch (err) {
    console.error('[allendatahub] products failed', err)
    return res.status(err?.status || 500).json({ error: err.message, payload: err.payload })
  }
}

export async function createAllenDataHubPurchase(req, res) {
  try {
    const { user_id, network, volume, phoneNumber, currency, packageName, packageGig, priceLocal } = req.body
    if (!user_id || !network || !volume || !phoneNumber || !currency) {
      return res.status(400).json({ error: 'user_id, network, volume, phoneNumber and currency are required' })
    }

    const user = await User.findById(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const response = await purchaseAllenDataHubOrder({ network, volume, phoneNumber, apiKey: undefined })
    const price = Number(priceLocal || response?.order?.price || 0)
    const userBalance = Number(user.wallet_balance || 0)
    if (userBalance < price) {
      return res.status(402).json({ error: 'Insufficient wallet balance', required: price, available: userBalance })
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, { $inc: { wallet_balance: -price } }, { new: true })

    const order = await DataOrder.create({
      user_id,
      data_package_id: null,
      recipient_number: response.normalizedPhoneNumber,
      package_name: String(packageName || `${network} ${volume}GB`),
      package_gig: String(packageGig || `${volume}GB`),
      package_description: 'Purchased via AllenDataHub API',
      price_local: price,
      currency_used: currency,
      provider_order_id: response?.order?.id || null,
      order_status: response?.order?.status || 'pending',
    })

    return res.status(201).json({ ok: true, order, provider: 'allendatahub', response, wallet_balance: updatedUser?.wallet_balance ?? userBalance })
  } catch (err) {
    console.error('[dataOrders] allendatahub failed', err)
    return res.status(err?.status || 500).json({ error: err.message, payload: err.payload })
  }
}
