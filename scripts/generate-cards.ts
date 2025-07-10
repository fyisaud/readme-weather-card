import fs from 'fs'
import path from 'path'
import pug from 'pug'
import puppeteer from 'puppeteer'
import GIFEncoder from 'gifencoder'
import { createCanvas, loadImage } from 'canvas'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

interface ThemeConfig {
  text: string
  foregroundText: string
  background: string
  iconColor: string
}

interface WeatherFrame {
  status: string
  location: string
  temp: number
  feels_like: number
  humidity: number
  dew_point: number
  condition: string
}

// Themes
const themesDir = path.join(__dirname, '../themes')
const themes = fs.readdirSync(themesDir)
  .filter(f => f.endsWith('.json'))
  .map(filename => ({
    name: path.basename(filename, '.json'),
    config: JSON.parse(fs.readFileSync(path.join(themesDir, filename), 'utf-8')) as ThemeConfig
  }))

// Result should just be alternating between images, but I'll write frame objects for each
// I'll leave it that way, for potentially extending logic.
const weatherFrames: WeatherFrame[] = [
  {
    status: "sunny",
    location: 'Riyadh, Saudi Arabia 🇸🇦',
    temp: 37,
    feels_like: 39,
    humidity: 20,
    dew_point: 9,
    condition: 'Clear Sky, Light Breeze',
  },
  {
    status: "sunny",
    location: 'Riyadh, Saudi Arabia 🇸🇦',
    temp: 37,
    feels_like: 39,
    humidity: 20,
    dew_point: 9,
    condition: 'Clear Sky, Light Breeze',
  }
]

const outputDir = path.join(__dirname, '../public/cards')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

const width = 510
const height = 300

async function generate() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 3 })

  const iconSvg1 = fs.readFileSync(path.join(__dirname, `../icons/${weatherFrames[0].status}1.svg`), 'utf-8')
  const iconSvg2 = fs.readFileSync(path.join(__dirname, `../icons/${weatherFrames[1].status}2.svg`), 'utf-8')

  for (const theme of themes) {
    const html1 = pug.renderFile(path.join(__dirname, '../views/card.pug'), {
      weather: weatherFrames[0],
      theme: theme.config,
      iconSvg: iconSvg1,
    })
    await page.setContent(html1)
    const buffer1 = Buffer.from(await page.screenshot())

    const html2 = pug.renderFile(path.join(__dirname, '../views/card.pug'), {
      weather: weatherFrames[1],
      theme: theme.config,
      iconSvg: iconSvg2,
    })
    await page.setContent(html2)
    const buffer2 = Buffer.from(await page.screenshot())

    // PNG
    fs.writeFileSync(path.join(outputDir, `weather-${theme.name}.png`), buffer1)

    // Create GIF from both frames
    const encoder = new GIFEncoder(width, height)
    const gifPath = path.join(outputDir, `weather-${theme.name}.gif`)
    encoder.setDelay(1000)
    encoder.setRepeat(0)
    encoder.setQuality(1)
    const stream = encoder.createWriteStream({ delay: 1000, repeat: 0, quality: 1})
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