import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Image, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { getCollectorReports, verifyReport, submitWeight } from '../../services/api';
import { Card, Badge, Button, COLORS } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

function WeightModal({ report, visible, onClose, onSubmit }) {
  const [organic, setOrganic] = useState('0');
  const [recyclable, setRecyclable] = useState('0');
  const [hazardous, setHazardous] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitWeight({
        reportId: report._id,
        organicWeight: parseFloat(organic) || 0,
        recyclableWeight: parseFloat(recyclable) || 0,
        hazardousWeight: parseFloat(hazardous) || 0,
      });
      Alert.alert('✅ Collection recorded!', 'Report marked as completed.');
      onSubmit();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>⚖️ Enter Waste Weights (kg)</Text>
          {[
            { label: '🌿 Organic', val: organic, set: setOrganic },
            { label: '♻️ Recyclable', val: recyclable, set: setRecyclable },
            { label: '☢️ Hazardous', val: hazardous, set: setHazardous },
          ].map((f) => (
            <View key={f.label} style={styles.weightRow}>
              <Text style={styles.weightLabel}>{f.label}</Text>
              <TextInput
                style={styles.weightInput}
                value={f.val}
                onChangeText={f.set}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
          ))}
          <Button title="Submit Collection" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={onClose} color={COLORS.gray} />
        </View>
      </View>
    </Modal>
  );
}

function ReportItem({ report, onVerify, onCollect }) {
  return (
    <Card>
      <View style={styles.row}>
        <Image source={{ uri: report.photoUrl }} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.citizen}>👤 {report.citizenId?.name || 'Unknown'}</Text>
          <Text style={styles.cat}>{CATEGORY_ICONS[report.wasteCategory]} {report.wasteCategory}</Text>
          <Badge label={report.status} />
          <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      {report.description ? <Text style={styles.desc}>{report.description}</Text> : null}
      <Text style={styles.loc}>
        📍 {report.location?.address || `${report.location?.latitude?.toFixed(4)}, ${report.location?.longitude?.toFixed(4)}`}
      </Text>
      <View style={styles.actions}>
        {report.status === 'pending' && (
          <Button title="✅ Verify" onPress={() => onVerify(report._id)} color={COLORS.info} style={styles.actionBtn} />
        )}
        {(report.status === 'verified' || report.status === 'pending') && (
          <Button title="⚖️ Collect" onPress={() => onCollect(report)} color={COLORS.primary} style={styles.actionBtn} />
        )}
      </View>
    </Card>
  );
}

export default function CollectorDashboard() {
  const { logout } = useAuth();
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const load = async () => {
    try {
      const { data } = await getCollectorReports();
      setReports(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  const handleVerify = async (reportId) => {
    try {
      await verifyReport(reportId);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚛 Collector Dashboard</Text>
        <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>
      <Text style={styles.sub}>{reports.length} active report(s)</Text>

      <FlatList
        data={reports}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => (
          <ReportItem
            report={item}
            onVerify={handleVerify}
            onCollect={(r) => setSelectedReport(r)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending reports nearby 🎉</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {selectedReport && (
        <WeightModal
          report={selectedReport}
          visible={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          onSubmit={() => { setSelectedReport(null); load(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  logout: { color: COLORS.danger, fontWeight: '600' },
  sub: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  info: { flex: 1, gap: 3 },
  citizen: { fontWeight: '700', color: COLORS.dark },
  cat: { fontSize: 13, color: COLORS.gray, textTransform: 'capitalize' },
  date: { fontSize: 12, color: COLORS.gray },
  desc: { fontSize: 13, color: COLORS.gray, marginTop: 8 },
  loc: { fontSize: 12, color: COLORS.info, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, marginVertical: 0 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 16 },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weightLabel: { flex: 1, fontSize: 15, color: COLORS.dark },
  weightInput: {
    width: 80, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 8, textAlign: 'center', fontSize: 16, color: COLORS.dark,
  },
  weightUnit: { marginLeft: 6, color: COLORS.gray },
});
