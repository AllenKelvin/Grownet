// Real Mongoose schemas for MongoDB

import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  wallet_balance: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' }, // GHS or NGN
  account_status: { type: String, default: 'Active' }, // Active | Suspended
  created_at: { type: Date, default: Date.now },
})

const serviceSchema = new mongoose.Schema({
  local_service_id: { type: Number, required: true, unique: true },
  provider_service_id: { type: Number, required: true },
  category: { type: String, required: true },
  name: { type: String, required: true },
  wholesale_rate_usd: { type: Number, required: true },
  local_rate: { type: Number, required: true }, // per 1000, in user's currency
  min_quantity: { type: Number, required: true },
  max_quantity: { type: Number, required: true },
  refill_policy: { type: Boolean, default: true },
})

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  local_service_id: { type: Number, required: true },
  target_link: { type: String, required: true },
  quantity: { type: Number, required: true },
  total_charged_local: { type: Number, required: true },
  currency_used: { type: String, required: true },
  provider_order_id: { type: String, default: null },
  order_status: { type: String, default: 'Pending' },
  remains: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

const depositSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.Mixed, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  method: { type: String, required: true }, // card | bank | mtn | telecel | airteltigo
  status: { type: String, default: 'Completed' },
  created_at: { type: Date, default: Date.now },
})

export const User = mongoose.model('User', userSchema)
export const Service = mongoose.model('Service', serviceSchema)
export const Order = mongoose.model('Order', orderSchema)
export const Deposit = mongoose.model('Deposit', depositSchema)
