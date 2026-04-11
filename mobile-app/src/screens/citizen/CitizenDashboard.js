import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyScore, getMyFee } from '../../services/api';
import { Card, COLORS, SectionTitle } from '../../components/UI';

// ── Behavior Score meter ──
function ScoreMeter({ score }) {
  const pct = Math.min(Math.max(score, 0), 200) / 200;
  const color = score >= 120 ? '#22c55e' : score >= 80 ? '#f59e0b' : '#ef4444';
  const label = score >= 120 ? 'Excellent' : score >= 80 ? 'Good' : 'Needs improvement';
  const emoji = score >= 120 ? '🌟' : score >= 80 ? '👍' : '⚠️';

  return (
    <View>
      <Text style={{ fontSize: 32, textAlign: 'center', color }}>{score} pts</Text>
      <Text style={{ textAlign: 'center', color }}>{emoji} {label}</Text>
    </View>
  );
}

// ── Guest banner ──
function GuestBanner({ onLogin }) {
  return (
    <Card style={{ alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 30 }}>👤</Text>
      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Browsing as Guest</Text>
      <Text style={{ textAlign: 'center', marginVertical: 10 }}>
        Create account to track reports & earn points
      </Text>
      <TouchableOpacity onPress={onLogin}>
        <Text style={{ color: COLORS.primary }}>Login / Register →</Text>
      </TouchableOpacity>
    </Card>
  );
}

export default function CitizenDashboard({ navigation }) {
  const { user, isGuest, logout } = useAuth();
  const [data, setData] = useState(null);
  const [fee, setFee] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (isGuest) return;
    try {
      const [scoreRes, feeRes] = await Promise.all([
        getMyScore(),
        getMyFee(),
      ]);
      setData(scoreRes.data);
      setFee(feeRes.data?.fee ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [isGuest]);

  const handleGuestLoginPress = () => logout();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {isGuest ? 'Guest' : user?.name?.split(' ')[0]} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>{isGuest ? 'Exit' : 'Logout'}</Text>
        </TouchableOpacity>
      </View>

      {/* Score or Guest */}
      {isGuest ? (
        <GuestBanner onLogin={handleGuestLoginPress} />
      ) : (
        data && <ScoreMeter score={data.behaviorScore} />
      )}

      {/* Fee */}
      {!isGuest && (
        <Card style={styles.card}>
          <Text>Total Fee</Text>
          <Text>${fee?.toFixed(2) || '0.00'}</Text>
        </Card>
      )}

      {/* Actions */}
      <SectionTitle>Quick Actions</SectionTitle>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('SubmitReport')}
        >
          <Text>📸 Submit Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.info }]}
          onPress={() => {
            if (isGuest) {
              Alert.alert('Login required');
              return;
            }
            navigation.navigate('MyReports');
          }}
        >
          <Text>📋 My Reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  greeting: { fontSize: 20, fontWeight: 'bold' },
  logoutText: { color: 'red' },
  card: { padding: 16, marginVertical: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, padding: 20, alignItems: 'center' },
});