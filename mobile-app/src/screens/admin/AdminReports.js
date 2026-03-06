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
          <Button title="Confirm Reject" color={COLORS.danger} onPress={() => { onConfirm(reason); setReason(''); }} />
          <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function ReportCard({ report, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);

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
      Alert.alert('✅ Approved', 'Citizen scored +10 points');
      onRefresh();
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleReject = async (reason) => {
    setRejectVisible(false);
    try {
      await rejectReport(report._id, reason);
      Alert.alert('Report rejected', 'Citizen scored -20 points');
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
              <View style={styles.between}>
                <Text style={styles.citizen}>{report.citizenId?.name || 'Unknown'}</Text>
                <Badge label={report.status} />
              </View>
              <Text style={styles.cat}>{CATEGORY_ICONS[report.wasteCategory]} {report.wasteCategory}</Text>
              <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
              {report.aiAnalysis?.notes && (
                <Text style={styles.aiNote}>🤖 {report.aiAnalysis.notes}</Text>
              )}
            </View>
          </View>

          {expanded && (
            <View style={styles.expanded}>
              <Text style={styles.detailText}>
                📍 {report.location?.latitude?.toFixed(4)}, {report.location?.longitude?.toFixed(4)}
              </Text>
              {report.description ? <Text style={styles.detailText}>📝 {report.description}</Text> : null}
              {report.aiAnalysis?.confidence ? (
                <Text style={styles.detailText}>
                  🤖 AI Confidence: {report.aiAnalysis.confidence}% | Fake: {report.aiAnalysis.isFake ? '⚠️ Yes' : 'No'}
                </Text>
              ) : null}

              {(report.status === 'pending') && (
                <View style={styles.actRow}>
                  <Button
                    title={analyzing ? '...' : '🤖 Analyze'}
                    color={COLORS.info}
                    onPress={handleAnalyze}
                    loading={analyzing}
                    style={styles.actBtn}
                  />
                  <Button
                    title="✅ Approve"
                    color={COLORS.primary}
                    onPress={handleApprove}
                    loading={approving}
                    style={styles.actBtn}
                  />
                  <Button
                    title="❌ Reject"
                    color={COLORS.danger}
                    onPress={() => setRejectVisible(true)}
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

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
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

      {/* Filter Chips */}
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
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  info: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  citizen: { fontWeight: '700', color: COLORS.dark, fontSize: 14 },
  cat: { fontSize: 13, color: COLORS.gray, marginTop: 2, textTransform: 'capitalize' },
  date: { fontSize: 12, color: COLORS.gray },
  aiNote: { fontSize: 11, color: COLORS.info, marginTop: 2, fontStyle: 'italic' },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
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
