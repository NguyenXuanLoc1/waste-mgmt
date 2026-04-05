import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Alert, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyScore } from '../../services/api';
import { Card, COLORS, SectionTitle } from '../../components/UI';
import LeaderboardSection from './LeaderboardSection';
import LeaderboardFAB from '../../components/LeaderboardFAB';

// ── Behavior Score meter ──────────────────────────────────────────────────────
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

// ── Guest banner ──────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function CitizenDashboard({ navigation }) {
  const { user, isGuest, logout } = useAuth();
  const [data, setData]             = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardModal, setLeaderboardModal] = useState(false);

  const load = async () => {
    if (isGuest) return;
    try {
      const { data: d } = await getMyScore();
      setData(d);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Reload mỗi khi màn hình được focus (kể cả khi quay về từ ProfileScreen)
  useFocusEffect(
    useCallback(() => { load(); }, [isGuest])
  );

  const avatarUri  = user?.avatarUrl || null;
  const initials   = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const firstName  = isGuest ? 'Guest' : user?.name?.split(' ')[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Left: Avatar + greeting — bấm vào để mở Profile */}
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => !isGuest && navigation.navigate('Profile')}
            activeOpacity={isGuest ? 1 : 0.7}
          >
            <View style={styles.headerRow}>
              {/* Avatar nhỏ */}
              {!isGuest && (
                avatarUri
                  ? <Image source={{ uri: avatarUri }} style={styles.miniAvatar} />
                  : (
                    <View style={styles.miniAvatarPlaceholder}>
                      <Text style={styles.miniAvatarText}>{initials}</Text>
                    </View>
                  )
              )}
              <View style={styles.greetingWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
                  {!isGuest && <Text style={styles.editHint}>✏️</Text>}
                </View>
                <Text style={styles.role}>
                  {isGuest ? '👤 Guest Account' : 'Citizen Account'}
                </Text>
                {!isGuest && (
                  <View style={styles.contactRow}>
                    {user?.phone ? <Text style={styles.contactItem}>📞 {user.phone}</Text> : null}
                    {user?.email ? <Text style={styles.contactItem}>✉️ {user.email}</Text> : null}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{isGuest ? 'Exit' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 🏆 Leaderboard ── */}
        {!isGuest && (
          <LeaderboardSection
            currentUserScore={data?.behaviorScore || 0}
            currentUserId={user?._id || user?.id}
            modalVisible={leaderboardModal}
            onModalClose={() => setLeaderboardModal(false)}
          />
        )}

        {/* ── Score / Guest banner ── */}
        {isGuest
          ? <GuestBanner onLogin={() => logout()} />
          : data && <ScoreMeter score={data.behaviorScore} />
        }

        {/* ── Fee card ── */}
        {!isGuest && (
          <Card style={styles.feeCard}>
            <Text style={styles.feeLabel}>Total Collection Fee</Text>
            <Text style={styles.feeAmount}>${data?.totalFee?.toFixed(2) || '0.00'}</Text>
          </Card>
        )}

        {/* ── Stats row ── */}
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
                Alert.alert('Login Required', 'You need an account to view your report history.',
                  [{ text: 'Cancel', style: 'cancel' }, { text: 'Login / Register', onPress: () => logout() }]
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

      {/* ── 🏆 FAB ── */}
      <LeaderboardFAB onPress={() => setLeaderboardModal(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 16 },
  headerLeft:   { flex: 1, marginRight: 12 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },

  miniAvatar:            { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary },
  miniAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText:        { color: '#fff', fontWeight: '800', fontSize: 16 },

  greetingWrap: { flex: 1 },
  greeting:     { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  editHint:     { fontSize: 13 },
  role:         { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  contactRow:   { marginTop: 4, gap: 2 },
  contactItem:  { fontSize: 12, color: COLORS.gray },

  logoutBtn:    { backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, overflow: 'hidden' },
  logoutText:   { color: '#fff', fontWeight: '700' },

  meterCard:    { alignItems: 'center', padding: 24 },
  meterLabel:   { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  meterScore:   { fontSize: 56, fontWeight: '900' },
  meterBg:      { width: '100%', height: 10, backgroundColor: COLORS.border, borderRadius: 10, marginTop: 12 },
  meterFill:    { height: 10, borderRadius: 10 },
  meterSub:     { marginTop: 8, fontSize: 14, color: COLORS.gray },

  guestBanner:       { alignItems: 'center', padding: 24, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  guestBannerIcon:   { fontSize: 40, marginBottom: 10 },
  guestBannerTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  guestBannerSub:    { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  guestLoginBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  guestLoginText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  feeCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel:     { fontSize: 15, color: COLORS.gray },
  feeAmount:    { fontSize: 24, fontWeight: '800', color: COLORS.dark },

  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:     { flex: 1, alignItems: 'center', padding: 12 },
  statNum:      { fontSize: 24, fontWeight: '800' },
  statLabel:    { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  actions:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionCard:   { flex: 1, borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  actionIcon:   { fontSize: 32 },
  actionText:   { color: '#fff', fontWeight: '700', marginTop: 8, fontSize: 14, textAlign: 'center' },
  guestActionNote: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4, fontStyle: 'italic' },
});