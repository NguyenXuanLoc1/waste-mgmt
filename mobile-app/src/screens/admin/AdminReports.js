import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Image, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import {
  getAllReports, analyzeReport, approveReport, rejectReport,
} from '../../services/api';
import { Card, Badge, Button, COLORS } from '../../components/UI';

const STATUS_FILTERS = ['all', 'pending', 'verified', 'completed', 'rejected'];
const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

// ── Helper: format category array → "🌿 Organic / ♻️ Recyclable" ──────────
function formatCategories(wasteCategory) {
  if (!wasteCategory) return '—';
  const arr = Array.isArray(wasteCategory) ? wasteCategory : [wasteCategory];
  return arr
    .map((c) => `${CATEGORY_ICONS[c] || ''} ${c.charAt(0).toUpperCase() + c.slice(1)}`)
    .join(' / ');
}

// ── Helper: build reporter display string ─────────────────────────────────
// Returns { label, detail } where detail is the sub-info line
function reporterInfo(report) {
  if (report.isGuest) {
    const parts = [];
    if (report.guestName)  parts.push(report.guestName);
    if (report.guestPhone) parts.push(`📱 ${report.guestPhone}`);
    if (report.guestEmail) parts.push(`✉️ ${report.guestEmail}`);
    return {
      label:  report.guestName || 'Guest',
      detail: parts.slice(1).join('  ·  ') || null, // phone / email line
      isGuest: true,
    };
  }
  return {
    label:   report.citizenId?.name || 'Unknown',
    detail:  report.citizenId?.email || null,
    isGuest: false,
  };
}

// ── Reject modal ──────────────────────────────────────────────────────────
function RejectModal({ visible, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Reject Report</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter rejection reason..."
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            title="Confirm Reject" color={COLORS.danger}
            onPress={() => { onConfirm(reason); setReason(''); }}
          />
          <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// ── Report card ───────────────────────────────────────────────────────────
function ReportCard({ report, onRefresh }) {
  const [expanded,      setExpanded]      = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [approving,     setApproving]     = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);

  const reporter = reporterInfo(report);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data } = await analyzeReport(report._id);
      Alert.alert(
        '🤖 AI Analysis',
        `Category: ${data.analysis.detectedCategory}\nConfidence: ${data.analysis.confidence}%\nFake: ${data.analysis.isFake ? 'YES ⚠️' : 'No'}\n\n${data.analysis.notes}`
      );
      onRefresh();
    } catch { Alert.alert('Error', 'Analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveReport(report._id);
      Alert.alert('✅ Approved', report.isGuest ? 'Guest report approved.' : 'Citizen scored +10 points');
      onRefresh();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleReject = async (reason) => {
    setRejectVisible(false);
    try {
      await rejectReport(report._id, reason);
      Alert.alert('Report rejected', report.isGuest ? 'Guest report rejected.' : 'Citizen scored -20 points');
      onRefresh();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Card>
          <View style={styles.row}>
            <Image source={{ uri: report.photoUrl }} style={styles.thumb} />

            <View style={styles.info}>
              {/* Reporter name row */}
              <View style={styles.between}>
                <View style={styles.reporterRow}>
                  <Text style={styles.citizen}>{reporter.label}</Text>
                  {reporter.isGuest && (
                    <View style={styles.guestTag}>
                      <Text style={styles.guestTagText}>GUEST</Text>
                    </View>
                  )}
                </View>
                <Badge label={report.status} />
              </View>

              {/* Reporter contact line (phone / email for guests) */}
              {reporter.detail && (
                <Text style={styles.reporterDetail}>{reporter.detail}</Text>
              )}

              {/* ── FIXED: categories joined with " / " ── */}
              <Text style={styles.cat}>{formatCategories(report.wasteCategory)}</Text>

              <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>

              {report.aiAnalysis?.notes && (
                <Text style={styles.aiNote} numberOfLines={2}>🤖 {report.aiAnalysis.notes}</Text>
              )}
            </View>
          </View>

          {/* ── Expanded detail ── */}
          {expanded && (
            <View style={styles.expanded}>
              {/* Guest verification badge */}
              {report.isGuest && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>
                    {report.isVerified ? '✅ OTP Verified' : '⚠️ Not Verified'}
                  </Text>
                </View>
              )}

              <Text style={styles.detailText}>
                📍 {report.location?.latitude?.toFixed(4)}, {report.location?.longitude?.toFixed(4)}
              </Text>
              {report.description ? (
                <Text style={styles.detailText}>📝 {report.description}</Text>
              ) : null}
              {report.aiAnalysis?.confidence ? (
                <Text style={styles.detailText}>
                  🤖 AI Confidence: {report.aiAnalysis.confidence}% | Fake: {report.aiAnalysis.isFake ? '⚠️ Yes' : 'No'}
                </Text>
              ) : null}

              {report.status === 'pending' && (
                <View style={styles.actRow}>
                  <Button
                    title={analyzing ? '...' : '🤖 Analyze'}
                    color={COLORS.info} onPress={handleAnalyze}
                    loading={analyzing} style={styles.actBtn}
                  />
                  <Button
                    title="✅ Approve"
                    color={COLORS.primary} onPress={handleApprove}
                    loading={approving} style={styles.actBtn}
                  />
                  <Button
                    title="❌ Reject"
                    color={COLORS.danger} onPress={() => setRejectVisible(true)}
                    style={styles.actBtn}
                  />
                </View>
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>

      <RejectModal
        visible={rejectVisible}
        onClose={() => setRejectVisible(false)}
        onConfirm={handleReject}
      />
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [reports,    setReports]    = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await getAllReports(params);
      setReports(data.reports);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [filter]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Reports</Text>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, filter === s && styles.chipActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reports}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => <ReportCard report={item} onRefresh={load} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No reports found</Text></View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 10 },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Card layout
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  info: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },

  // Reporter name + guest tag
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  citizen: { fontWeight: '700', color: COLORS.dark, fontSize: 14 },
  guestTag: {
    backgroundColor: '#8b5cf6', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  guestTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Reporter contact detail (phone / email)
  reporterDetail: { fontSize: 11, color: COLORS.gray, marginTop: 1, marginBottom: 1 },

  // ── FIXED category display ──
  cat: { fontSize: 13, color: COLORS.gray, marginTop: 2 },

  date: { fontSize: 12, color: COLORS.gray },
  aiNote: { fontSize: 11, color: COLORS.info, marginTop: 2, fontStyle: 'italic' },

  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },

  // OTP verified badge in expanded section
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  verifiedBadgeText: { fontSize: 12, color: '#15803d', fontWeight: '700' },

  detailText: { fontSize: 13, color: COLORS.dark, marginBottom: 4 },
  actRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actBtn: { flex: 1, marginVertical: 0, padding: 10 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  reasonInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 12,
  },
});
