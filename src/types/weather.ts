export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  wind_speed: number;
  weather: WeatherCondition[];
  uvi?: number;
  visibility?: number;
  sunrise?: number;
  sunset?: number;
}

export interface HourlyForecast {
  dt: number;
  temp: number;
  weather: WeatherCondition[];
  pop: number; // Probability of precipitation
}

export interface DailyForecast {
  dt: number;
  temp: {
    min: number;
    max: number;
    day: number;
  };
  weather: WeatherCondition[];
  summary?: string;
}

export interface OneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  isMock?: boolean;
}

export interface WeatherOverviewResponse {
  lat: number;
  lon: number;
  date: string;
  units: string;
  weather_overview: string;
}

// Chat-related types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface ChatSessionResponse {
  answer: string;
  data: any;
  session_id: string;
}
