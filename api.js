import { createHash } from 'node:crypto'

import { getById } from './atoms.js'
import { Visit, Payment, Product, Referral, Person, Client, Coworker } from "./data.js"
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
export const POST_api_person = async ({ body }) => {
  const { _id, link, referral, ...data } = await body
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

// POST /api/link/client
export const POST_api_link_client = async ({ body }) => {
  const { personId, clientId } = await body
  const person = Person.get(personId)
  const client = Client.get(clientId)
  client.update({ is: person })
  // update matching payments
  for (const payment of Payment.filter.by(client)) {
    payment.update({ by: person })
  }
}

// POST /api/link/coworker
export const POST_api_link_coworker = async ({ body }) => {
  const { personId, coworkerId } = await body
  // update matching visits
  const person = Person.get(personId)
  const coworker = Coworker.get(coworkerId)
  coworker.update({ is: person })
  // update matching payments
  for (const visit of Visit.filter.by(coworker)) {
    visit.update({ by: person })
  }
}
