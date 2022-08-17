import { METHODS } from 'node:http'
import { User } from './data.js'
import { R } from './response.js'
import { DOMAIN, DISCORD_SECRET, BOT_TOKEN } from './env.js'

// const SUCCESS = { status: 200, statusText: 'OK' }
// const NOT_FOUND = { status: 404, statusText: 'Not Found' }
// const INTERNAL = { status: 500, statusText: 'Internal Server Error' }
const BAD_REQUEST = { status: 400, statusText: 'Bad Request' }
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' }
const TYPE_JSON = { 'content-type': 'application/json' }

export const rand = () =>
  Math.random().toString(36).slice(2, 12).padEnd(10, '0')

const GUILD = '957694647084400761'
const DISCORD_CLIENT = '826974634069983282'
const DISCORD_API = 'https://discordapp.com/api'
const oauthStates = new Map()

// purge oauthStates every minutes
setInterval(() => {
  const now = Date.now()
  for (const [state, expireAt] of oauthStates) {
    expireAt < now && oauthStates.delete(state)
  }
}, 60000)

const discord = method => async (path, { user, ...opts } = {}) => {
  const headers = opts.headers || (opts.headers = {})
  headers['content-type'] || (headers['content-type'] = 'application/json')
  if (user) {
    if (user.expireAt > Date.now()) {
      // TODO: refresh OAuth
      throw new R('oauth exipred', UNAUTHORIZED)
    }
    headers.authorization = `Bearer ${user.token}`
  } else if (!headers.authorization) {
    headers.authorization = `Bot ${BOT_TOKEN}`
  }
  opts.method = method
  const res = await fetch(`${DISCORD_API}/${path}`, opts)
  const { status } = res
  try {
    if (status === 204) return
    const result = await res.json()
    if (result.error) throw new R(result.error_description || result.error, { status })
    return result
  } catch (err) {
    throw new R(null, { status })
  }
}

METHODS.forEach(method => discord[method] = discord(method))

const getOrCreateUser = async (code, signal) => {
  // authResponse return `expire_in` but it's a relative value
  // Saving the date of the request to convert to an absolute value
  const now = Date.now()
  const auth = await discord.POST('oauth2/token', {
    signal,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      scope: 'identify',
      client_id: DISCORD_CLIENT,
      client_secret: DISCORD_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  })

  const token = auth.access_token
  const refresh = auth.refresh_token
  const expireAt = auth.expire_in * 1000 + now

  const { id, username, discriminator } = await discord.GET('users/@me', {
    signal,
    headers: { authorization: `Bearer ${token}` },
  })

  const login = `${username}#${discriminator}`
  const existingUser = User.find.id(id)
  if (existingUser) {
    existingUser.update({ login, token, expireAt, refresh })
    return existingUser
  }
  const session = `${Date.now().toString(36)}-${rand()}`
  return User({ id, login, session, token, expireAt, refresh })
}

// GET /auth/discord
export const GET_auth_discord = async ({ params, signal }) => {
  // Link open when redirected from discord OAuth
  const code = params.get('code')
  const state = params.get('state')
  if (!code) return new R('Missing Code Param', BAD_REQUEST)
  if (!state) return new R('Missing State Param', BAD_REQUEST)

  // We check that the OAuth request state exist and has not expired
  if (!oauthStates.has(state)) return new R('Bad State', UNAUTHORIZED)

  // If it's the first time we have to create the user
  const { login, session, level } = await getOrCreateUser(code, signal)

  // Redirect to the connected app while setting the secure auth cookie
  return new R(null, {
    status: 302,
    headers: {
      location: `/?${new URLSearchParams({ login, level })}`,
      'set-cookie': [
        `devazuka-session=${session}`,
        'max-age=31536000',
        'path=/',
        `domain=${DOMAIN}`,
        'httponly',
        'samesite=strict',
        'secure',
      ].join('; '),
    },
  })
}

// GET /link/discord
export const GET_link_discord = async ({ session }) => {
  // TODO: check if session is already active

  // Generate a random OAuth state
  const state = `${rand()}-${rand()}`

  // Save the random state in memory with a 15min expiration
  oauthStates.set(state, Date.now() + 60000 * 15)

  // Redirect to discord OAuth authorize link
  const location = `${DISCORD_API}/oauth2/authorize?${new URLSearchParams({
    client_id: DISCORD_CLIENT,
    response_type: 'code',
    scope: 'identify email guilds.join',
    state,
  })}`
  return new R(null, { headers: { location }, status: 302 })
}

// GET /logout
export const GET_logout = async ({ session }) => {
  // Clear Session
  const user = User.find.session(session)
  user?.update({ session: undefined })

  // Clear cookie
  const cookie = `devazuka-session=; path=/; domain=${DOMAIN}; max-age=-1`
  return new R(null, {
    status: 302,
    headers: { location: '/', 'set-cookie': cookie },
  })
}
