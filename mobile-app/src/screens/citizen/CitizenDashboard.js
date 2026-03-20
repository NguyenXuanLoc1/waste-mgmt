import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyScore } from '../../services/api';
import { Card, COLORS, SectionTitle } from '../../components/UI';

// ── Behavior Score meter — only shown to real (non-guest) users ───────────
function ScoreMeter({ score }) {
  const pct = Math.min(Math.max(score, 0), 200) / 200;
  const color = score >= 120 ? COLORS.primary : score >= 80 ? COLORS.warning : COLORS.danger;
  return (
    <Card style={styles.meterCard}>
      <Text style={styles.meterLabel}>Behavior Score</Text>
      <Text style={[styles.meterScore, { color }]}>{score}</Text>
      <View style={styles.meterBg}>
        <View style={[styles.meterFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.meterSub}>
        {score >= 120 ? '🌟 Excellent' : score >= 80 ? '👍 Good' : '⚠️ Needs improvement'}
      </Text>
    </Card>
  );
}

// ── Guest banner — shown instead of score when in guest mode ─────────────
function GuestBanner({ onLogin }) {
  return (
    <Card style={styles.guestBanner}>
      <Text style={styles.guestBannerIcon}>👤</Text>
      <Text style={styles.guestBannerTitle}>You're browsing as a Guest</Text>
      <Text style={styles.guestBannerSub}>
        Create a free account to track your reports, earn points, and get fee discounts.
      </Text>
      <TouchableOpacity style={styles.guestLoginBtn} onPress={onLogin}>
        <Text style={styles.guestLoginText}>Login / Register →</Text>
      </TouchableOpacity>
    </Card>
  );
}

export default function CitizenDashboard({ navigation }) {
  const { user, isGuest, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    // Guests have no token — skip the API call entirely
    if (isGuest) return;
    try {
      const { data: d } = await getMyScore();
      setData(d);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [isGuest]);

  // When a guest taps "Login / Register →" we log them out (clears guest state)
  // which causes RoleNavigator to flip back to the Auth stack automatically.
  const handleGuestLoginPress = () => logout();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {isGuest ? 'Guest' : user?.name?.split(' ')[0]} 👋
          </Text>
          <Text style={styles.role}>
            {isGuest ? '👤 Guest Account' : 'Citizen Account'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{isGuest ? 'Exit' : 'Logout'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Behavior score (real users) OR guest banner ── */}
      {isGuest ? (
        <GuestBanner onLogin={handleGuestLoginPress} />
      ) : (
        data && <ScoreMeter score={data.behaviorScore} />
      )}

      {/* ── Fee card — hidden for guests (no data) ── */}
      {!isGuest && (
        <Card style={styles.feeCard}>
          <Text style={styles.feeLabel}>Total Collection Fee</Text>
          <Text style={styles.feeAmount}>
            ${data?.totalFee?.toFixed(2) || '0.00'}
          </Text>
        </Card>
      )}

      {/* ── Stats row — hidden for guests ── */}
      {!isGuest && data && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total',    count: data.reportCounts?.total,     color: COLORS.info },
            { label: 'Pending',  count: data.reportCounts?.pending,   color: COLORS.warning },
            { label: 'Done',     count: data.reportCounts?.completed, color: COLORS.primary },
            { label: 'Rejected', count: data.reportCounts?.rejected,  color: COLORS.danger },
          ].map((s) => (
            <Card key={s.label} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* ── Quick Actions ── */}
      <SectionTitle>Quick Actions</SectionTitle>

      {/* Row 1 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('SubmitReport')}
        >
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>Submit Report</Text>
          {isGuest && <Text style={styles.guestActionNote}>Guest report</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.info }]}
          onPress={() => {
            if (isGuest) {
              Alert.alert(
                'Login Required',
                'You need an account to view your report history.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Login / Register', onPress: () => logout() },
                ]
              );
              return;
            }
            navigation.navigate('MyReports');
          }}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>My Reports</Text>
          {isGuest && <Text style={styles.guestActionNote}>Login required</Text>}
        </TouchableOpacity>
      </View>

      {/* Row 2 — info screens available to everyone including guests */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#8b5cf6' }]}
          onPress={() => navigation.navigate('WasteSortingGuide')}
        >
          <Text style={styles.actionIcon}>♻️</Text>
          <Text style={styles.actionText}>Waste Sorting Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#f97316' }]}
          onPress={() => navigation.navigate('Regulations')}
        >
          <Text style={styles.actionIcon}>📢</Text>
          <Text style={styles.actionText}>Regulations & Announcements</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  role: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  logoutBtn: { padding: 8 },
  logoutText: { color: COLORS.danger, fontWeight: '600' },

  // ── Score meter ──
  meterCard: { alignItems: 'center', padding: 24 },
  meterLabel: { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  meterScore: { fontSize: 56, fontWeight: '900' },
  meterBg: { width: '100%', height: 10, backgroundColor: COLORS.border, borderRadius: 10, marginTop: 12 },
  meterFill: { height: 10, borderRadius: 10 },
  meterSub: { marginTop: 8, fontSize: 14, color: COLORS.gray },

  // ── Guest banner ──
  guestBanner: {
    alignItems: 'center', padding: 24,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  guestBannerIcon: { fontSize: 40, marginBottom: 10 },
  guestBannerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  guestBannerSub: {
    fontSize: 13, color: COLORS.gray, textAlign: 'center',
    lineHeight: 19, marginBottom: 16,
  },
  guestLoginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20,
  },
  guestLoginText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Fee card ──
  feeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 15, color: COLORS.gray },
  feeAmount: { fontSize: 24, fontWeight: '800', color: COLORS.dark },

  // ── Stats row ──
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, alignItems: 'center', padding: 12 },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  // ── Action cards ──
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionCard: {
    flex: 1, borderRadius: 12, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  actionIcon: { fontSize: 32 },
  actionText: { color: '#fff', fontWeight: '700', marginTop: 8, fontSize: 14, textAlign: 'center' },
  guestActionNote: {
    color: 'rgba(255,255,255,0.7)', fontSize: 10,
    marginTop: 4, fontStyle: 'italic',
  },
});
