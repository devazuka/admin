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

export const Referral = defineEntity('referral', { id: String })
export const {
  croissant,
  instagram,
  linkedin,
  facebook,
  meetup,
  tiktok,
  google,
  other,
  map,
} = new Proxy({}, { get: (_, id) => Referral.from.id(id, { id }) })

export const Product = defineEntity('product', {
  id: String, // 'drink' || 'day_pass' || 'month_pass'
  cost: Number, // in cents
  // availability ?
  // description ?
})

const addProduct = (id, cost) => Product.from.id(id, { id, cost })
export const drink = addProduct('drink', 200)
export const dayPass = addProduct('day_pass', 1500)
export const monthPass = addProduct('month_pass', 15000)

// Our own infos
export const Person = defineEntity('person', {
  fullname: String,
  image: String,
  email: String,
  birth: Date,
  notes: String,
  org: String,
  referral: Referral, // source OR person
})

// From croissant
export const Coworker = defineEntity('coworker', {
  id: String,
  fullname: String,
  image: String,
  is: Person,
})

// From stripe
export const Client = defineEntity('client', {
  email: String,
  fullname: String,
  // tax: String, // not sure where this is stored yet
  is: Person,
})

export const Visit = defineEntity('visit', {
  id: String,
  at: Date,
  by: Client,
  end: Date,
  guest: String, // name of the guest
})

export const Payment = defineEntity('payment', {
  id: String, // stripe id (empty = cash)
  by: Client, // or person
  at: Date,
  org: String, // DEVAZUKA | 01
  product: Product,
  amount: Number, // in cents
  disputed: Boolean,
  refunded: Boolean,
})
