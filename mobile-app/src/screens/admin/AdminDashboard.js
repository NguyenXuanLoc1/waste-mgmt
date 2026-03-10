import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { getDashboardStats } from '../../services/api';
import { Card, COLORS } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

function StatBox({ label, value, color, icon }) {
  return (
    <Card style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export default function AdminDashboard({ navigation }) {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await getDashboardStats();
      setStats(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🛡️ Admin Panel</Text>
          <Text style={styles.sub}>Waste Management System</Text>
        </View>
        <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.grid}>
            <StatBox label="Total Reports" value={stats.totalReports} color={COLORS.info} icon="📋" />
            <StatBox label="Pending" value={stats.pending} color={COLORS.warning} icon="⏳" />
            <StatBox label="Completed" value={stats.completed} color={COLORS.primary} icon="✅" />
            <StatBox label="Rejected" value={stats.rejected} color={COLORS.danger} icon="❌" />
            <StatBox label="Citizens" value={stats.totalUsers} color={COLORS.dark} icon="👥" />
          </View>

          <Text style={styles.sectionTitle}>Waste Collected (kg)</Text>
          <Card>
            {[
              { label: '🌿 Organic', val: stats.weights?.organic?.toFixed(1) || 0, color: '#16a34a' },
              { label: '♻️ Recyclable', val: stats.weights?.recyclable?.toFixed(1) || 0, color: COLORS.info },
              { label: '☢️ Hazardous', val: stats.weights?.hazardous?.toFixed(1) || 0, color: COLORS.danger },
              { label: '⚖️ Total', val: stats.weights?.total?.toFixed(1) || 0, color: COLORS.dark },
            ].map((w) => (
              <View key={w.label} style={styles.weightRow}>
                <Text style={styles.weightLabel}>{w.label}</Text>
                <Text style={[styles.weightVal, { color: w.color }]}>{w.val} kg</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.navGrid}>
        {[
          { icon: '📋', label: 'All Reports', screen: 'AdminReports' },
          { icon: '👥', label: 'Citizens', screen: 'AdminCitizens' },
        ].map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.navCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  sub: { fontSize: 13, color: COLORS.gray },
  logout: {
  color: '#fff',
  fontWeight: '700',
  backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, overflow: 'hidden',},
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: '47%', padding: 16 },
  statIcon: { fontSize: 24 },
  statVal: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  weightLabel: { fontSize: 15, color: COLORS.dark },
  weightVal: { fontSize: 15, fontWeight: '700' },
  navGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  navCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 20,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  navIcon: { fontSize: 32 },
  navLabel: { fontWeight: '700', color: COLORS.dark, marginTop: 8, fontSize: 14 },
});
