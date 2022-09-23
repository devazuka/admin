
import S from 'stripe'
import { STRIPE_SECRET, STRIPE_SIGNATURE } from './env.js'
import { setStripeRecord, records } from './pb.js'

const stripe = S(STRIPE_SECRET)

const updateSession = async updates => {
  if (!updates) return
  const query = await records.getList('stripe', 1, 1, {
    filter: `stripe_id = '${updates.stripe_id}'`,
  })
  const id = query.items?.[0]?.id
  id && (await records.update('stripe', id, updates))
}

const processSession = async session => {
  if (session.status !== 'complete') return
  // mode: payment | setup | subscription
  // status: open | complete | expired
  // payment_status: paid | unpaid | no_payment_required

  const data = {
    amount: session.amount_subtotal,
    discount: session.amount_subtotal - session.amount_total,
  }

  const item = session.line_items?.data?.[0]
  if (item) {
    data.quantity = item.quantity
    data.product = item.description
  }

  if (session.customer_details) {
    const address = noEmptyFields(session.customer_details.address)
    address && (data.address = address)
    Object.assign(data, noEmptyFields({
      email: session.customer_details.email,
      name: session.customer_details.name,
    }))
  }

  const details = formatSubscription(session.subscription)
    || formatCharge(session.payment_intent?.charges?.data?.[0])

  return details && setStripeRecord(session.id, { ...data, ...details })
}

const formatSubscription = subscription => subscription && {
  at: new Date(subscription.created * 1000),
  status: subscription.status === 'active' ? 'succeeded' : 'failed',
  disputed: false,
  refunded: false,
  stripe_id: subscription.id,
}

const formatCharge = charge => charge && {
  at: new Date(charge.created * 1000),
  status: charge.status,
  disputed: charge.disputed,
  refunded: charge.refunded,
  stripe_id: charge.id,
}

const notNullValue = ([k, v]) => v != null && v !== ''
const noEmptyFields = data => {
  if (!data) return
  const entries = Object.entries(data).filter(notNullValue)
  if (!entries.length) return
  return Object.fromEntries(entries)
}

// TODO: recover latest charge.id from database and use it as `start_after` point
// to avoid reloading ALL the data everytime, one day™️
for await (const session of stripe.checkout.sessions.list({
  limit: 100,
  expand: [
    'data.line_items',
    'data.payment_intent',
    'data.subscription',
  ],
})) {
  await processSession(session)
}

// POST /stripe
export const POST_stripe = async ({ body, req }) => {
  const sig = req.getHeader('stripe-signature')
  const event = stripe.webhooks.constructEvent(await body, sig, STRIPE_SIGNATURE)
  if (/^checkout\.session\.[a-z]+$/.test(event.type)) {
    console.log('handling', event.type)
    return processSession(event.data.object)
  }
  if (/^customer.subscription\.[a-z]+$/.test(event.type)) {
    console.log('handling', event.type)
    return updateSession(formatSubscription(event.data.object))
  }
  if (/^charge\.[a-z]+$/.test(event.type)) {
    console.log('handling', event.type)
    return updateSession(formatCharge(event.data.object))
  }
  console.log(event.type, 'not handled')
}
