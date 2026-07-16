import { Router } from 'express'

// Mock SMS endpoints have been removed for production.
// This route intentionally returns 410 Gone to prevent accidental usage.

const router = Router()

router.post('/mock-sms/buy', (_req, res) => {
  res.status(410).json({ ok: false, error: 'Mock endpoints disabled in production.' })
})

export default router
