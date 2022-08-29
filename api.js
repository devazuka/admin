import { createHash } from 'node:crypto'

import { getById } from './atoms.js'
import {
  // tables
  Visit, Payment, Product, Referral, Person, Client, Coworker,

  // data
  monthPass, dayPass,
} from "./data.js"
import { R } from './response.js'

// GET /api/all
export const GET_api_all = async ({ params, session }) =>
  new R(
    JSON.stringify({
      person: Person,
      coworker: Coworker,
      client: Client,
      payment: Payment,
      visit: Visit,
      product: Product,
      referral: Referral,
    }),
    { headers: { "content-type": "application/json" } }
  )

// POST /api/person
export const POST_api_person = async ({ json }) => {
  const { _id, link, referral, ...data } = await json
  referral && (data.referral = Referral.get(referral))
  const person = _id ? Person.get(_id).update(data) : Person(data)
  const linked = getById(link)
  if (linked) {
    if (Coworker.is(linked)) {
      linked.update({ is: person })
      for (const visit of Visit.filter.by(linked)) {
        visit.update({ by: person })
      }
    } else if (Client.is(linked)) {
      linked.update({ is: person })
      for (const payment of Payment.filter.by(linked)) {
        payment.update({ by: person })
      }
    }
  }
  if (person.image && !person.image.startsWith('https://robohash.org/')) return
  if (person.email && !person.image?.endsWith('?gravatar=hashed')) {
    const hash = createHash('md5').update(person.email).digest("hex")
    person.update({ image: `https://robohash.org/${hash}?gravatar=hashed` })
    return
  }
  const hash = createHash('md5').update(`${person._id}${person.fullname}`).digest("hex")
  person.update({ image: `https://robohash.org/${hash}` })
}

const MONTH = 30*24*60*60*1000 // 30 days in ms
const getLinkedPayment = (p, by) => {
  // only look at payment made by the visitor
  if (p.by !== by) return

  // check if active subscription
  if (p.product === monthPass) return p.at + MONTH < Date.now()
  if (p.product !== dayPass) return

  // find if the payment can still be used
  const visits = Visit.filter.payment(p)
  const uses = p.amount / dayPass.amount
  return visits.length < uses
}

// POST /api/checkin
export const POST_api_checkin = async ({ json }) => {
  const data = await json
  const by = Person.get(data.by)
  const at = Date.now()
  const payment = data.payment
    || payment.special[by.org]
    || Payment.find(getLinkedPayment, by)
  Visit({ at, by, payment })
}

// POST /api/checkout
export const POST_api_checkout = async ({ json }) => {
  const { id } = await json
  console.log('check-out visit:', id)
  Visit.get(id).update({ end: Date.now() })
}

// POST /api/link/client
export const POST_api_link_client = async ({ json }) => {
  const { personId, clientId } = await json
  const person = Person.get(personId)
  const client = Client.get(clientId)
  client.update({ is: person })
  // update matching payments
  for (const payment of Payment.filter.by(client)) {
    payment.update({ by: person })
  }
}

// POST /api/link/coworker
export const POST_api_link_coworker = async ({ json }) => {
  const { personId, coworkerId } = await json
  // update matching visits
  const person = Person.get(personId)
  const coworker = Coworker.get(coworkerId)
  coworker.update({ is: person })
  // update matching payments
  for (const visit of Visit.filter.by(coworker)) {
    visit.update({ by: person })
  }
}
