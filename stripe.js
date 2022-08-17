import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { Customer, Payment } from './data.js'

const stripe = S(STRIPE_SECRET)

const loadCustomer = data => {
  const match = Customer.find.email(data.email)
  return match ? match.update(data) : Customer(data)
}

const loadPayment = charge => {
  const email = charge.billing_details?.email || charge.receipt_email
  console.log()
  const customer = loadCustomer({ email, fullname: charge.billing_details?.name })
  const match = Payment.find.id(charge.id)
  const paymentData = {
    id: charge.id,
    by: customer,
    at: charge.created * 1000,
    amount: charge.amount,
    disputed: charge.disputed,
    refunded: charge.refuned,
    status: charge.status,
  }
  return match ? match.update(paymentData) : Payment(paymentData)
}

const loadAllCharges = async starting_after => {
  const { has_more, data } = await stripe.charges.list({ starting_after, limit: 100 })
  console.log({ starting_after, data })
  for (const charge of data) console.log(loadPayment(charge))
  has_more && loadAllCharges(data.at(-1).id)
}

await loadAllCharges()

const handleStripeWebhook = () => {
  // TODO: update payements & customers
  // TODO: check signature
  // STRIPE_SIGNATURE
}

// POST /stripe
const decode = new TextDecoder().decode.bind(new TextDecoder())
export const POST_stripe = async ({ res }) => {
  let acc = ''
  res.onData((chunk, isLast) => {
    acc += decode(chunk)
    isLast && handleStripeWebhook(JSON.parse(acc))
  })
}

