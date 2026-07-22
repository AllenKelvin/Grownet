// Express server entry (ESM). Boots the API, seeds the DB, starts the cron.

import express from 'express'
import cors from 'cors'
import router from './routes/index.js'
import { seedDatabase } from './db/seed.js'
import { startStatusCron } from './cron/statusCron.js'
import { connectDB } from './db/mongodb.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const FRONTEND_URLS = [
  ...(process.env.FRONTEND_URL?.split(',') || []),
  ...(process.env.CORS_ORIGIN?.split(',') || []),
  'https://cloudnum.org',
  'www.cloudnum.org',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean).map(url => url.trim())

app.use(cors({ origin: FRONTEND_URLS, credentials: true }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))
app.use('/api', router)

async function boot() {
  await connectDB()
  await seedDatabase()
  startStatusCron()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] CloudNum API running on http://0.0.0.0:${PORT}`)
  })
}

boot().catch((err) => {
  console.error('[server] boot failed:', err)
  process.exit(1)
})
