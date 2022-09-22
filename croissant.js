import { CROISSANT_SECRET } from './env.js'
import { intervalRetry } from './interval.js'
import { setCroissantRecord } from './pb.js'

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
}

// Update every minutes (working hours)
let limit = 99999
const formatName = user => `${user.firstName||''} ${user.lastName||''}`.trim().toLowerCase()
const _id = (entity) => Buffer.from(entity._id, "hex").toString('base64')
const refreshVisits = async () => {
  // TODO: only check when active sessions ?
  const time = new Date()
  const hours = time.getUTCHours()
  if (hours > 22 || hours < 8) return
  const now = time.getTime()
  const { visits } = await usages({ limit, skip: 0 })
  limit = 10 // set the limit to 10 for the following calls
  try {
  for (const visit of visits) {
    const { user } = visit
    await setCroissantRecord(_id(visit), {
      name: formatName(user),
      at: new Date(visit.begin),
      until: visit.end ? new Date(visit.end) : null,
      image: user.image?.filePath,
      croissant_id: user._id,
    })
    for (const guest of visit.guests) {
      await setCroissantRecord(_id(guest), {
        name: formatName(guest),
        at: new Date(guest.begin),
        until: guest.end ? new Date(guest.end) : null,
      })
    }
  }
  console.log('visits refreshed', time)
} catch (err) {
  console.log(err)
}
}

// refresh token every day
await intervalRetry(refreshToken, 1 * DAY)

// initial load of all the visits
await intervalRetry(refreshVisits, 1 * MIN)
