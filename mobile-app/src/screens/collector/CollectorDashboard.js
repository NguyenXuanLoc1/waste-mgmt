import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Image, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { getCollectorReports, verifyReport, submitWeight } from '../../services/api';
import { Card, Badge, Button, COLORS } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

// ── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({ visible, title, body, onOk }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>✅</Text>
          <Text style={modal.title}>{title}</Text>
          <Text style={modal.body}>{body}</Text>
          <TouchableOpacity style={modal.btn} onPress={onOk} activeOpacity={0.85}>
            <Text style={modal.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Error Modal ───────────────────────────────────────────────────────────────
function ErrorModal({ visible, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>❌</Text>
          <Text style={[modal.title, { color: COLORS.danger }]}>Error</Text>
          <Text style={modal.body}>{message}</Text>
          <TouchableOpacity
            style={[modal.btn, { backgroundColor: COLORS.danger }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={modal.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Weight Modal ──────────────────────────────────────────────────────────────
function WeightModal({ report, visible, onClose, onSubmitDone }) {
  const [organic, setOrganic]       = useState('0');
  const [recyclable, setRecyclable] = useState('0');
  const [hazardous, setHazardous]   = useState('0');
  const [loading, setLoading]       = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  // Inline field errors
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async () => {
    const o = parseFloat(organic)    || 0;
    const r = parseFloat(recyclable) || 0;
    const h = parseFloat(hazardous)  || 0;
    const total = o + r + h;

    // ── Validation ──────────────────────────────────────────────────────────
    if (total <= 0) {
      setFieldError('Please enter the weight for at least one waste type.');
      return;
    }
    setFieldError('');
    // ────────────────────────────────────────────────────────────────────────

    setLoading(true);
    try {
      await submitWeight({
        reportId:         report._id,
        organicWeight:    o,
        recyclableWeight: r,
        hazardousWeight:  h,
      });
      setShowSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit weights.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚖️ Enter Waste Weights (kg)</Text>

            {[
              { label: '🌿 Organic',    val: organic,    set: setOrganic },
              { label: '♻️ Recyclable', val: recyclable, set: setRecyclable },
              { label: '☢️ Hazardous',  val: hazardous,  set: setHazardous },
            ].map((f) => (
              <View key={f.label} style={styles.weightRow}>
                <Text style={styles.weightLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.weightInput, fieldError ? styles.weightInputError : null]}
                  value={f.val}
                  onChangeText={(v) => { f.set(v); setFieldError(''); }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>
            ))}

            {/* Validation error */}
            {fieldError ? (
              <View style={styles.fieldErrorBox}>
                <Text style={styles.fieldErrorText}>⚠ {fieldError}</Text>
              </View>
            ) : null}

            <Button
              title="Submit Collection"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: 12 }}
            />
            <Button title="Cancel" onPress={onClose} color={COLORS.gray} />
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccess}
        title="Collection Recorded!"
        body="The report has been marked as completed successfully."
        onOk={() => { setShowSuccess(false); onSubmitDone(); }}
      />
      <ErrorModal
        visible={showError}
        message={errorMsg}
        onClose={() => setShowError(false)}
      />
    </>
  );
}

// ── Report Item ───────────────────────────────────────────────────────────────
function ReportItem({ report, onVerify, onCollect }) {
  return (
    <Card>
      <View style={styles.row}>
        <Image source={{ uri: report.photoUrl }} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.citizen}>👤 {report.citizenId?.name || 'Unknown'}</Text>
          <Text style={styles.cat}>
            {CATEGORY_ICONS[report.wasteCategory]} {report.wasteCategory}
          </Text>
          <Badge label={report.status} />
          <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      {report.description ? <Text style={styles.desc}>{report.description}</Text> : null}
      <Text style={styles.loc}>
        📍 {report.location?.address ||
          `${report.location?.latitude?.toFixed(4)}, ${report.location?.longitude?.toFixed(4)}`}
      </Text>
      <View style={styles.actions}>
        {report.status === 'pending' && (
          <Button
            title="✅ Verify"
            onPress={() => onVerify(report._id)}
            color={COLORS.info}
            style={styles.actionBtn}
          />
        )}
        {(report.status === 'verified' || report.status === 'pending') && (
          <Button
            title="⚖️ Collect"
            onPress={() => onCollect(report)}
            color={COLORS.primary}
            style={styles.actionBtn}
          />
        )}
      </View>
    </Card>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CollectorDashboard() {
  const { logout } = useAuth();
  const [reports, setReports]               = useState([]);
  const [refreshing, setRefreshing]         = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showError, setShowError]           = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');

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
      setErrorMsg(err.response?.data?.message || 'Failed to verify report.');
      setShowError(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚛 Collector Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
          onSubmitDone={() => { setSelectedReport(null); load(); }}
        />
      )}

      <ErrorModal
        visible={showError}
        message={errorMsg}
        onClose={() => setShowError(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:      { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  logoutBtn:  { backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, overflow: 'hidden' },
  logoutText: { color: '#fff', fontWeight: '700' },
  sub:        { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  row:        { flexDirection: 'row', gap: 12 },
  thumb:      { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.border },
  info:       { flex: 1, gap: 3 },
  citizen:    { fontWeight: '700', color: COLORS.dark },
  cat:        { fontSize: 13, color: COLORS.gray, textTransform: 'capitalize' },
  date:       { fontSize: 12, color: COLORS.gray },
  desc:       { fontSize: 13, color: COLORS.gray, marginTop: 8 },
  loc:        { fontSize: 12, color: COLORS.info, marginTop: 6 },
  actions:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn:  { flex: 1, marginVertical: 0 },
  empty:      { alignItems: 'center', marginTop: 60 },
  emptyText:  { color: COLORS.gray, fontSize: 15 },

  // Weight Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 16 },
  weightRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weightLabel:     { flex: 1, fontSize: 15, color: COLORS.dark },
  weightInput:     { width: 80, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8, textAlign: 'center', fontSize: 16, color: COLORS.dark },
  weightInputError:{ borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  weightUnit:      { marginLeft: 6, color: COLORS.gray },
  fieldErrorBox:   { backgroundColor: '#fff0f0', borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 10, marginBottom: 4 },
  fieldErrorText:  { color: COLORS.danger, fontSize: 13 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  icon:    { fontSize: 56, marginBottom: 12 },
  title:   { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 10 },
  body:    { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});