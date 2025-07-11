export interface WeatherFrame {
  status: string
  location: string
  temp: number
  feels_like: number
  humidity: number
  time: string
  date: string;
  condition: string
}

export function getWeather(): Promise<WeatherFrame>