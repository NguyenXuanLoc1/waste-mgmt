import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Alert, Platform, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyScore, getMyFee, createPayment } from '../../services/api';
import api from '../../services/api';
import { Card, COLORS, SectionTitle } from '../../components/UI';
import LeaderboardSection from './LeaderboardSection';
import LeaderboardFAB from '../../components/LeaderboardFAB';

// ── Behavior Score meter ──────────────────────────────────────────────────────
function ScoreMeter({ score }) {
  const pct   = Math.min(Math.max(score, 0), 200) / 200;
  const color = score >= 120 ? '#22c55e' : score >= 80 ? '#f59e0b' : '#ef4444';
  const label = score >= 120 ? 'Excellent' : score >= 80 ? 'Good' : 'Needs improvement';
  const emoji = score >= 120 ? '🌟' : score >= 80 ? '👍' : '⚠️';
  return (
    <View style={sm.wrap}>
      <View style={[sm.ring, { borderColor: color + '33' }]}>
        <View style={[sm.ringInner, { borderColor: color }]}>
          <Text style={[sm.scoreNum, { color }]}>{score}</Text>
          <Text style={sm.scorePts}>pts</Text>
        </View>
      </View>
      <Text style={[sm.label, { color }]}>{emoji} {label}</Text>
      <View style={sm.barBg}>
        <View style={[sm.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        <View style={[sm.barThumb, { left: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <View style={sm.barLegend}>
        <Text style={sm.legendTxt}>0</Text>
        <Text style={sm.legendTitle}>Behavior Score</Text>
        <Text style={sm.legendTxt}>200</Text>
      </View>
      {score > 100 && (
        <View style={sm.discountBadge}>
          <Text style={sm.discountTxt}>
            🎁 {Math.min(((score - 100) / 10 * 2), 30).toFixed(0)}% fee discount applied
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Guest banner ──────────────────────────────────────────────────────────────
function GuestBanner({ onLogin }) {
  return (
    <View style={gb.wrap}>
      <Text style={gb.icon}>👤</Text>
      <Text style={gb.title}>Browsing as Guest</Text>
      <Text style={gb.sub}>Create a free account to track reports, earn points, and get fee discounts.</Text>
      <TouchableOpacity style={gb.btn} onPress={onLogin}>
        <Text style={gb.btnTxt}>Login / Register →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Fee card ──────────────────────────────────────────────────────────────
function FeeCard({ fee, onPay, paying, polling }) {
  if (!fee) {
    return (
      <View style={fc.wrap}>
        <View style={fc.left}>
          <Text style={fc.title}>Collection Fee</Text>
          <View style={fc.paidRow}>
            <View style={fc.paidDot} />
            <Text style={fc.paidTxt}>No pending payment</Text>
          </View>
        </View>
        <Text style={fc.amount}>$0.00</Text>
      </View>
    );
  }
  return (
    <View style={[fc.wrap, fc.wrapUnpaid]}>
      <View style={fc.left}>
        <Text style={fc.title}>Collection Fee</Text>
        <Text style={fc.kg}>{fee.kgOfTrash} kg collected</Text>
        {polling && <Text style={fc.pollingTxt}>⏳ Checking payment status...</Text>}
      </View>
      <View style={fc.right}>
        <Text style={[fc.amount, fc.amountUnpaid]}>${fee.amountToPay?.toFixed(2)}</Text>
        <TouchableOpacity
          style={[fc.payBtn, (paying || polling) && fc.payBtnOff]}
          onPress={onPay}
          disabled={paying || polling}
          activeOpacity={0.8}
        >
          <Text style={fc.payTxt}>{paying ? 'Opening…' : polling ? 'Waiting…' : '💳 Pay Now'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CitizenDashboard({ navigation }) {
  const { user, isGuest, logout } = useAuth();
  const [data, setData]             = useState(null);
  const [fee, setFee]               = useState(null);
  const [feeLoaded, setFeeLoaded]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying]         = useState(false);
  const [polling, setPolling]       = useState(false);
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const pollRef      = useRef(null);
  const appTransRef  = useRef(null);

  const load = useCallback(async () => {
    if (isGuest) return;
    try {
      const [scoreRes, feeRes] = await Promise.all([getMyScore(), getMyFee()]);
      setData(scoreRes.data);
      setFee(feeRes.data.fee ?? null);
    } catch (err) {
      console.error('load error:', err);
    } finally {
      setFeeLoaded(true);
    }
  }, [isGuest]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Polling: dùng check-status giống server.js bạn bè ──────────────────
  const startPolling = useCallback((appTransId, reportId) => {
    appTransRef.current = appTransId;
    setPolling(true);
    let count = 0;

    pollRef.current = setInterval(async () => {
      count++;
      try {
        const { data: statusData } = await api.get(`/payment/check-status/${appTransId}`);
        console.log(`Poll #${count}:`, statusData);

        if (statusData.paid) {
          clearInterval(pollRef.current);
          setPolling(false);
          appTransRef.current = null;
          await load();
          Alert.alert('✅ Payment Successful!', 'Your collection fee has been paid.');
          return;
        }
      } catch (err) {
        console.error('Poll error:', err?.response?.data || err.message);
      }

      // Dừng sau 5 phút
      if (count >= 100) {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 3000);
  }, [load]);

  // ── handlePay ─────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!fee) return;
    const reportId = fee.reportId?._id?.toString() || fee.reportId?.toString();
    if (!reportId) { Alert.alert('Error', 'Invalid report ID'); return; }

    console.log('💳 PAY clicked — reportId:', reportId);
    setPaying(true);

    try {
      const res = await createPayment(reportId);
      const { order_url, app_trans_id } = res.data;
      console.log('✅ order_url:', order_url, 'app_trans_id:', app_trans_id);

      if (!order_url) { Alert.alert('Error', 'No payment URL returned'); return; }

      if (Platform.OS === 'web') {
        // Mở ZaloPay tab mới, tab hiện tại giữ dashboard + bắt đầu poll
        window.open(order_url, '_blank');
      } else {
        const { Linking } = require('react-native');
        await Linking.openURL(order_url);
      }

      // Bắt đầu poll check-status (giống bạn bè dùng check-status API)
      startPolling(app_trans_id, reportId);

    } catch (err) {
      console.error('❌ Payment error:', err?.response?.data || err.message);
      Alert.alert('Payment Error', err?.response?.data?.message || 'Could not create payment');
    } finally {
      setPaying(false);
    }
  };

  // Reload mỗi khi màn hình được focus (kể cả khi quay về từ ProfileScreen)
  useFocusEffect(
    useCallback(() => { load(); }, [isGuest, load])
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => !isGuest && navigation.navigate('Profile')}
            activeOpacity={isGuest ? 1 : 0.7}
          >
            <View style={styles.headerRow}>
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

        {/* ── Fee card (Đã gộp thanh toán) ── */}
        {!isGuest && feeLoaded && (
          <FeeCard fee={fee} onPay={handlePay} paying={paying} polling={polling} />
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

// ─── StyleSheets ──────────────────────────────────────────────────────────
const sm = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  ring: { width: 130, height: 130, borderRadius: 65, borderWidth: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ringInner: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  scorePts: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: -2 },
  label:    { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  barBg:    { width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 8, position: 'relative', overflow: 'visible' },
  barFill:  { height: 8, borderRadius: 8 },
  barThumb: { position: 'absolute', top: -4, width: 16, height: 16, borderRadius: 8, marginLeft: -8, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  barLegend:{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  legendTxt:{ fontSize: 11, color: '#cbd5e1' },
  legendTitle: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  discountBadge: { marginTop: 12, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  discountTxt: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
});

const gb = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  icon: { fontSize: 40, marginBottom: 10 },
  title:{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  sub:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  btn:  { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const fc = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  wrapUnpaid: { borderWidth: 1.5, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  left: { flex: 1 },
  right:{ alignItems: 'flex-end', gap: 8 },
  title:{ fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  kg:   { fontSize: 12, color: '#94a3b8' },
  pollingTxt: { fontSize: 11, color: '#f59e0b', marginTop: 4, fontStyle: 'italic' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  paidDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  paidTxt: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  amount:  { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  amountUnpaid: { color: '#d97706' },
  payBtn:  { backgroundColor: '#f59e0b', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 8, elevation: 3 },
  payBtnOff: { opacity: 0.5 },
  payTxt:  { color: '#fff', fontWeight: '800', fontSize: 13 },
});

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