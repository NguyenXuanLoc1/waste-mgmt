import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyScore } from '../../services/api';
import { Card, COLORS, SectionTitle } from '../../components/UI';

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

export default function CitizenDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data: d } = await getMyScore();
      setData(d);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.role}>Citizen Account</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {data && <ScoreMeter score={data.behaviorScore} />}

      {/* Fee Card */}
      <Card style={styles.feeCard}>
        <Text style={styles.feeLabel}>Total Collection Fee</Text>
        <Text style={styles.feeAmount}>
          ${data?.totalFee?.toFixed(2) || '0.00'}
        </Text>
      </Card>

      {/* Stats Row */}
      {data && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total', count: data.reportCounts?.total, color: COLORS.info },
            { label: 'Pending', count: data.reportCounts?.pending, color: COLORS.warning },
            { label: 'Done', count: data.reportCounts?.completed, color: COLORS.primary },
            { label: 'Rejected', count: data.reportCounts?.rejected, color: COLORS.danger },
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

      {/* Row 1 — existing buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('SubmitReport')}
        >
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>Submit Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.info }]}
          onPress={() => navigation.navigate('MyReports')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>My Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2 — BỊ XÓA NHẦM, GIỜ ĐÃ KHÔI PHỤC */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#8b5cf6' }]} // Màu tím siêu đẹp
          onPress={() => navigation.navigate('WasteSortingGuide')}
        >
          <Text style={styles.actionIcon}>♻️</Text>
          <Text style={styles.actionText}>Waste Sorting Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#f97316' }]} // Màu cam nổi bật
          onPress={() => navigation.navigate('Regulations')}
        >
          <Text style={styles.actionIcon}>📢</Text>
          <Text style={styles.actionText}>Regulations</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  role: { fontSize: 13, color: COLORS.gray },
  logoutBtn: { padding: 8 },
  logoutText: { color: COLORS.danger, fontWeight: '600' },
  meterCard: { alignItems: 'center', padding: 24 },
  meterLabel: { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  meterScore: { fontSize: 56, fontWeight: '900' },
  meterBg: { width: '100%', height: 10, backgroundColor: COLORS.border, borderRadius: 10, marginTop: 12 },
  meterFill: { height: 10, borderRadius: 10 },
  meterSub: { marginTop: 8, fontSize: 14, color: COLORS.gray },
  feeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 15, color: COLORS.gray },
  feeAmount: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, alignItems: 'center', padding: 12 },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionCard: {
    flex: 1, borderRadius: 12, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  actionIcon: { fontSize: 32 },
  actionText: { color: '#fff', fontWeight: '700', marginTop: 8, fontSize: 14, textAlign: 'center' },
});