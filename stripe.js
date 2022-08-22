
import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { Client, Payment, Product } from './data.js'

const stripe = S(STRIPE_SECRET)

let starting_after
const productByCost = Object.fromEntries(Product.entities.map(p => [p.cost, p]))
const loadAllCharges = async () => {
  const { has_more, data } = await stripe.charges.list({ starting_after, limit: 100 })
  if (!data.length) return
  for (const charge of data) {
    const email = charge.billing_details?.email || charge.receipt_email
    const at = charge.created * 1000
    const client = Client.from.email(email, {
      email: email.toLowerCase(),
      fullname: charge.billing_details?.name?.toLowerCase(),
    }, at)
    if (charge.status !== 'succeeded') continue
    Payment.from.id(charge.id, {
      id: charge.id,
      by: client.is || client,
      at,
      amount: charge.amount,
      product: productByCost[charge.amount],
      disputed: charge.disputed,
      refunded: charge.refuned,
    })
  }
  starting_after = data.at(-1).id
  has_more && loadAllCharges()
}

await loadAllCharges()

// TODO: replace once webhook are handled
setInterval(loadAllCharges, 60000) // update every minutes

const handleStripeWebhook = () => {
  // TODO: update payements & customers
  // TODO: check signature
  // STRIPE_SIGNATURE
}

// POST /stripe
export const POST_stripe = async ({ body }) => {
  body.then(handleStripeWebhook)
}

