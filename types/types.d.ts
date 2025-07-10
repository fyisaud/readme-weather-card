export interface WeatherFrame {
  status: string
  location: string
  temp: number
  feels_like: number
  humidity: number
  dew_point: number
  condition: string
}

export function getWeather(): Promise<WeatherFrame>