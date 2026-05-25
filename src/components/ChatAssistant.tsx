import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchCity, getWeatherData } from '../services/weatherService';
import { ChatMessage } from '../types/weather';
import { getGeminiChatResponse, WeatherContext } from '../services/geminiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatAssistant() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Привіт! Я твій розумний погодний асистент.\n\nЗапитай мене будь-що про погоду в конкретному місті або порадься щодо планів чи одягу. Наприклад: "Яка погода у Києві і чи потрібна парасолька?"',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [weatherContext, setWeatherContext] = useState<WeatherContext | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load weather context from storage
  useEffect(() => {
    const loadContext = async () => {
      try {
        const saved = await AsyncStorage.getItem('current_weather_context');
        if (saved) {
          setWeatherContext(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load weather context in ChatAssistant', e);
      }
    };
    loadContext();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessageText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    console.log('\n--- 💬 НОВЕ ПОВІДОМЛЕННЯ ВІД КОРИСТУВАЧА ---');
    console.log(`Текст: "${userMessageText}"`);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      console.log('🤖 Крок 1: Надсилаємо запит до Gemini...');
      let responseText = await getGeminiChatResponse(updatedMessages, weatherContext);
      console.log(`🤖 Відповідь від Gemini: "${responseText}"`);

      // 2. Check if the response contains a weather fetching action
      if (responseText.includes('fetch_weather')) {
        console.log('🔍 Виявлено запит на отримання погоди для іншого міста!');
        try {
          const actionObj = JSON.parse(responseText);
          if (actionObj.action === 'fetch_weather' && actionObj.city) {
            const targetCity = actionObj.city;
            console.log(`👉 Місто для пошуку: "${targetCity}"`);

            // Update UI to let user know we are fetching weather details
            const fetchingStatusMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: `Шукаю актуальну погоду для міста ${targetCity}...`,
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, fetchingStatusMessage]);

            console.log(`📡 Крок 2: Запускаємо геокодування для міста "${targetCity}"...`);
            const searchResults = await searchCity(targetCity);
            if (searchResults.length > 0) {
              const matchedCity = searchResults[0];
              console.log(`📍 Знайдено місто: ${matchedCity.name}, ${matchedCity.country} (lat: ${matchedCity.lat}, lon: ${matchedCity.lon})`);
              
              console.log('🌤️ Крок 3: Завантажуємо погоду для знайдених координат...');
              const weather = await getWeatherData(matchedCity.lat, matchedCity.lon);
              console.log(`✅ Погода завантажена: ${weather.current.weather[0]?.description || 'ясно'}, температура ${Math.round(weather.current.temp)}°C`);

              // Build weather system message
              const weatherSystemInfo = `[Системна довідка: Погода у місті ${matchedCity.name} (${matchedCity.country}) зараз: ${weather.current.weather[0]?.description || 'ясно'}, температура ${Math.round(weather.current.temp)}°C, вологість ${weather.current.humidity}%, вітер ${weather.current.wind_speed} м/с. Дай відповідь користувачу на основі цих даних.]`;

              const assistantInfoMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                text: weatherSystemInfo,
                sender: 'user', // We send it as 'user' role so Gemini interprets it as part of the context
                timestamp: new Date(),
              };

              console.log('🔄 Крок 4: Надсилаємо отримані дані погоди назад у Gemini для фінального аналізу...');
              const finalResponseText = await getGeminiChatResponse(
                [...updatedMessages, assistantInfoMessage],
                weatherContext
              );
              console.log(`✨ Фінальна відповідь Gemini: "${finalResponseText}"`);

              // Replace status message with the final response
              setMessages((prev) => {
                const cleaned = prev.filter((m) => m.id !== fetchingStatusMessage.id);
                return [
                  ...cleaned,
                  {
                    id: (Date.now() + 3).toString(),
                    text: finalResponseText,
                    sender: 'ai',
                    timestamp: new Date(),
                  },
                ];
              });
            } else {
              console.log(`❌ Місто "${targetCity}" не знайдено в базі даних OpenWeather!`);
              const cityNotFoundPrompt: ChatMessage = {
                id: (Date.now() + 2).toString(),
                text: `[Системна довідка: Місто "${targetCity}" не знайдено в базі OpenWeather. Повідом про це користувача.]`,
                sender: 'user',
                timestamp: new Date(),
              };

              console.log('🔄 Надсилаємо повідомлення про відсутність міста у Gemini...');
              const finalResponseText = await getGeminiChatResponse(
                [...updatedMessages, cityNotFoundPrompt],
                weatherContext
              );
              console.log(`✨ Фінальна відповідь Gemini (місто не знайдено): "${finalResponseText}"`);

              setMessages((prev) => {
                const cleaned = prev.filter((m) => m.id !== fetchingStatusMessage.id);
                return [
                  ...cleaned,
                  {
                    id: (Date.now() + 3).toString(),
                    text: finalResponseText,
                    sender: 'ai',
                    timestamp: new Date(),
                  },
                ];
              });
            }
            return;
          }
        } catch (jsonErr) {
          console.error('⚠️ Помилка обробки JSON дії або запиту:', jsonErr);
        }
      }

      // Add direct AI reply
      console.log('✨ Додаємо пряму відповідь від Gemini в інтерфейс.');
      const aiMessage: ChatMessage = {
        id: (Date.now() + 4).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 5).toString(),
        text: 'Вибач, сталася помилка з\'єднання. Будь ласка, перевір інтернет або спробуй ще раз.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Діалог оновлено! Я готовий до нових запитань про погоду.',
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color="#c084fc" />
          </View>
        )}
        {isUser ? (
          <LinearGradient
            colors={['#8b5cf6', '#6d28d9']}
            style={[styles.bubble, styles.userBubble]}
          >
            <Text style={styles.userMessageText}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.aiMessageText}>{item.text}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 + insets.bottom : 0}
      style={styles.container}
    >
      {/* Header with Clear Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
          </View>
          <Text style={styles.title}>ШІ-Помічник</Text>
        </View>
        {messages.length > 1 && (
          <TouchableOpacity onPress={handleClearSession} style={styles.clearButton}>
            <Ionicons name="refresh-outline" size={16} color="#c084fc" />
            <Text style={styles.clearButtonText}>Новий діалог</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color="#c084fc" />
          </View>
          <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
            <ActivityIndicator size="small" color="#c084fc" />
            <Text style={styles.loadingText}>ШІ думає...</Text>
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Спробуй: Яка погода в Одесі завтра?"
          placeholderTextColor="#64748b"
          value={inputText}
          onChangeText={setInputText}
          style={styles.input}
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={true}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !inputText.trim()}
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(11, 15, 25, 0.5)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseContainer: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  clearButtonText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  bubble: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  aiMessageText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#c084fc',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#f8fafc',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
});
