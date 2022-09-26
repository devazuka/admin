import PocketBase from 'pocketbase'

import { PASSWORD } from './env.js'

export const { admins, records } = new PocketBase('https://book.devazuka.com')

const authData = await admins.authViaEmail('server@devazuka.com', PASSWORD)

// spamming request too fast = killed
let cooldown = Promise.resolve()
const deepEq = (a, b) => {
  if (a === b) return true
  if (!a || !b) return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEq(v, b[i]))
  }
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() === new Date(b).getTime()
  }
  if (typeof a === "object" && typeof b === "object") {
    return Object.entries(a).every(([k, v]) => deepEq(v, b[k]))
  }
  return false
}

const setRecord = collection => async (externalId, data) => {
  const id = externalId.slice(-15) // pb needs 15len id, it's unique enough
  try {
    await cooldown
    cooldown = new Promise(s => setTimeout(s), 100)
    const current = await client.records.getOne(collection, id)
    const changes = Object.entries(data)
      .filter(([key, value]) => !deepEq(value, current[key]))
    if (!changes.length) return console.log(`${collection}/${id}:no-changes`)

    const changesData = Object.fromEntries(changes)
    console.log(`${collection}/${id}:change`, changesData)
    // return without awaiting because the error should not be catched here
    return records.update(collection, id, changesData)
  } catch (err) {
    if (err.status !== 404) throw err
    console.log(`${collection}/${id}:created`, data)
    await records.create(collection, { id, ...data })
  }
}

export const setStripeRecord = setRecord('stripe')
export const setCroissantRecord = setRecord('croissant')
