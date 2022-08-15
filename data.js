import { defineEntity, db } from './atoms.js'

export const User = defineEntity('user', {
  // discord user info
  id: String,
  login: String,

  // discord oauth
  token: String,
  expireAt: Date,
  refresh: String,

  // authentication
  session: String,
})

export const Customer = defineEntity('customer', {
  fullname: String,
  email: String,
  tax: String, // -> nif details
})

export const Payment = defineEntity('payment', {
  id: String,
  by: Customer,
  at: Date,
  type: String, // 'stripe' || 'cash',
  amount: Number, // in cents
  disputed: Boolean,
  refunded: Boolean,
  status: String,
})

export const Pass = defineEntity('pass', {
  at: Date,
  end: Date,
  type: String, // 'day' | 'week' | 'month'
  source: Payment,
})
