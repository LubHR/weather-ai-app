import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import WeatherDashboard from './src/components/WeatherDashboard';
import ChatAssistant from './src/components/ChatAssistant';
import AuthScreen from './src/components/AuthScreen';
import UserProfile from './src/components/UserProfile';
import { auth } from './src/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'profile'>('dashboard');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0b0f19', '#111827', '#1e1b4b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ExpoStatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0b0f19', '#111827', '#1e1b4b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && <WeatherDashboard />}
        {activeTab === 'chat' && <ChatAssistant />}
        {activeTab === 'profile' && <UserProfile />}
      </View>

      {/* Custom Tab Bar */}
      <View style={[styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name={activeTab === 'dashboard' ? 'rainy' : 'rainy-outline'}
            size={22}
            color={activeTab === 'dashboard' ? '#a78bfa' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeTabLabel]}>
            Прогноз
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.activeTabItem]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons
            name={activeTab === 'chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
            size={22}
            color={activeTab === 'chat' ? '#a78bfa' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.activeTabLabel]}>
            ШІ-Чат
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.activeTabItem]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'profile' ? '#a78bfa' : '#94a3b8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeTabLabel]}>
            Профіль
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    opacity: 0.75,
  },
  activeTabItem: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
  },
});