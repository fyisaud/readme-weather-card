// Preview server

import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import pug from 'pug'
import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const fastify = Fastify()

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../icons'),
  prefix: '/icons/',
})

const weatherFrames = [
  {
    status: "rainy",
    location: 'Riyadh, Saudi Arabia',
    temp: 37,
    feels_like: 39,
    humidity: 20,
    dew_point: 9,
    condition: 'Clear Sky, Light Breeze',
  },
  {
    status: "rainy",
    location: 'Riyadh, Saudi Arabia',
    temp: 39,
    feels_like: 41,
    humidity: 20,
    dew_point: 9,
    condition: 'Clear Sky, Light Breeze',
  }
]

// Load themes
const themesDir = path.join(__dirname, '../themes')
const themes = fs.readdirSync(themesDir)
  .filter(f => f.endsWith('.json'))
  .reduce((acc, filename) => {
    const name = path.basename(filename, '.json')
    const config = JSON.parse(fs.readFileSync(path.join(themesDir, filename), 'utf-8'))
    acc[name] = config
    return acc
  }, {} as Record<string, any>)

fastify.get('/', async (request, reply) => {
  const query = request.query as any
  const themeName = query.theme || 'dark'
  const frameIndex = parseInt(query.frame) || 0

  const theme = themes[themeName]
  if (!theme) {
    reply.status(404).send('Theme not found')
    return
  }

  const weather = weatherFrames[frameIndex] || weatherFrames[0]

  let iconSvg = ''
  try {
    const iconFileName = `${weather.status}${frameIndex + 1}.svg`
    iconSvg = fs.readFileSync(path.join(__dirname, `../icons/${iconFileName}`), 'utf-8')
  } catch (error) {
    console.warn(`⚠️ Missing SVG for frame ${frameIndex} with status "${weather.status}":`, error)
  }

  const html = pug.renderFile(path.join(__dirname, '../views/card.pug'), {
    weather,
    theme,
    iconSvg
  })

  reply.header('Content-Type', 'text/html; charset=utf-8').send(html)
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
  console.log(`🚀 Preview server running at: http://localhost:3000?theme=dark&frame=0`)
  console.log(`Try: http://localhost:3000?theme=dark&frame=1`)
})
