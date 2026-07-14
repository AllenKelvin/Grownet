// Status Checking Cron Task.
// Finds all local orders marked 'In Progress', packs their provider reference
// IDs, requests status from the provider (action: "status"), and updates local
// state. On 'Completed' -> update local. On 'Canceled'/'Partial' -> compute
// remaining undelivered units and refund the user's wallet instantly.

import { Order, User } from '../models/index.js'
import { providerCheckStatus } from '../services/providerClient.js'
import { computeRefund } from '../utils/exchange.js'
import { CRON_INTERVAL_MS } from '../config/index.js'

let timer = null

export function startStatusCron() {
  if (timer) return
  timer = setInterval(runPoll, CRON_INTERVAL_MS)
  console.log(`[cron] status poller started (every ${CRON_INTERVAL_MS / 1000}s)`)
  // run once immediately
  runPoll().catch((e) => console.error('[cron] initial run failed', e))
}

export function stopStatusCron() {
  if (timer) clearInterval(timer)
  timer = null
}

async function runPoll() {
  try {
    const openOrders = await Order.find({ order_status: 'In Progress' })
    if (openOrders.length === 0) return

    console.log(`[cron] polling ${openOrders.length} open order(s)...`)

    for (const order of openOrders) {
      if (!order.provider_order_id) continue
      try {
        const status = await providerCheckStatus(order.provider_order_id)
        await applyStatusUpdate(order, status)
      } catch (err) {
        console.warn(`[cron] status check failed for ${order._id}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[cron] poll error:', err)
  }
}

async function applyStatusUpdate(order, providerStatus) {
  const upstream = String(providerStatus.status || '').toLowerCase()
  const remains = Number(providerStatus.remains || 0)

  if (upstream === 'completed') {
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        order_status: 'Completed',
        remains: 0,
        updated_at: new Date().toISOString(),
      },
    })
    console.log(`[cron] order ${order._id} -> Completed`)
    return
  }

  if (upstream === 'canceled' || upstream === 'cancel') {
    const refund = computeRefund(order.total_charged_local, order.quantity, order.quantity)
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        order_status: 'Canceled',
        remains: order.quantity,
        updated_at: new Date().toISOString(),
      },
    })
    if (refund > 0) {
      await User.findByIdAndUpdate(order.user_id, { $inc: { wallet_balance: refund } })
      console.log(`[cron] order ${order._id} canceled, refunded ${refund} ${order.currency_used}`)
    }
    return
  }

  if (upstream === 'partial') {
    const undelivered = Math.max(remains, 0)
    const refund = computeRefund(order.total_charged_local, order.quantity, undelivered)
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        order_status: 'Partial',
        remains: undelivered,
        updated_at: new Date().toISOString(),
      },
    })
    if (refund > 0) {
      await User.findByIdAndUpdate(order.user_id, { $inc: { wallet_balance: refund } })
      console.log(`[cron] order ${order._id} partial, refunded ${refund} ${order.currency_used} for ${undelivered} units`)
    }
    return
  }

  // still in progress / pending — just refresh remains
  await Order.findByIdAndUpdate(order._id, {
    $set: {
      remains: Number(remains) || order.remains,
      updated_at: new Date().toISOString(),
    },
  })
}
