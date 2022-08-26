
import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { Client, Payment, Product, monthPass, dayPass } from './data.js'

const stripe = S(STRIPE_SECRET)

const loadCharge = charge => {
  const email = charge.billing_details?.email || charge.receipt_email
  const at = charge.created * 1000
  const client = Client.from.email(email, {
    email: email.toLowerCase(),
    fullname: charge.billing_details?.name?.toLowerCase(),
  }, at)
  Payment.from.id(charge.id, {
    id: charge.id,
    by: client.is || client,
    at,
    status: charge.status,
    amount: charge.amount,
    product: charge.amount === 150_00 ? monthPass : dayPass,
    disputed: charge.disputed,
    refunded: charge.refuned,
  })
}

// TODO: recover latest charge.id from database and use it as `start_after` point
// to avoid reloading ALL the data everytime, one day™️
for await (const charge of stripe.charges.list({ limit: 100 })) loadCharge(charge)

// POST /stripe
export const POST_stripe = async ({ body, req }) => {
  const sig = req.getHeader('stripe-signature')
  const event = stripe.webhooks.constructEvent(await body, sig, STRIPE_SIGNATURE)
  if (/^charge\.[a-z]+$/.test(event.type)) {
    console.log('handling', event.type)
    return loadCharge(event.data.object)
  }
  console.log(event.type, 'not handled')
}

