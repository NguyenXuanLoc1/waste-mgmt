import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, TextInput, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getCitizens, adjustScore } from '../../services/api';
import { Card, Button, COLORS } from '../../components/UI';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTier = (score) => {
  if (score >= 1000) return { label: 'Elite Citizen',  stars: '⭐⭐⭐', color: '#FFD700', bg: '#fffbeb' };
  if (score >= 800)  return { label: 'Star Citizen',   stars: '⭐⭐',   color: '#C0C0C0', bg: '#f8f8f8' };
  if (score >= 600)  return { label: 'Good Citizen',   stars: '⭐',    color: '#CD7F32', bg: '#fdf6ee' };
  if (score >= 400)  return { label: 'Rising Star',    stars: '📈',    color: COLORS.info, bg: '#eff6ff' };
  return               { label: 'Active',             stars: '👍',    color: COLORS.gray, bg: '#f9fafb' };
};

const RANK_MEDALS = ['🥇','🥈','🥉'];

const TIME_FILTERS = ['Week', 'Month', 'Year', 'All Time'];
const SORT_OPTIONS = [
  { key: 'score', label: '🏆 Score' },
  { key: 'name',  label: '🔤 Name' },
];

// ── Shared Modals ─────────────────────────────────────────────────────────────
function SuccessModal({ visible, title, body, onOk }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.icon}>✅</Text>
          <Text style={m.title}>{title}</Text>
          <Text style={m.body}>{body}</Text>
          <TouchableOpacity style={m.btn} onPress={onOk} activeOpacity={0.85}>
            <Text style={m.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ErrorModal({ visible, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.icon}>❌</Text>
          <Text style={[m.title, { color: COLORS.danger }]}>Error</Text>
          <Text style={m.body}>{message}</Text>
          <TouchableOpacity style={[m.btn, { backgroundColor: COLORS.danger }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={m.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Bonus Score Modal ─────────────────────────────────────────────────────────
function BonusModal({ citizen, visible, onClose, onDone }) {
  const [delta, setDelta]   = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [fieldErr, setFieldErr]       = useState('');

  const handle = async () => {
    if (!delta.trim() || isNaN(parseInt(delta))) { setFieldErr('Enter a valid number'); return; }
    setFieldErr(''); setLoading(true);
    try {
      await adjustScore(citizen._id, parseInt(delta), reason || 'Admin bonus');
      setShowSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed'); setShowError(true);
    } finally { setLoading(false); }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={s.slideOverlay}>
          <View style={s.slideBox}>
            <Text style={s.slideTitle}>🎖️ Award Bonus Points</Text>
            <Text style={s.slideSub}>Citizen: <Text style={{ fontWeight: '700' }}>{citizen?.name}</Text></Text>
            <Text style={s.slideSub}>Current score: <Text style={{ fontWeight: '700', color: COLORS.primary }}>{citizen?.behaviorScore} pts</Text></Text>

            <TextInput
              style={[s.input, fieldErr ? s.inputError : null]}
              placeholder="Points (e.g. +20 or -10)"
              value={delta}
              onChangeText={(v) => { setDelta(v); setFieldErr(''); }}
              keyboardType="numbers-and-punctuation"
            />
            {fieldErr ? <Text style={s.fieldErr}>⚠ {fieldErr}</Text> : null}
            <TextInput
              style={[s.input, { height: 60 }]}
              placeholder="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Button title="Award Points" onPress={handle} loading={loading} />
            <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
          </View>
        </View>
      </Modal>
      <SuccessModal
        visible={showSuccess}
        title="Points Awarded!"
        body={`${parseInt(delta) > 0 ? '+' : ''}${delta} pts applied to ${citizen?.name}.`}
        onOk={() => { setShowSuccess(false); onDone(); }}
      />
      <ErrorModal visible={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </>
  );
}

// ── Award Title Modal ─────────────────────────────────────────────────────────
function AwardTitleModal({ citizens, visible, onClose }) {
  const [selected, setSelected] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={s.slideOverlay}>
          <View style={[s.slideBox, { maxHeight: '70%' }]}>
            <Text style={s.slideTitle}>🎁 Award Monthly Title</Text>
            <Text style={s.slideSub}>Select "Exemplary Citizen" of the month (+50 pts):</Text>
            <ScrollView style={{ marginVertical: 8 }}>
              {citizens.slice(0, 10).map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={[s.selectRow, selected?._id === c._id && s.selectRowActive]}
                  onPress={() => setSelected(c)}
                >
                  <View style={[s.selectAvatar, { backgroundColor: getTier(c.behaviorScore).color + '33' }]}>
                    <Text style={{ fontWeight: '800', color: getTier(c.behaviorScore).color }}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.selectName}>{c.name}</Text>
                  <Text style={s.selectScore}>{c.behaviorScore} pts</Text>
                  {selected?._id === c._id && <Text style={{ fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title={selected ? `🏅 Award to ${selected.name}` : 'Select a citizen first'}
              color={selected ? '#FFD700' : COLORS.gray}
              onPress={() => { if (selected) { setShowSuccess(true); } }}
            />
            <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
          </View>
        </View>
      </Modal>
      <SuccessModal
        visible={showSuccess}
        title="Title Awarded! 🎉"
        body={`${selected?.name} has been awarded "Exemplary Citizen" of the month! (+50 pts)`}
        onOk={() => { setShowSuccess(false); setSelected(null); onClose(); }}
      />
    </>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ visible, onClose }) {
  const rules = [
    { action: 'Report approved',          pts: '+10' },
    { action: 'Report completed',         pts: '+5' },
    { action: 'Report rejected',          pts: '-5' },
    { action: 'Top 5 monthly bonus',      pts: '+20' },
    { action: 'Exemplary Citizen title',  pts: '+50' },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.slideOverlay}>
        <View style={s.slideBox}>
          <Text style={s.slideTitle}>⚙️ Scoring Rules</Text>
          {rules.map((r) => (
            <View key={r.action} style={s.ruleRow}>
              <Text style={s.ruleAction}>{r.action}</Text>
              <Text style={[s.rulePts, { color: r.pts.startsWith('+') ? '#16a34a' : COLORS.danger }]}>
                {r.pts} pts
              </Text>
            </View>
          ))}
          <Button title="Close" color={COLORS.gray} onPress={onClose} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Leaderboard Row ───────────────────────────────────────────────────────────
function LeaderRow({ citizen, rank, onBonus }) {
  const tier = getTier(citizen.behaviorScore);
  const isTop3 = rank <= 3;
  return (
    <View style={[s.row, rank % 2 === 0 && s.rowAlt, isTop3 && { backgroundColor: tier.bg }]}>
      {/* Rank */}
      <Text style={s.rankCell}>
        {isTop3 ? RANK_MEDALS[rank - 1] : `#${rank}`}
      </Text>

      {/* Avatar + Name */}
      <View style={[s.avatarSmall, { backgroundColor: tier.color + '33' }]}>
        <Text style={{ fontWeight: '800', color: tier.color, fontSize: 13 }}>
          {citizen.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={s.rowName} numberOfLines={1}>{citizen.name}</Text>
        <Text style={[s.rowTier, { color: tier.color }]}>{tier.stars} {tier.label}</Text>
      </View>

      {/* Score */}
      <Text style={[s.rowScore, isTop3 && { color: tier.color }]}>
        {citizen.behaviorScore}
      </Text>

      {/* Actions */}
      <TouchableOpacity style={s.actionIcon} onPress={() => onBonus(citizen)}>
        <Text>🎖️</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminLeaderboard() {
  const [citizens, setCitizens]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [refreshing, setRefresh]  = useState(false);
  const [search, setSearch]       = useState('');
  const [timeFilter, setTime]     = useState('All Time');
  const [sortKey, setSortKey]     = useState('score');
  const [bonusCitizen, setBonus]  = useState(null);
  const [showAward, setShowAward] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const load = async () => {
    try {
      const { data } = await getCitizens();
      setCitizens(data);
    } catch {}
  };

  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };
  useEffect(() => { load(); }, []);

  // Filter + sort
  useEffect(() => {
    let list = [...citizens];
    if (search.trim()) {
      list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (sortKey === 'score') list.sort((a, b) => b.behaviorScore - a.behaviorScore);
    if (sortKey === 'name')  list.sort((a, b) => a.name.localeCompare(b.name));
    setFiltered(list);
  }, [citizens, search, sortKey]);

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <Text style={s.title}>🏆 Citizens Leaderboard</Text>
      <Text style={s.sub}>Manage rankings & rewards</Text>

      {/* ── Quick Actions ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.qaRow}>
        {[
          { icon: '🎁', label: 'Award Title',  onPress: () => setShowAward(true) },
          { icon: '⚙️', label: 'Rules',        onPress: () => setShowSettings(true) },
        ].map((qa) => (
          <TouchableOpacity key={qa.label} style={s.qaBtn} onPress={qa.onPress}>
            <Text style={s.qaIcon}>{qa.icon}</Text>
            <Text style={s.qaLabel}>{qa.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Filters ── */}
      <View style={s.filtersRow}>
        {/* Time filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TIME_FILTERS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.pill, timeFilter === t && s.pillActive]}
              onPress={() => setTime(t)}
            >
              <Text style={[s.pillText, timeFilter === t && s.pillTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Sort ── */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[s.sortBtn, sortKey === o.key && s.sortBtnActive]}
            onPress={() => setSortKey(o.key)}
          >
            <Text style={[s.sortBtnText, sortKey === o.key && { color: '#fff' }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Search */}
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Search..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      {/* ── Table header ── */}
      <View style={s.tableHeader}>
        <Text style={[s.thCell, { width: 36 }]}>#</Text>
        <Text style={[s.thCell, { flex: 1, marginLeft: 44 }]}>Citizen</Text>
        <Text style={[s.thCell, { width: 54, textAlign: 'right' }]}>Score</Text>
        <Text style={[s.thCell, { width: 36, textAlign: 'center' }]}>Act</Text>
      </View>

      {/* ── Leaderboard list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item, index }) => (
          <LeaderRow
            citizen={item}
            rank={index + 1}
            onBonus={(c) => setBonus(c)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>No citizens found</Text></View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* ── Modals ── */}
      {bonusCitizen && (
        <BonusModal
          citizen={bonusCitizen}
          visible={!!bonusCitizen}
          onClose={() => setBonus(null)}
          onDone={() => { setBonus(null); load(); }}
        />
      )}

      <AwardTitleModal
        citizens={filtered}
        visible={showAward}
        onClose={() => { setShowAward(false); load(); }}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title:     { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  sub:       { fontSize: 13, color: COLORS.gray, marginBottom: 12 },

  // Quick actions
  qaRow: { flexDirection: 'row', marginBottom: 12 },
  qaBtn: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', marginRight: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    flexDirection: 'row', gap: 6,
  },
  qaIcon:  { fontSize: 18 },
  qaLabel: { fontSize: 13, fontWeight: '700', color: COLORS.dark },

  // Filters
  filtersRow: { marginBottom: 8 },
  pill:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, marginRight: 6 },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:   { fontSize: 13, color: COLORS.gray, fontWeight: '600' },
  pillTextActive: { color: '#fff' },

  // Sort row
  sortRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  sortLabel:   { fontSize: 12, color: COLORS.gray },
  sortBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  sortBtnActive:{ backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.dark },
  searchInput: {
    flex: 1, minWidth: 120, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: COLORS.dark,
  },

  // Table header
  tableHeader: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: COLORS.border, marginBottom: 4 },
  thCell:      { fontSize: 11, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase' },

  // Rows
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  rowAlt:     { backgroundColor: '#f9fafb' },
  rankCell:   { fontSize: 16, width: 36, textAlign: 'center' },
  avatarSmall:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowName:    { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  rowTier:    { fontSize: 11, fontWeight: '600', marginTop: 1 },
  rowScore:   { width: 54, textAlign: 'right', fontSize: 16, fontWeight: '800', color: COLORS.dark },
  actionIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, marginLeft: 4 },
  empty:      { alignItems: 'center', marginTop: 60 },
  emptyText:  { color: COLORS.gray, fontSize: 15 },

  // Slide modal (bottom sheet)
  slideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  slideBox:     { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  slideTitle:   { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  slideSub:     { fontSize: 13, color: COLORS.gray, marginBottom: 10 },
  input:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4, color: COLORS.dark, backgroundColor: '#fafafa' },
  inputError:   { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  fieldErr:     { color: COLORS.danger, fontSize: 12, marginBottom: 8 },

  // Select rows (Award Title)
  selectRow:       { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: COLORS.border },
  selectRowActive: { borderColor: COLORS.primary, backgroundColor: '#eff6ff' },
  selectAvatar:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  selectName:      { flex: 1, fontWeight: '700', color: COLORS.dark, fontSize: 14 },
  selectScore:     { fontSize: 14, fontWeight: '700', color: COLORS.gray, marginRight: 8 },

  // Rules
  ruleRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ruleAction: { fontSize: 14, color: COLORS.dark, flex: 1 },
  rulePts:    { fontSize: 14, fontWeight: '800' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  icon:    { fontSize: 52, marginBottom: 12 },
  title:   { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  body:    { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
