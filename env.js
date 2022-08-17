import { readFileSync } from 'fs'

const { env } = process
try {
  // try to import env.json
  Object.assign(env, JSON.parse(readFileSync('../env.json', 'utf8')))
} catch {}

export const isDev = env.NODE_ENV === 'development'
export const DISCORD_SECRET = env.JANUS_SECRET
export const CROISSANT_SECRET = env.CROISSANT_SECRET
export const STRIPE_SIGNATURE = env.STRIPE_SIGNATURE
export const STRIPE_SECRET = env.STRIPE_SECRET
export const BOT_TOKEN = env.JANUS_TOKEN
export const port = Number(env.PORT) || 8088
export const DOMAIN = env.DOMAIN || 'admin.devazuka.com'
