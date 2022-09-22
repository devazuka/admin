
import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { setStripeRecord } from './pb.js'

const stripe = S(STRIPE_SECRET)

const loadCharge = charge => setStripeRecord(charge.id, {
  name: charge.billing_details?.name?.toLowerCase() || null,
  email: (charge.billing_details?.email || charge.receipt_email).toLowerCase(),
  amount: charge.amount,
  disputed: charge.disputed,
  refunded: charge.refunded,
  status: charge.status,
  at: new Date(charge.created * 1000),
})


// TODO: recover latest charge.id from database and use it as `start_after` point
// to avoid reloading ALL the data everytime, one day™️
for await (const charge of stripe.charges.list({ limit: 100 })) {
  await loadCharge(charge)
}

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

