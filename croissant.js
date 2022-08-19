import { CROISSANT_SECRET } from './env.js'
import { Customer, Visit } from './data.js'

const api = async (path, { params, headers, ...opts } = {}) => {
  const search = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`https://api.getcroissant.com/api/${path}${search}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      ...headers,
    },
  })
  if (res.status === 204) return
  try {
    const { error, ...data } = await res.json()
    if (error) {
      const err = Error(`Croissant request api/${path} failed status ${res.status}`)
      err.code = error.code || res.status
      err.info = error.message || res.status
      throw err
    }
    return data
  } catch (err) {
    throw Error(`Croissant request api/${path} was not JSON (status: ${res.status} ${res.statusText})`)
  }
}

const usages = (params, path = '') =>
  api(`usages/place/62f3c4b245b76e0045cfb239/${path}`, { params })

const MIN = 60000
const HOUR = 60*MIN
const DAY = 24*HOUR
let token
const refreshToken = async () => {
  const auth = await api('users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: "clement@devazuka.com",
      password: CROISSANT_SECRET
    })
  })
  token = auth.token
  console.log(JSON.parse(Buffer.from(token.split('.')[1], 'base64')))

  // refresh token every day
  setTimeout(refreshToken, 1 * DAY)
}

// Update every minutes (working hours)
let lastUpdate
const refreshVisits = async (limit = 10) => {
  const now = Date.now()
  // TODO: skip refresh outside of work hours
  try {
    const { visits } = await usages({ limit, skip: 0 })
    lastUpdate = now
    for (const visit of visits) {
      const { user } = visit
      const customer = Customer.findOrCreate.croissant(user._id, {
        croissant: user._id,
        fullname: `${user.firstName||''} ${user.lastName||''}`.trim(),
        image: user.image?.filePath || `https://robohash.org/${user._id}`,
      })
      Visit.findOrCreate.id(visit._id, {
        id: visit._id,
        by: customer,
        at: new Date(visit.begin),
        end: visit.end && new Date(visit.end),
      })
      for (const guest of visit.guests) {
        Visit.findOrCreate.id(guest._id, {
          id: guest._id,
          by: customer,
          at: new Date(guest.begin),
          end: guest.end && new Date(guest.end),
          guest: `${guest.firstName||''} ${guest.lastName||''}`.trim(),
        })
      }
    }
  } catch (err) {
    console.log(err)
    console.log('unable to refresh visits')
  }
  setTimeout(refreshVisits, 1*MIN)
}

// set the initial token
await refreshToken()

// initial load of all the visits
await refreshVisits(999999)
