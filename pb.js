import PocketBase from 'pocketbase'

import { PASSWORD } from './env.js'

const { admins, records } = new PocketBase('https://book.devazuka.com')

const authData = await admins.authViaEmail('server@devazuka.com', PASSWORD)

// spamming request too fast = killed
let cooldown = Promise.resolve()
const setRecord = collection => async (externalId, data) => {
  const id = externalId.slice(-15) // pb needs 15len id, it's unique enough
  try {
    await cooldown
    cooldown = new Promise(s => setTimeout(s), 100)
    console.log(`${collection}/${id}`, data)
    await records.update(collection, id, data)
  } catch (err) {
    if (err.status !== 404) throw err
    await records.create(collection, { id, ...data })
  }
}

export const setStripeRecord = setRecord('stripe')
export const setCroissantRecord = setRecord('croissant')
