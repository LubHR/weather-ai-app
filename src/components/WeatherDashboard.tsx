import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchCity, getWeatherData, getWeatherOverview } from '../services/weatherService';
import { GeocodingResult, OneCallResponse, WeatherOverviewResponse } from '../types/weather';
import { auth } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to map OpenWeather icon code to Ionicons name
export function getWeatherIconName(iconCode: string): keyof typeof Ionicons.glyphMap {
  switch (iconCode) {
    case '01d': return 'sunny';
    case '01n': return 'moon';
    case '02d': return 'partly-sunny';
    case '02n': return 'cloudy-night';
    case '03d':
    case '03n':
    case '04d':
    case '04n': return 'cloudy';
    case '09d':
    case '09n':
    case '10d':
    case '10n': return 'rainy';
    case '11d':
    case '11n': return 'thunderstorm';
    case '13d':
    case '13n': return 'snow';
    case '50d':
    case '50n': return 'menu-sharp'; // mist/fog
    default: return 'sunny';
  }
}

// Helper to map OpenWeather icon code to color
export function getWeatherIconColor(iconCode: string): string {
  switch (iconCode) {
    case '01d': return '#fbbf24'; // amber-400
    case '01n': return '#e2e8f0'; // slate-200
    case '02d': return '#fbbf24';
    case '02n': return '#94a3b8';
    case '03d':
    case '03n':
    case '04d':
    case '04n': return '#cbd5e1'; // slate-300
    case '09d':
    case '09n':
    case '10d':
    case '10n': return '#60a5fa'; // blue-400
    case '11d':
    case '11n': return '#a78bfa'; // violet-400
    case '13d':
    case '13n': return '#93c5fd'; // light-blue-300
    default: return '#fbbf24';
  }
}

function WeatherLoader() {
  const sunAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sunAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sunAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [sunAnim]);

  const sunTranslateY = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -12],
  });

  const sunScale = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.1],
  });

  const sunRotate = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.loaderContainer}>
      <View style={styles.animationBox}>
        {/* Animated Sun */}
        <Animated.View
          style={[
            styles.animatedSun,
            {
              transform: [
                { translateY: sunTranslateY },
                { scale: sunScale },
                { rotate: sunRotate },
              ],
            },
          ]}
        >
          <Ionicons name="sunny" size={54} color="#fbbf24" />
        </Animated.View>

        {/* Cloud on top */}
        <View style={styles.staticCloud}>
          <Ionicons name="cloud" size={70} color="#94a3b8" />
        </View>
      </View>
      <Text style={styles.loaderText}>Оновлення погоди...</Text>
    </View>
  );
}

const DEFAULT_QUICK_CITIES: GeocodingResult[] = [
  { name: 'Київ', lat: 50.4501, lon: 30.5234, country: 'UA', state: 'м. Київ' },
  { name: 'Львів', lat: 49.8397, lon: 24.0297, country: 'UA', state: 'Львівська область' },
  { name: 'Одеса', lat: 46.4825, lon: 30.7233, country: 'UA', state: 'Одеська область' },
  { name: 'Харків', lat: 50.0015, lon: 36.2304, country: 'UA', state: 'Харківська область' },
  { name: 'Дніпро', lat: 48.4647, lon: 35.0462, country: 'UA', state: 'Дніпропетровська область' },
];

export default function WeatherDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<GeocodingResult>({
    name: 'Київ',
    lat: 50.4501,
    lon: 30.5234,
    country: 'UA',
    state: 'м. Київ',
  });
  const [weatherData, setWeatherData] = useState<OneCallResponse | null>(null);
  const [overviewData, setOverviewData] = useState<WeatherOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickCities, setQuickCities] = useState<GeocodingResult[]>([]);

  // Load quick cities on mount
  useEffect(() => {
    const loadQuickCities = async () => {
      try {
        const saved = await AsyncStorage.getItem('quick_cities');
        if (saved) {
          setQuickCities(JSON.parse(saved));
        } else {
          setQuickCities(DEFAULT_QUICK_CITIES);
        }
      } catch (e) {
        setQuickCities(DEFAULT_QUICK_CITIES);
      }
    };
    loadQuickCities();
  }, []);

  const isCityFavorite = (city: GeocodingResult) => {
    return quickCities.some(
      (c) => c.name.toLowerCase() === city.name.toLowerCase() &&
             Math.abs(c.lat - city.lat) < 0.01 &&
             Math.abs(c.lon - city.lon) < 0.01
    );
  };

  const toggleFavoriteCity = async (city: GeocodingResult) => {
    let updated: GeocodingResult[];
    if (isCityFavorite(city)) {
      updated = quickCities.filter(
        (c) => !(c.name.toLowerCase() === city.name.toLowerCase() &&
                 Math.abs(c.lat - city.lat) < 0.01 &&
                 Math.abs(c.lon - city.lon) < 0.01)
      );
    } else {
      updated = [...quickCities, city];
    }
    setQuickCities(updated);
    try {
      await AsyncStorage.setItem('quick_cities', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save quick cities', e);
    }
  };

  // Load weather for selected city
  const fetchWeatherForCity = async (city: GeocodingResult) => {
    setLoading(true);
    setError(null);
    try {
      const weather = await getWeatherData(city.lat, city.lon);
      const overview = await getWeatherOverview(city.lat, city.lon, city.name, weather);
      setWeatherData(weather);
      setOverviewData(overview);
      // Save current city and weather context for AI assistant
      await AsyncStorage.setItem('current_weather_context', JSON.stringify({
        cityName: city.name,
        temp: weather.current.temp,
        description: weather.current.weather[0]?.description || 'ясно',
        humidity: weather.current.humidity,
        windSpeed: weather.current.wind_speed,
      }));
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити дані погоди. Будь ласка, перевірте з\'єднання.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCity(selectedCity);
  }, [selectedCity]);

  // Handle city search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchCity(text);
      setSearchResults(results);
    } catch (err) {
      // Ignore geocoding errors to avoid flashing alerts to the user
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectCity = (city: GeocodingResult) => {
    setSelectedCity(city);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  // Format date nicely
  const getFormattedDate = () => {
    return new Date().toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dt?: number) => {
    if (!dt) return '--:--';
    return new Date(dt * 1000).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUvLevel = (uv?: number) => {
    if (uv === undefined) return 'Немає даних';
    if (uv < 3) return 'Низький';
    if (uv < 6) return 'Помірний';
    if (uv < 8) return 'Високий';
    if (uv < 11) return 'Дуже високий';
    return 'Екстремальний';
  };

  const formatVisibility = (visibility?: number) => {
    if (visibility === undefined) return '--';
    const km = visibility / 1000;
    return `${km.toFixed(0)} км`;
  };

  const formatPressure = (pressure?: number) => {
    if (pressure === undefined) return '--';
    const mmHg = Math.round(pressure * 0.75006);
    return `${mmHg} мм`;
  };

  const formatHour = (dt: number) => {
    return new Date(dt * 1000).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDay = (dt: number) => {
    return new Date(dt * 1000).toLocaleDateString('uk-UA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            placeholder="Пошук міста (наприклад: Львів)..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Cities Selection */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickCitiesContainer}
          contentContainerStyle={styles.quickCitiesContent}
        >
          {quickCities.map((city) => (
            <TouchableOpacity
              key={`${city.name}-${city.lat}-${city.lon}`}
              style={[
                styles.quickCityButton,
                selectedCity.name === city.name && styles.quickCityButtonActive,
              ]}
              onPress={() => selectCity(city)}
            >
              <Text
                style={[
                  styles.quickCityText,
                  selectedCity.name === city.name && styles.quickCityTextActive,
                ]}
              >
                {city.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            {searchResults.map((city, index) => (
              <TouchableOpacity
                key={`${city.lat}-${city.lon}-${index}`}
                style={[
                  styles.resultItem,
                  index < searchResults.length - 1 && styles.resultItemBorder,
                ]}
                onPress={() => selectCity(city)}
              >
                <Ionicons name="location-outline" size={18} color="#8b5cf6" style={styles.locationIcon} />
                <Text style={styles.resultText}>
                  {city.name}
                  {city.state ? `, ${city.state}` : ''} ({city.country})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Loading State */}
      {loading && !weatherData && (
        <WeatherLoader />
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={32} color="#f87171" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchWeatherForCity(selectedCity)}
          >
            <Text style={styles.retryButtonText}>Спробувати знову</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weather Dashboard Content */}
      {weatherData && (
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.cityName}>
                {selectedCity.name}
                <Text style={styles.countryCode}> {selectedCity.country}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => toggleFavoriteCity(selectedCity)}
                style={styles.favoriteButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isCityFavorite(selectedCity) ? 'star' : 'star-outline'}
                  size={24}
                  color={isCityFavorite(selectedCity) ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)'}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
            {weatherData.isMock && (
              <View style={styles.demoBanner}>
                <Ionicons name="information-circle-outline" size={14} color="#fbbf24" />
                <Text style={styles.demoBannerText}>
                  Демо-режим: ключ не активований або потребує One Call 3.0
                </Text>
              </View>
            )}
          </View>

          {/* Current Weather Card */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)']}
            style={styles.currentCard}
          >
            <View style={styles.currentMain}>
              <View>
                <Text style={styles.tempText}>{Math.round(weatherData.current.temp)}°C</Text>
                <Text style={styles.descText}>
                  {weatherData.current.weather[0]?.description}
                </Text>
              </View>
              <Ionicons
                name={getWeatherIconName(weatherData.current.weather[0]?.icon)}
                size={80}
                color={getWeatherIconColor(weatherData.current.weather[0]?.icon)}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="thermometer-outline" size={20} color="#38bdf8" />
                <Text style={styles.detailLabel}>Відчувається</Text>
                <Text style={styles.detailValue}>
                  {Math.round(weatherData.current.feels_like)}°C
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={20} color="#60a5fa" />
                <Text style={styles.detailLabel}>Вологість</Text>
                <Text style={styles.detailValue}>{weatherData.current.humidity}%</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={20} color="#34d399" />
                <Text style={styles.detailLabel}>Вітер</Text>
                <Text style={styles.detailValue}>{weatherData.current.wind_speed} м/с</Text>
              </View>
            </View>
          </LinearGradient>

          {/* AI Overview Card */}
          {overviewData?.weather_overview && (
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.25)', 'rgba(30, 41, 59, 0.2)']}
              style={styles.aiCard}
            >
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={20} color="#c084fc" />
                <Text style={styles.aiTitle}>ШІ-Підсумок погоди</Text>
              </View>
              <Text style={styles.aiBody}>{overviewData.weather_overview}</Text>
            </LinearGradient>
          )}

          {/* Extra Details Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              {/* UV Index */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.gridCard}
              >
                <View style={styles.gridCardHeader}>
                  <Ionicons name="sunny-outline" size={18} color="#fbbf24" />
                  <Text style={styles.gridCardLabel}>УФ-Індекс</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  {weatherData.current.uvi !== undefined ? weatherData.current.uvi.toFixed(1) : '--'}
                </Text>
                <Text style={styles.gridCardSub}>
                  {getUvLevel(weatherData.current.uvi)}
                </Text>
              </LinearGradient>

              {/* Sunrise/Sunset */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.gridCard}
              >
                <View style={styles.gridCardHeader}>
                  <Ionicons name="sunny" size={18} color="#f472b6" />
                  <Text style={styles.gridCardLabel}>Схід / Захід</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  {formatTime(weatherData.current.sunrise)}
                </Text>
                <Text style={styles.gridCardSub}>
                  Захід: {formatTime(weatherData.current.sunset)}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.gridRow}>
              {/* Pressure */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.gridCard}
              >
                <View style={styles.gridCardHeader}>
                  <Ionicons name="git-commit-outline" size={18} color="#34d399" />
                  <Text style={styles.gridCardLabel}>Тиск</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  {formatPressure(weatherData.current.pressure)}
                </Text>
                <Text style={styles.gridCardSub}>
                  {weatherData.current.pressure} гПа
                </Text>
              </LinearGradient>

              {/* Visibility */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.gridCard}
              >
                <View style={styles.gridCardHeader}>
                  <Ionicons name="eye-outline" size={18} color="#60a5fa" />
                  <Text style={styles.gridCardLabel}>Видимість</Text>
                </View>
                <Text style={styles.gridCardValue}>
                  {formatVisibility(weatherData.current.visibility)}
                </Text>
                <Text style={styles.gridCardSub}>
                  Хороша видимість
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Hourly Forecast */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Погодинний прогноз</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
              {weatherData.hourly.slice(0, 24).map((hour, index) => (
                <View key={hour.dt} style={styles.hourCard}>
                  <Text style={styles.hourTime}>{index === 0 ? 'Зараз' : formatHour(hour.dt)}</Text>
                  <Ionicons
                    name={getWeatherIconName(hour.weather[0]?.icon)}
                    size={28}
                    color={getWeatherIconColor(hour.weather[0]?.icon)}
                    style={styles.hourIcon}
                  />
                  <Text style={styles.hourTemp}>{Math.round(hour.temp)}°C</Text>
                  {hour.pop > 0 && (
                    <Text style={styles.hourPop}>
                      {(hour.pop * 100).toFixed(0)}%
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* 7-Day Forecast */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Прогноз на 7 днів</Text>
            <View style={styles.dailyContainer}>
              {weatherData.daily.slice(1, 8).map((day) => (
                <View key={day.dt} style={styles.dailyRow}>
                  <Text style={styles.dailyDay}>{formatDay(day.dt)}</Text>
                  <View style={styles.dailyDescContainer}>
                    <Ionicons
                      name={getWeatherIconName(day.weather[0]?.icon)}
                      size={24}
                      color={getWeatherIconColor(day.weather[0]?.icon)}
                    />
                    <Text style={styles.dailyDesc} numberOfLines={1}>
                      {day.weather[0]?.description}
                    </Text>
                  </View>
                  <Text style={styles.dailyTempRange}>
                    <Text style={styles.maxTemp}>{Math.round(day.temp.max)}°</Text>{' '}
                    <Text style={styles.minTemp}>{Math.round(day.temp.min)}°</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Extra space at the bottom for scrolling */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  locationIcon: {
    marginRight: 10,
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 15,
  },
  loaderContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationBox: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  animatedSun: {
    position: 'absolute',
    top: 10,
    zIndex: 1,
  },
  staticCloud: {
    position: 'absolute',
    bottom: 10,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  loaderText: {
    color: '#94a3b8',
    marginTop: 18,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorCard: {
    margin: 16,
    padding: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginVertical: 16,
  },
  cityName: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countryCode: {
    fontSize: 20,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  demoBannerText: {
    color: '#fbbf24',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  currentCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
  },
  currentMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tempText: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
  },
  descText: {
    color: '#e2e8f0',
    fontSize: 16,
    textTransform: 'capitalize',
    fontWeight: '500',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  aiCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    marginBottom: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTitle: {
    color: '#c084fc',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  aiBody: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
  },
  hourlyScroll: {
    flexDirection: 'row',
  },
  hourCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 70,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  hourTime: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  hourIcon: {
    marginVertical: 4,
  },
  hourTemp: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hourPop: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  dailyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dailyDay: {
    color: '#94a3b8',
    fontSize: 14,
    width: 90,
    textTransform: 'capitalize',
  },
  dailyDescContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  dailyDesc: {
    color: '#e2e8f0',
    fontSize: 14,
    marginLeft: 10,
    textTransform: 'capitalize',
    maxWidth: 130,
  },
  dailyTempRange: {
    textAlign: 'right',
  },
  maxTemp: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  minTemp: {
    color: '#64748b',
    fontSize: 15,
  },
  quickCitiesContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  quickCitiesContent: {
    paddingRight: 10,
  },
  quickCityButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickCityButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#a78bfa',
  },
  quickCityText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  quickCityTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  gridContainer: {
    marginBottom: 24,
    marginHorizontal: -6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 6,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridCardLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  gridCardValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridCardSub: {
    color: '#64748b',
    fontSize: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
