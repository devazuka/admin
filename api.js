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
  const { _id, ...data } = await body
  const person = _id ? Person.get(_id).update(data) : Person(data)
  if (person.image && !person.image.startsWith('https://robohash.org/')) return person
  if (person.email && !person.image?.endsWith('?gravatar=hashed')) {
    const hash = createHash('md5').update(person.email).digest("hex")
    return person.update({ image: `https://robohash.org/${hash}?gravatar=hashed` })
  }
  const hash = createHash('md5').update(`${person._id}${person.fullname}`).digest("hex")
  return person.update({ image: `https://robohash.org/${hash}` })
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
