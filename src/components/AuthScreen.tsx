import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from 'firebase/auth';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Неправильний формат електронної пошти.';
      case 'auth/user-disabled':
        return 'Цей акаунт було деактивовано.';
      case 'auth/user-not-found':
        return 'Користувача з такою поштою не знайдено.';
      case 'auth/wrong-password':
        return 'Неправильний пароль.';
      case 'auth/email-already-in-use':
        return 'Ця електронна пошта вже використовується іншим акаунтом.';
      case 'auth/weak-password':
        return 'Пароль занадто простий (має бути не менше 6 символів).';
      case 'auth/missing-password':
        return 'Будь ласка, введіть пароль.';
      case 'auth/invalid-credential':
        return 'Неправильна пошта або пароль. Перевірте введені дані.';
      case 'auth/admin-restricted-operation':
        return 'Анонімний вхід не увімкнено у вашому Firebase проекті. Будь ласка, перейдіть в консоль Firebase -> Authentication -> Sign-in method та активуйте провайдер Anonymous.';
      default:
        return 'Сталася помилка при авторизації. Спробуйте ще раз.';
    }
  };

  const handleAuth = async () => {
    setError(null);

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError('Будь ласка, заповніть всі обов\'язкові поля.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Будь ласка, введіть ваше ім\'я.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Set display name
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });
      }
    } catch (err: any) {
      console.log('Auth Error:', err.code, err.message);
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.log('Guest Auth Error:', err.code, err.message);
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0b0f19', '#111827', '#1e1b4b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header App Brand */}
        <View style={styles.headerArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="partly-sunny" size={50} color="#a78bfa" />
          </View>
          <Text style={styles.appName}>Weather AI</Text>
          <Text style={styles.appSubtitle}>Твій розумний прогноз та ШІ-асистент</Text>
        </View>

        {/* Auth Form Card */}
        <View style={styles.formCard}>
          {/* Tabs */}
          <View style={styles.tabHeader}>
            <TouchableOpacity
              style={[styles.tabButton, isLogin && styles.activeTabButton]}
              onPress={() => {
                setIsLogin(true);
                setError(null);
              }}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Вхід</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLogin && styles.activeTabButton]}
              onPress={() => {
                setIsLogin(false);
                setError(null);
              }}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Реєстрація</Text>
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.formContent}>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#f87171" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name Input (Registration Only) */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  placeholder="Ваше ім'я"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                placeholder="Електронна пошта"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                placeholder="Пароль"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleAuth} disabled={loading}>
              <LinearGradient
                colors={['#8b5cf6', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLogin ? 'Увійти' : 'Створити акаунт'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerArea}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>або</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest Action */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestLogin}
              disabled={loading}
            >
              <Text style={styles.guestButtonText}>Увійти як гість</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  appName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  activeTabButton: {
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  formContent: {
    padding: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 13,
    marginHorizontal: 12,
  },
  guestButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  guestButtonText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
  },
});
