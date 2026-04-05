import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Animated, Modal, TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../components/UI';
import api from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTier = (score) => {
  if (score >= 1000) return { label: 'Elite Citizen',  stars: '⭐⭐⭐', color: '#FFD700', bg: '#fffbeb' };
  if (score >= 800)  return { label: 'Star Citizen',   stars: '⭐⭐',   color: '#C0C0C0', bg: '#f8f8f8' };
  if (score >= 600)  return { label: 'Good Citizen',   stars: '⭐',    color: '#CD7F32', bg: '#fdf6ee' };
  if (score >= 400)  return { label: 'Rising Star',    stars: '📈',    color: COLORS.info, bg: '#eff6ff' };
  return               { label: 'Active',             stars: '👍',    color: COLORS.gray, bg: '#f9fafb' };
};

const RANK_MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (!trend || trend === 0) return <Text style={lb.trendNeutral}>— Same</Text>;
  if (trend > 0) return <Text style={lb.trendUp}>📈 +{trend}</Text>;
  return <Text style={lb.trendDown}>📉 {trend}</Text>;
}

// ── Top-3 card ────────────────────────────────────────────────────────────────
function LeaderCard({ item, rank, isCurrentUser }) {
  const tier     = getTier(item.behaviorScore);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400 + rank * 80, useNativeDriver: true,
    }).start();
  }, []);

  const borderColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';

  return (
    <Animated.View style={[
      lb.card,
      { borderColor, backgroundColor: tier.bg },
      isCurrentUser && lb.cardHighlight,
      { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange:[0,1], outputRange:[-12,0] }) }] },
    ]}>
      <Text style={lb.medal}>{RANK_MEDALS[rank - 1]}</Text>
      <View style={[lb.avatar, { backgroundColor: tier.color + '33' }]}>
        <Text style={[lb.avatarText, { color: tier.color }]}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={lb.nameCol}>
        <Text style={lb.name} numberOfLines={1}>
          {item.name}{isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={[lb.tierLabel, { color: tier.color }]}>
          {tier.stars} {tier.label}
        </Text>
        <TrendBadge trend={item.trend || 0} />
      </View>
      <View style={lb.scoreCol}>
        <Text style={[lb.score, { color: rank === 1 ? '#FFD700' : COLORS.dark }]}>
          {item.behaviorScore}
        </Text>
        <Text style={lb.scoreLbl}>pts</Text>
      </View>
    </Animated.View>
  );
}

// ── Full ranking modal row ────────────────────────────────────────────────────
function FullRankRow({ item, rank, isCurrentUser }) {
  const tier = getTier(item.behaviorScore);
  return (
    <View style={[
      lb.fullRow,
      rank % 2 === 0 && { backgroundColor: '#f9fafb' },
      rank <= 3 && { backgroundColor: tier.bg },
      isCurrentUser && lb.fullRowHighlight,
    ]}>
      <Text style={lb.fullRank}>{RANK_MEDALS[rank - 1] || `#${rank}`}</Text>
      <View style={[lb.fullAvatar, { backgroundColor: tier.color + '33' }]}>
        <Text style={[lb.fullAvatarText, { color: tier.color }]}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={lb.fullName} numberOfLines={1}>
          {item.name}{isCurrentUser ? ' 👈 You' : ''}
        </Text>
        <Text style={[lb.fullTier, { color: tier.color }]}>{tier.stars} {tier.label}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[lb.fullScore, { color: rank <= 3 ? tier.color : COLORS.dark }]}>
          {item.behaviorScore}
        </Text>
        <TrendBadge trend={item.trend || 0} />
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LeaderboardSection({
  currentUserScore,
  currentUserId,
  modalVisible = false,
  onModalClose,
}) {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // ✅ Gọi route public — không cần token, citizen cũng xem được
        const { data } = await api.get('/auth/leaderboard');
        setCitizens(data);
      } catch (err) {
        console.warn('Leaderboard fetch error:', err?.response?.data || err.message);
        setCitizens([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const top3   = citizens.slice(0, 3);
  const myRank = citizens.findIndex(u => u._id === currentUserId) + 1;
  const gapToTop10 = myRank > 10
    ? (citizens[9]?.behaviorScore ?? 0) - currentUserScore
    : null;

  if (loading) return null;

  return (
    <View style={lb.wrapper}>
      {/* Tiêu đề — không có View All */}
      <View style={lb.sectionHeader}>
        <Text style={lb.sectionTitle}>🏆 Top Citizens Leaderboard</Text>
      </View>

      {/* My rank callout */}
      {myRank > 0 && (
        <View style={lb.myRankBanner}>
          <Text style={lb.myRankText}>
            🎯 Your rank:{' '}
            <Text style={{ fontWeight: '800', color: COLORS.primary }}>#{myRank}</Text>
          </Text>
          {gapToTop10 !== null && gapToTop10 > 0 && (
            <Text style={lb.myRankSub}>
              {gapToTop10} pts away from Top 10 — keep going!
            </Text>
          )}
        </View>
      )}

      {/* Top 3 */}
      {top3.length === 0
        ? <Text style={lb.empty}>No citizens yet</Text>
        : top3.map((item, i) => (
            <LeaderCard
              key={item._id}
              item={item}
              rank={i + 1}
              isCurrentUser={item._id === currentUserId}
            />
          ))
      }

      {/* Full modal — điều khiển từ FAB */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={lb.modalOverlay}>
          <View style={lb.modalBox}>
            <View style={lb.modalHeader}>
              <Text style={lb.modalTitle}>🏆 Full Leaderboard</Text>
              <TouchableOpacity onPress={onModalClose} style={lb.closeBtn}>
                <Text style={lb.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {citizens.length === 0
              ? <Text style={lb.empty}>No citizens yet</Text>
              : (
                <FlatList
                  data={citizens}
                  keyExtractor={(u) => u._id}
                  renderItem={({ item, index }) => (
                    <FullRankRow
                      item={item}
                      rank={index + 1}
                      isCurrentUser={item._id === currentUserId}
                    />
                  )}
                  contentContainerStyle={{ paddingBottom: 24 }}
                />
              )
            }
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const lb = StyleSheet.create({
  wrapper:       { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.dark },

  myRankBanner: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  myRankText:   { fontSize: 13, color: COLORS.dark, fontWeight: '600' },
  myRankSub:    { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  empty:        { color: COLORS.gray, textAlign: 'center', marginVertical: 16 },

  card:          { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHighlight: { borderColor: COLORS.primary, borderWidth: 2 },
  medal:         { fontSize: 22, width: 36, textAlign: 'center' },
  avatar:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText:    { fontSize: 18, fontWeight: '800' },
  nameCol:       { flex: 1, gap: 2 },
  name:          { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  tierLabel:     { fontSize: 11, fontWeight: '600' },
  scoreCol:      { alignItems: 'flex-end', marginLeft: 8 },
  score:         { fontSize: 22, fontWeight: '900' },
  scoreLbl:      { fontSize: 10, color: COLORS.gray },

  trendUp:      { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  trendDown:    { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
  trendNeutral: { fontSize: 11, color: COLORS.gray },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingHorizontal: 16, paddingTop: 8 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.light, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontWeight: '800', color: COLORS.dark },

  fullRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  fullRowHighlight: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8 },
  fullRank:         { fontSize: 18, width: 36, textAlign: 'center' },
  fullAvatar:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fullAvatarText:   { fontSize: 15, fontWeight: '800' },
  fullName:         { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  fullTier:         { fontSize: 11, fontWeight: '600', marginTop: 1 },
  fullScore:        { fontSize: 18, fontWeight: '900' },
});