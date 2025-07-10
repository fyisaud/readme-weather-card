import fs from 'fs'
import path from 'path'
import pug from 'pug'
import puppeteer from 'puppeteer'
import GIFEncoder from 'gifencoder'
import { createCanvas, loadImage } from 'canvas'
import { fileURLToPath } from 'url'
import { getWeather } from '../modules/getWeather.js'
import type { WeatherFrame } from '../types/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface ThemeConfig {
  text: string
  foregroundText: string
  background: string
  iconColor: string
}

// Load themes
const themesDir = path.join(__dirname, '../configuration/themes')
const themes = fs.readdirSync(themesDir)
  .filter(f => f.endsWith('.json'))
  .map(filename => ({
    name: path.basename(filename, '.json'),
    config: JSON.parse(fs.readFileSync(path.join(themesDir, filename), 'utf-8')) as ThemeConfig
  }))


const outputDir = path.join(__dirname, '../public/cards')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

const width = 510
const height = 300

async function generate() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 3 })

  const weather = await getWeather()
  const weatherFrames: WeatherFrame[] = [
    { ...weather, status: `${weather.status}1` },
    { ...weather, status: `${weather.status}2` }
  ]

  const iconSvg1 = fs.readFileSync(path.join(__dirname, `../icons/${weatherFrames[0].status}.svg`), 'utf-8')
  const iconSvg2 = fs.readFileSync(path.join(__dirname, `../icons/${weatherFrames[1].status}.svg`), 'utf-8')

  for (const theme of themes) {
    // Render frame 1
    const html1 = pug.renderFile(path.join(__dirname, '../views/card.pug'), {
      weather: weatherFrames[0],
      theme: theme.config,
      iconSvg: iconSvg1,
    })
    await page.setContent(html1)
    const buffer1 = Buffer.from(await page.screenshot())

    // Render frame 2
    const html2 = pug.renderFile(path.join(__dirname, '../views/card.pug'), {
      weather: weatherFrames[1],
      theme: theme.config,
      iconSvg: iconSvg2,
    })
    await page.setContent(html2)
    const buffer2 = Buffer.from(await page.screenshot())

    fs.writeFileSync(path.join(outputDir, `weather-${theme.name}.png`), buffer1)

    // GIF
    const encoder = new GIFEncoder(width, height)
    const gifPath = path.join(outputDir, `weather-${theme.name}.gif`)
    encoder.setDelay(1000)
    encoder.setRepeat(0)
    encoder.setQuality(1)
    const stream = encoder.createWriteStream({quality: 1, repeat: 0, delay: 1000}) // Still expects args
    stream.pipe(fs.createWriteStream(gifPath))

    encoder.start()
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const img1 = await loadImage(buffer1)
    ctx.drawImage(img1, 0, 0, width, height)
    encoder.addFrame(ctx as unknown as any)

    const img2 = await loadImage(buffer2)
    ctx.drawImage(img2, 0, 0, width, height)
    encoder.addFrame(ctx as unknown as any)

    encoder.finish()

    console.log(`✅ Generated weather cards for "${theme.name}"`)
  }

  await browser.close()
}

generate().catch(console.error)