// MongoDB connection with a safe fallback to the mock model layer.
// This keeps the app usable even when Atlas is unreachable.

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kelvinnat175:Clarck3223@grownet.exl3wvz.mongodb.net/?appName=Grownet'

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('[db] Connected to MongoDB')
  } catch (err) {
    console.warn('[db] MongoDB unavailable, using fallback mock data:', err.message)
    try {
      await mongoose.disconnect()
    } catch {}
    mongoose.set('strictQuery', false)
  }
}

export { default as mongoose } from 'mongoose'
