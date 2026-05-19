import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from '../types/weather';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Initialize the Google Gen AI client if key is present
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface WeatherContext {
  cityName: string;
  temp: number;
  description: string;
  humidity: number;
  windSpeed: number;
}

/**
 * Gets a chat response from Gemini API, or returns instructions if the key is missing.
 */
export async function getGeminiChatResponse(
  messages: ChatMessage[],
  weatherContext?: WeatherContext
): Promise<string> {
  if (!API_KEY || !genAI) {
    return 'Привіт! Я твій розумний погодний асистент. 🤖\n\nЩоб активувати мене на базі Google Gemini, будь ласка, додай свій ключ у файл `.env`:\n`EXPO_PUBLIC_GEMINI_API_KEY=твій_ключ_з_ai_studio`\n\nПісля цього перезапусти додаток, і ми зможемо спілкуватися в реальному часі!';
  }

  try {
    const currentCityInfo = weatherContext
      ? `Поточне вибране місто користувача: ${weatherContext.cityName}. Погода там: ${weatherContext.description}, температура ${Math.round(weatherContext.temp)}°C, вологість ${weatherContext.humidity}%, вітер ${weatherContext.windSpeed} м/с.`
      : 'Дані про погоду для поточного міста наразі не завантажені.';

    const systemInstruction = `Ви — розумний погодний асистент для мобільного додатку погоди. 
Користувач може запитувати вас про поточну погоду, прогнози, або просити поради щодо одягу, подорожей чи активностей на основі погоди.
Спілкуйтеся виключно красивою українською мовою, використовуйте доречні емодзі.

ПРАВИЛО ОТРИМАННЯ ПОГОДИ ДЛЯ ІНШИХ МІСТ:
Якщо користувач запитує про погоду в конкретному місті (наприклад: "яка погода у Львові?", "чи йде дощ в Одесі?"), і ви НЕ бачите актуальних даних для цього міста в останніх повідомленнях чату, ви ПОВИННІ відповісти строго у такому форматі JSON:
{"action": "fetch_weather", "city": "НАЗВА_МІСТА"}
Наприклад: {"action": "fetch_weather", "city": "Львів"}
Не пишіть нічого іншого, жодного вступного слова чи додаткового тексту, якщо видаєте цей JSON.

Якщо в історії чату вже є системне або користувацьке повідомлення з реальними даними про погоду для запитуваного міста, використовуйте ці дані для відповіді. Не вигадуйте температуру чи умови самостійно, беріть їх виключно з наданого контексту.

${currentCityInfo}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
      },
    });

    // Map our messages format to Gemini format
    const formattedHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Gemini API requires the first message in the chat history to be from the 'user'
    const firstUserIndex = formattedHistory.findIndex(msg => msg.role === 'user');
    const validHistory = firstUserIndex !== -1 ? formattedHistory.slice(firstUserIndex) : [];

    // Split history into past history and the latest message
    const chatHistory = validHistory.slice(0, -1);
    const latestMessage = validHistory[validHistory.length - 1]?.parts[0]?.text || '';

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(latestMessage);
    const responseText = result.response.text();
    return responseText.trim();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return 'Упс! Сталася помилка при з\'єднанні з ШІ-сервісом Google. Будь ласка, спробуйте пізніше або перевірте ваш API-ключ.';
  }
}
