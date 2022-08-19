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
  croissant: String, // id form croissant
  fullname: String, // from stripe & croissant
  image: String, // from croissant
  email: String, // from stripe
  tax: String, // from stripe nif details
})

export const Visit = defineEntity('visit', {
  id: String,
  at: Date,
  by: Customer,
  end: Date,
  guest: String, // name of the guest
})

export const Product = defineEntity('product', {
  id: String, // 'drink' || 'day_pass' || 'month_pass'
  cost: Number, // in cents
  // availability ?
  // description ?
})

export const Payment = defineEntity('payment', {
  id: String, // stripe id
  by: Customer,
  at: Date,
  type: String, // 'stripe' || 'cash',
  product: Product,
  amount: Number, // in cents
  disputed: Boolean,
  refunded: Boolean,
  status: String,
})
