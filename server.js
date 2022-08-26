import { readFileSync } from 'node:fs'
import uWS from 'uws'
import { R } from './response.js'
import { isDev, port } from './env.js'
import * as discordRoutes from './discord.js'
import * as apiRoutes from './api.js'
import * as stripeRoutes from './stripe.js'
import './croissant.js'

const clients = new Map()
const toBuf = utf8 => new Uint8Array(Buffer.from(utf8))
const defaultMime = toBuf('application/octet-stream')
const COOKIE_HEADER = toBuf('cookie')
const CONTENT_TYPE = toBuf('Content-Type')
const SEC_WEBSOCKET_KEY = toBuf('sec-websocket-key')
const SEC_WEBSOCKET_PROTOCOL = toBuf('sec-websocket-protocol')
const SEC_WEBSOCKET_EXTENSIONS = toBuf('sec-websocket-extensions')
const mimes = {
  js: toBuf('text/javascript; charset=utf-8'),
  css: toBuf('text/css; charset=utf-8'),
  html: toBuf('text/html; charset=utf-8'),
  json: toBuf('application/json; charset=utf-8'),
}
// image/gif, image/png, image/jpeg, image/bmp, image/webp
// audio/midi, audio/mpeg, audio/webm, audio/ogg, audio/wav

const serveStatic = fileName => {
  const mime = mimes[fileName.split('.').at(-1)] || defaultMime
  if (isDev) return res => {
    res.writeHeader(CONTENT_TYPE, mime)
    res.end(readFileSync(fileName))
  }
  const content = readFileSync(fileName)
  return res => {
    res.writeHeader(CONTENT_TYPE, mime)
    res.end(content)
  }
}

const errToResponse = err => {
  if (err instanceof R) return err
  console.log(err.stack)
  return new R(err.message, { status: 500 })
}

const getSession = req => {
  const cookieStr = req.getHeader(COOKIE_HEADER)
  if (!cookieStr) return
  const x = cookieStr.indexOf(`devazuka-session=`)
  if (x < 0) return
  const y = cookieStr.indexOf('; ', x)
  return cookieStr.slice(x + 17, y < x ? cookieStr.length : y)
}

const decode = new TextDecoder().decode.bind(new TextDecoder())
export const collectBody = (res, callback) => {
  let acc = ''
  res.onData((chunk, isLast) => {
    acc += decode(chunk)
    isLast && callback(acc)
  })
}

const emptyResponse = new R('', { status: 204 })
const handle = action => async (res, req) => {
  const controller = new AbortController
  res.onAborted(() => controller.abort())
  const { signal } = controller
  const url = req.getUrl()
  const params = new URLSearchParams(req.getQuery())
  const session = getSession(req)
  let body
  const response = await action({
    url,
    params,
    session,
    signal,
    req,
    res,
    get json() { return this.body.then(JSON.parse) },
    get body() {
      return body || (body = new Promise((s, f) => {
        signal.addEventListener('aborted', () => f(emptyResponse))
        collectBody(res, s)
      }))
    }
  })
    .catch(errToResponse) || emptyResponse
  if (signal.aborted) return
  res.writeStatus(response.status)
  for (const [k, v] of response.headers) res.writeHeader(k, v)
  res.end(response.body)
}

const server = uWS.App()
.ws('/*', {
  // compression: uWS.SHARED_COMPRESSOR,
  // maxPayloadLength: 16 * 1024 * 1024,
  // idleTimeout: 12,
  upgrade: (res, req, context) => {
    const url = req.getUrl()
    const session = getSession(req)

    console.log('An Http connection wants to become WebSocket, URL:', url)
    console.log(req.getHeader('sec-websocket-protocol'))
    console.log('devazuka-session', session)

    res.upgrade(
      { url, session },
      /* Spell these correctly */
      req.getHeader(SEC_WEBSOCKET_KEY),
      req.getHeader(SEC_WEBSOCKET_PROTOCOL),
      req.getHeader(SEC_WEBSOCKET_EXTENSIONS),
      context,
    )
  },
  open: (ws) => {
    console.log('open', ws)
    // clients.add(ws)
    // ws.id = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
    // console.log(ws.id, 'WebSocket connected')
  },
  message: (ws, message, isBinary) => {
    console.log(ws.id, 'WebSocket message', decode(message), isBinary)
    ws.send(message, isBinary)
  },
  close: (ws, code, message) => {
    clients.delete(ws)
    console.log(ws.id, 'WebSocket closed')
  },
})
//.get('/lib/style.css', serveStatic('./lib/style.css'))
//.get('/lib/script.js', serveStatic('./lib/script.js'))

const routes = { ...discordRoutes, ...apiRoutes, ...stripeRoutes }
for (const [route, hander] of Object.entries(routes)) {
  const [method, ...path] = route.toLowerCase().split('_')
  console.log(method.toUpperCase(), `/${path.join('/')}`)
  server[method](`/${path.join('/')}`, handle(hander))
}

server
  .get('/*', serveStatic('./index.html'))
  .listen(port, err => console.log(err, { port }))
