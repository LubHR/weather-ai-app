import {
  GeocodingResult,
  OneCallResponse,
  WeatherOverviewResponse,
  ChatSessionResponse,
} from '../types/weather';

const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'e7778ace393d5ae1aa1a75af2c7290a5';
const BASE_URL = 'https://api.openweathermap.org';

// Mock Cities database for search fallback
const MOCK_CITIES: GeocodingResult[] = [
  { name: 'Київ', lat: 50.4501, lon: 30.5234, country: 'UA', state: 'м. Київ' },
  { name: 'Львів', lat: 49.8397, lon: 24.0297, country: 'UA', state: 'Львівська область' },
  { name: 'Одеса', lat: 46.4825, lon: 30.7233, country: 'UA', state: 'Одеська область' },
  { name: 'Харків', lat: 50.0015, lon: 36.2304, country: 'UA', state: 'Харківська область' },
  { name: 'Дніпро', lat: 48.4647, lon: 35.0462, country: 'UA', state: 'Дніпропетровська область' },
  { name: 'Івано-Франківськ', lat: 48.9215, lon: 24.7097, country: 'UA', state: 'Івано-Франківська область' },
  { name: 'Лондон', lat: 51.5074, lon: -0.1278, country: 'GB', state: 'Англія' },
  { name: 'Нью-Йорк', lat: 40.7128, lon: -74.0060, country: 'US', state: 'Нью-Йорк' },
  { name: 'Париж', lat: 48.8566, lon: 2.3522, country: 'FR', state: 'Іль-де-Франс' },
];

// Helper to find closest mock city coordinates
function findClosestMockCity(lat: number, lon: number): string {
  let minDistance = Infinity;
  let closestCityName = 'Київ';
  
  for (const city of MOCK_CITIES) {
    const distance = Math.pow(city.lat - lat, 2) + Math.pow(city.lon - lon, 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestCityName = city.name;
    }
  }
  
  return closestCityName;
}

// Generate realistic weather data for mock mode
function generateMockWeatherData(lat: number, lon: number): OneCallResponse {
  const cityName = findClosestMockCity(lat, lon);
  const nowUnix = Math.floor(Date.now() / 1000);
  
  let temp = 18;
  let description = 'хмарно з проясненнями';
  let icon = '02d';
  let humidity = 60;
  let windSpeed = 3.5;
  
  if (cityName === 'Львів') {
    temp = 14;
    description = 'помірний дощ';
    icon = '10d';
    humidity = 85;
    windSpeed = 4.2;
  } else if (cityName === 'Одеса') {
    temp = 24;
    description = 'ясно';
    icon = '01d';
    humidity = 48;
    windSpeed = 5.0;
  } else if (cityName === 'Лондон') {
    temp = 12;
    description = 'невелика мряка';
    icon = '09d';
    humidity = 90;
    windSpeed = 5.8;
  } else if (cityName === 'Харків') {
    temp = 19;
    description = 'невелика хмарність';
    icon = '02d';
    humidity = 55;
    windSpeed = 3.0;
  } else if (cityName === 'Нью-Йорк') {
    temp = 20;
    description = 'мінлива хмарність';
    icon = '03d';
    humidity = 65;
    windSpeed = 4.0;
  }

  // Generate hourly forecast (next 24 hours)
  const hourly = [];
  for (let i = 0; i < 24; i++) {
    // Temperature varies smoothly throughout the day
    const hourOffset = (i + new Date().getHours()) % 24;
    const tempFactor = Math.sin((hourOffset - 6) * Math.PI / 12); // peak at 14:00 (14 - 6 = 8)
    const hourTemp = temp + (tempFactor * 4) + (Math.random() - 0.5);
    
    hourly.push({
      dt: nowUnix + (i * 3600),
      temp: parseFloat(hourTemp.toFixed(1)),
      weather: [{
        id: icon === '01d' ? 800 : (icon === '10d' ? 500 : 802),
        main: icon === '01d' ? 'Clear' : (icon === '10d' ? 'Rain' : 'Clouds'),
        description: description,
        icon: icon,
      }],
      pop: icon === '10d' || icon === '09d' ? 0.8 : (icon === '02d' ? 0.15 : 0.0),
    });
  }

  // Generate daily forecast (next 8 days)
  const daily = [];
  for (let i = 0; i < 8; i++) {
    const dayTemp = temp + (Math.random() - 0.5) * 3;
    const isRainyDay = i % 3 === 2 && cityName !== 'Одеса';
    
    daily.push({
      dt: nowUnix + (i * 86400),
      temp: {
        min: parseFloat((dayTemp - 5).toFixed(1)),
        max: parseFloat((dayTemp + 4).toFixed(1)),
        day: parseFloat(dayTemp.toFixed(1)),
      },
      weather: [{
        id: isRainyDay ? 500 : (icon === '01d' ? 800 : 802),
        main: isRainyDay ? 'Rain' : (icon === '01d' ? 'Clear' : 'Clouds'),
        description: isRainyDay ? 'легкий дощ' : (icon === '01d' ? 'ясно' : 'мінлива хмарність'),
        icon: isRainyDay ? '10d' : (icon === '01d' ? '01d' : '02d'),
      }],
      summary: isRainyDay 
        ? 'Очікується невеликий дощ у другій половині дня, вітер помірний.' 
        : 'Переважно сухо та сонячно, сприятливі умови для прогулянок.',
    });
  }

  return {
    lat,
    lon,
    timezone: 'Europe/Kyiv',
    current: {
      dt: nowUnix,
      temp,
      feels_like: temp - 1 + (Math.random() - 0.5),
      pressure: 1012,
      humidity,
      wind_speed: windSpeed,
      uvi: cityName === 'Одеса' ? 6.8 : (cityName === 'Львів' ? 1.8 : 3.5),
      visibility: 10000,
      sunrise: nowUnix - (6 * 3600), // 6 hours ago
      sunset: nowUnix + (8 * 3600), // 8 hours from now
      weather: [{
        id: icon === '01d' ? 800 : (icon === '10d' ? 500 : 802),
        main: icon === '01d' ? 'Clear' : (icon === '10d' ? 'Rain' : 'Clouds'),
        description,
        icon,
      }],
    },
    hourly,
    daily,
  };
}

/**
 * Searches for a city by name. Falls back to mock list if API key is not active.
 */
export async function searchCity(query: string): Promise<GeocodingResult[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    );
    if (!response.ok) {
      throw new Error('Geocoding response not ok');
    }
    const data = await response.json();
    if (data.length === 0) {
      // Fallback search in mock cities
      return MOCK_CITIES.filter(city => 
        city.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    return data;
  } catch (error) {
    console.log('Using local mock cities for query:', query);
    return MOCK_CITIES.filter(city => 
      city.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

/**
 * Gets weather data. Calls standard free 2.5 APIs (weather and forecast) and maps them to OneCallResponse shape.
 */
export async function getWeatherData(lat: number, lon: number): Promise<OneCallResponse & { isMock?: boolean }> {
  try {
    // 1. Fetch current weather from 2.5 API
    const weatherResponse = await fetch(
      `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ua&appid=${API_KEY}`
    );
    if (!weatherResponse.ok) {
      throw new Error('Current Weather API failed');
    }
    const weatherData = await weatherResponse.json();

    // 2. Fetch 5-day / 3-hour forecast from 2.5 API
    const forecastResponse = await fetch(
      `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ua&appid=${API_KEY}`
    );
    if (!forecastResponse.ok) {
      throw new Error('Forecast API failed');
    }
    const forecastData = await forecastResponse.json();

    // 3. Map to HourlyForecast[] (taking the first 12 items representing the next 36 hours)
    const hourly = forecastData.list.slice(0, 12).map((item: any) => ({
      dt: item.dt,
      temp: item.main.temp,
      weather: item.weather,
      pop: item.pop || 0,
    }));

    // 4. Map to DailyForecast[] (grouping the 40 items by day)
    const dailyMap: { [key: string]: { min: number; max: number; weather: any[]; dt: number } } = {};
    forecastData.list.forEach((item: any) => {
      const dateStr = new Date(item.dt * 1000).toDateString();
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          min: item.main.temp_min,
          max: item.main.temp_max,
          weather: item.weather,
          dt: item.dt,
        };
      } else {
        dailyMap[dateStr].min = Math.min(dailyMap[dateStr].min, item.main.temp_min);
        dailyMap[dateStr].max = Math.max(dailyMap[dateStr].max, item.main.temp_max);
      }
    });

    const daily = Object.values(dailyMap).map((day) => ({
      dt: day.dt,
      temp: {
        min: day.min,
        max: day.max,
        day: (day.min + day.max) / 2,
      },
      weather: day.weather,
    }));

    // 5. Construct full OneCallResponse shape
    return {
      lat,
      lon,
      timezone: forecastData.city?.name || 'Local',
      current: {
        dt: weatherData.dt,
        temp: weatherData.main.temp,
        feels_like: weatherData.main.feels_like,
        pressure: weatherData.main.pressure,
        humidity: weatherData.main.humidity,
        wind_speed: weatherData.wind?.speed || 0,
        weather: weatherData.weather,
        visibility: weatherData.visibility,
        sunrise: weatherData.sys?.sunrise,
        sunset: weatherData.sys?.sunset,
      },
      hourly,
      daily,
      isMock: false,
    };
  } catch (error) {
    console.log('Real weather fetch failed, falling back to local generated mock data:', error);
    return {
      ...generateMockWeatherData(lat, lon),
      isMock: true,
    };
  }
}

export async function getWeatherOverview(
  lat: number,
  lon: number,
  cityName?: string,
  currentWeather?: OneCallResponse
): Promise<WeatherOverviewResponse & { isMock?: boolean }> {
  try {
    const activeCityName = cityName || 'місті';
    const temp = currentWeather
      ? Math.round(currentWeather.current.temp)
      : 18;
    const feelsLike = currentWeather
      ? Math.round(currentWeather.current.feels_like)
      : 18;
    const descriptionText = currentWeather
      ? currentWeather.current.weather[0]?.description || 'мінлива хмарність'
      : 'мінлива хмарність';
    const humidity = currentWeather
      ? currentWeather.current.humidity
      : 60;
    const windSpeed = currentWeather
      ? currentWeather.current.wind_speed
      : 3.5;

    let description = `Сьогодні в місті ${activeCityName} спостерігається ${descriptionText}. Температура повітря становить близько ${temp}°C, що відчувається як ${feelsLike}°C. Рівень вологості становить ${humidity}%, а швидкість вітру — ${windSpeed} м/с.`;

    if (temp < 15) {
      description += ` Рекомендується вдягтися тепліше, оскільки на вулиці досить прохолодно.`;
    } else if (temp > 22) {
      description += ` Чудова погода для прогулянок та легкого літнього одягу.`;
    } else {
      description += ` Погода помірна та комфортна для повсякденних справ на свіжому повітрі.`;
    }

    return {
      lat,
      lon,
      date: new Date().toISOString().split('T')[0],
      units: 'metric',
      weather_overview: description,
      isMock: currentWeather ? currentWeather.isMock : true,
    };
  } catch (error) {
    return {
      lat,
      lon,
      date: new Date().toISOString().split('T')[0],
      units: 'metric',
      weather_overview: 'Не вдалося завантажити підсумок погоди.',
      isMock: true,
    };
  }
}

/**
 * Chat Assistant Simulation responses database
 */
const MOCK_CHAT_ANSWERS = [
  {
    keywords: ['київ', 'києві', 'столиц'],
    answer: 'У Києві сьогодні досить комфортно: температура близько 18°C, мінлива хмарність без істотних опадів. Вітер легкий, до 3.5 м/с. Ідеальна погода для прогулянки містом! Одягнутися можна в джинси та легкий світшот.'
  },
  {
    keywords: ['львів', 'львові', 'галич'],
    answer: 'У Львові сьогодні дощова погода та прохолодно — близько 14°C. Вологість висока, тому відчувається прохолодніше. Обов’язково візьміть парасольку та взуйте непромокаюче взуття!'
  },
  {
    keywords: ['одес', 'одесі', 'морю'],
    answer: 'В Одесі сьогодні справжнє літо! Сонячно, тепло, близько 24°C, вітер освіжаючий з моря до 5 м/с. Чудовий час для прогулянки біля моря, сонцезахисні окуляри будуть дуже доречними.'
  },
  {
    keywords: ['одяг', 'вдягн', 'одягн', 'взут'],
    answer: 'Вибір одягу залежить від вашого міста. Якщо ви у Львові, вдягніть водонепроникну куртку та теплий светр. Якщо в Києві — легкий кардиган або худі поверх футболки. В Одесі цілком комфортно буде в легких джинсах та футболці чи сорочці.'
  },
  {
    keywords: ['парасоль', 'дощ', 'мокр'],
    answer: 'Сьогодні дощ прогнозується у Львові та Лондоні (мряка). У Києві, Одесі та Харкові сухо, тому парасольку брати з собою не потрібно.'
  },
  {
    keywords: ['харків', 'харкові'],
    answer: 'У Харкові сьогодні чудова погода з невеликою хмарністю. Температура близько 19°C, вітер спокійний (3 м/с). Опадів не очікується.'
  }
];

/**
 * Starts a new session with the AI Weather Assistant. Falls back to local smart-replies if API fails.
 */
export async function startChatSession(prompt: string): Promise<ChatSessionResponse> {
  try {
    const response = await fetch(`${BASE_URL}/assistant/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        prompt: `Будь ласка, відповідай українською мовою. ${prompt}`,
      }),
    });

    if (!response.ok) {
      throw new Error('AI Assistant session failed');
    }
    return await response.json();
  } catch (error) {
    console.log('AI Assistant API unavailable. Falling back to local smart chatbot.');
    
    // Find matching answers based on keywords
    const lowerPrompt = prompt.toLowerCase();
    let answer = 'Звісно! Погода сьогодні досить мінлива в різних куточках. Рекомендую перевірити погодинний прогноз на головному екрані. Чи хочете ви дізнатися деталі про конкретне місто, наприклад, Київ, Львів або Одесу?';
    
    for (const item of MOCK_CHAT_ANSWERS) {
      const match = item.keywords.some(keyword => lowerPrompt.includes(keyword));
      if (match) {
        answer = item.answer;
        break;
      }
    }

    return {
      answer,
      data: {},
      session_id: 'mock-session-id-12345',
    };
  }
}

/**
 * Resumes an existing session with the AI Weather Assistant. Falls back to local smart-replies.
 */
export async function resumeChatSession(
  sessionId: string,
  prompt: string
): Promise<ChatSessionResponse> {
  try {
    const response = await fetch(`${BASE_URL}/assistant/session/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        prompt: `Будь ласка, відповідай українською мовою. ${prompt}`,
      }),
    });

    if (!response.ok) {
      throw new Error('AI Assistant resume session failed');
    }
    return await response.json();
  } catch (error) {
    // Generate simulated reply
    const lowerPrompt = prompt.toLowerCase();
    let answer = 'Я зрозумів ваше запитання! Для комфортного планування дня раджу орієнтуватися на поточний ШІ-підсумок погоди. Чи хочете ви спитати ще щось про одяг чи парасольку?';
    
    for (const item of MOCK_CHAT_ANSWERS) {
      const match = item.keywords.some(keyword => lowerPrompt.includes(keyword));
      if (match) {
        answer = item.answer;
        break;
      }
    }

    return {
      answer,
      data: {},
      session_id: sessionId,
    };
  }
}
