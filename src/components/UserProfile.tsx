import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { auth } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function UserProfile() {
  const user = auth.currentUser;

  const handleLogout = () => {
    Alert.alert(
      'Вихід з акаунта',
      'Ви впевнені, що хочете вийти з додатку?',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Вийти', style: 'destructive', onPress: () => auth.signOut() },
      ]
    );
  };

  if (!user) return null;

  const isAnonymous = user.isAnonymous;
  const displayName = user.displayName || (isAnonymous ? 'Гість' : 'Користувач');
  const email = user.email || 'Не вказано (Гостьовий вхід)';
  const creationTime = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('uk-UA')
    : 'Сьогодні';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#8b5cf6', '#4c1d95']}
            style={styles.avatarGradient}
          >
            <Ionicons
              name={isAnonymous ? 'person-circle-outline' : 'shield-checkmark-outline'}
              size={54}
              color="#ffffff"
            />
          </LinearGradient>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={[styles.badge, isAnonymous ? styles.guestBadge : styles.userBadge]}>
          {isAnonymous ? 'Гостьовий сеанс' : 'Зареєстрований користувач'}
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Інформація про профіль</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>Електронна пошта</Text>
          </View>
          <Text style={styles.infoValue} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>Дата реєстрації</Text>
          </View>
          <Text style={styles.infoValue}>{creationTime}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="finger-print-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>User ID</Text>
          </View>
          <Text style={styles.infoValue} numberOfLines={1}>
            {user.uid}
          </Text>
        </View>
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Про додаток</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="code-working-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>Версія додатку</Text>
          </View>
          <Text style={styles.infoValue}>1.0.0 (Expo v55)</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="cloud-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoLabel}>Провайдер погоди</Text>
          </View>
          <Text style={styles.infoValue}>OpenWeather API</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Вийти з акаунта</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  guestBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    color: '#94a3b8',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  userBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#c084fc',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
  infoValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '50%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  actionsContainer: {
    marginTop: 10,
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
