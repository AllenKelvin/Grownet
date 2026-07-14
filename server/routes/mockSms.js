import { Router } from 'express'

const router = Router()

router.post('/mock-sms/buy', (req, res) => {
  const { userBalance = 0, currency = 'GHS', country = 'usa', app = 'telegram', tierLabel = 'Basic', priceUsd = 1.85 } = req.body || {}

  const exchangeRates = {
    GHS: 11.4,
    NGN: 1370,
  }

  const localizedCost = Number((priceUsd * (exchangeRates[currency.toUpperCase()] || 1)).toFixed(2))
  const balanceAfter = Number(userBalance) - localizedCost

  res.json({
    ok: true,
    balanceAfter: Math.max(balanceAfter, 0),
    deducted: localizedCost,
    currency,
    order: {
      id: `SMS-${Math.floor(1000 + Math.random() * 9000)}`,
      country,
      app,
      tierLabel,
      phoneNumber: `+${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
      statusCode: 'PEND-1024',
      expiresAt: Date.now() + 15 * 60 * 1000,
      message: 'Mock activation created successfully.',
    },
  })
})

export default router
