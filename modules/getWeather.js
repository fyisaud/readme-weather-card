// @ts-nocheck

import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function getConfig() {
  const configPath = path.join(__dirname, '../configuration/config.json')
  const data = await fs.readFile(configPath, 'utf-8')
  return JSON.parse(data)
}

function getIconBaseFromWeatherId(id, icon) {
  const isNight = icon.endsWith('n')

  if (id >= 200 && id <= 232) return 'thunderstorm'
  if (id >= 300 && id <= 321) return 'drizzle'
  if (id >= 500 && id <= 531) return 'rainy'
  if (id >= 600 && id <= 622) return 'snowy'
  if (id >= 701 && id <= 781) return 'cloudy'
  if (id === 800) return `clear${isNight ? '-night' : '-day'}`
  if (id >= 801 && id <= 804) return 'cloudy'

  return 'cloudy'
}

function countryCodeToFlagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 0x1F1E6 - 65))
    .join('')
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export async function getWeather() {
  const config = await getConfig()
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) throw new Error('OPENWEATHER_API_KEY is not set in environment variables')

  const { cityID, lat, lon, unitsDisplay } = config.openweathermap

  const url = `http://api.openweathermap.org/data/2.5/weather?id=${cityID}&lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unitsDisplay}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch weather: ${res.statusText}`)

  const data = await res.json()

  const weatherId = data.weather[0].id
  const icon = data.weather[0].icon
  const description = data.weather[0].description

  const baseIcon = getIconBaseFromWeatherId(weatherId, icon)

  return {
    status: baseIcon,
    location: `${data.name}, ${data.sys.country} ${countryCodeToFlagEmoji(data.sys.country)}`,
    temp: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    dew_point: Math.round(data.main.temp - ((100 - data.main.humidity) / 5)), // rough approximation
    condition: capitalizeFirstLetter(`${description}, ${data.wind.speed} m/s`),
  }
}
