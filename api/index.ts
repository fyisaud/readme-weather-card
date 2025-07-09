import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
import path from 'path'
import view from '@fastify/view'
import pug from 'pug'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL

const localPort = 3000
const server: FastifyInstance = Fastify({
  logger: isLocal
})

server.register(view, {
  engine: { pug },
  root: path.join(__dirname, "..", "public", "views"),
  viewExt: 'pug'
})

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  }
}

server.get('/', opts, async (request, reply) => {
  return { success: true, message: 'Up & Running' }
})

server.get('/weather', async (request, reply) => {
  const data = {
    city: 'Riyadh',
    temp: 42,
    desc: 'Sunny with clear skies'
  }
  return reply.view('weatherFull.pug', data)
})

if (isLocal) {
  // Run persistent local server for dev
  server.listen({ port: localPort }).then(() => {
    console.log(`Server listening on http://localhost:${localPort}`)
  }).catch(err => {
    server.log.error(err)
    process.exit(1)
  })
}

// Serverless handle
export default async function handler(req: any, res: any) {
  await server.ready()
  server.server.emit('request', req, res)
}
