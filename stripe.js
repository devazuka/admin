import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { Customer, Payment } from './data.js'

const stripe = S(STRIPE_SECRET)

const loadAllCharges = async starting_after => {
  const { has_more, data } = await stripe.charges.list({ starting_after, limit: 100 })
  for (const charge of data) {
    const email = charge.billing_details?.email || charge.receipt_email
    const customer = Customer.findOrCreate.email(email, {
      email,
      fullname: charge.billing_details?.name,
    })
    Payment.findOrCreate.id(charge.id, {
      id: charge.id,
      by: customer,
      at: charge.created * 1000,
      amount: charge.amount,
      disputed: charge.disputed,
      refunded: charge.refuned,
      status: charge.status,
    })
  }
  has_more && loadAllCharges(data.at(-1).id)
}

await loadAllCharges()

const handleStripeWebhook = () => {
  // TODO: update payements & customers
  // TODO: check signature
  // STRIPE_SIGNATURE
}

const decode = new TextDecoder().decode.bind(new TextDecoder())
// POST /stripe
export const POST_stripe = async ({ res }) => {
  let acc = ''
  res.onData((chunk, isLast) => {
    acc += decode(chunk)
    isLast && handleStripeWebhook(JSON.parse(acc))
  })
}

