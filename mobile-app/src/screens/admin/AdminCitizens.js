import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { getCitizens, adjustScore, calculateFee } from '../../services/api';
import { Card, Button, COLORS } from '../../components/UI';
import api from '../../services/api';

// ── [MỚI] Helpers gọi 2 route mới ────────────────────────────────────────────
const updateCitizen = (id, data) => api.put(`/admin/citizens/${id}`, data);
const deleteCitizen = (id)       => api.delete(`/admin/citizens/${id}`);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── [MỚI] Success Modal ───────────────────────────────────────────────────────
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

// ── [MỚI] Error Modal ─────────────────────────────────────────────────────────
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

// ── [MỚI] Confirm Delete Modal ────────────────────────────────────────────────
function ConfirmDeleteModal({ visible, citizen, onCancel, onConfirm, loading }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>🗑️</Text>
          <Text style={[modal.title, { color: COLORS.danger }]}>Delete Citizen</Text>
          <Text style={modal.body}>
            Are you sure you want to delete{' '}
            <Text style={{ fontWeight: '700', color: COLORS.dark }}>{citizen?.name}</Text>?{'\n\n'}
            This will also delete all their reports and cannot be undone.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <TouchableOpacity
              style={[modal.btn, { flex: 1, backgroundColor: '#e5e7eb' }]}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={[modal.btnText, { color: COLORS.dark }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btn, { flex: 1, backgroundColor: COLORS.danger }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={modal.btnText}>Delete</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── [MỚI] Edit Modal ──────────────────────────────────────────────────────────
function EditModal({ citizen, visible, onClose, onDone }) {
  const [name, setName]         = useState(citizen?.name  || '');
  const [email, setEmail]       = useState(citizen?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({ name: '', email: '', password: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  useEffect(() => {
    if (citizen) {
      setName(citizen.name);
      setEmail(citizen.email);
      setPassword('');
      setErrors({ name: '', email: '', password: '' });
    }
  }, [citizen]);

  const validate = () => {
    const e = { name: '', email: '', password: '' };
    let valid = true;
    if (!name.trim())                         { e.name     = 'Please enter a name';                       valid = false; }
    else if (name.trim().length < 2)          { e.name     = 'Name must be at least 2 characters';        valid = false; }
    if (!email.trim())                        { e.email    = 'Please enter an email';                     valid = false; }
    else if (!EMAIL_REGEX.test(email.trim())) { e.email    = 'Please enter a valid email address';        valid = false; }
    if (password && password.length < 6)     { e.password = 'Password must be at least 6 characters';    valid = false; }
    setErrors(e);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { name: name.trim(), email: email.trim() };
      if (password) payload.password = password;
      await updateCitizen(citizen._id, payload);
      setShowSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setErrorMsg(
        msg.toLowerCase().includes('already')
          ? 'This email is already in use by another account'
          : 'Failed to update citizen. Please try again.'
      );
      setShowError(true);
    } finally { setLoading(false); }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✏️ Edit Citizen</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="Full name"
            />
            {errors.name ? <Text style={styles.fieldErrorText}>⚠ {errors.name}</Text> : null}

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.fieldErrorText}>⚠ {errors.email}</Text> : null}

            <Text style={styles.fieldLabel}>
              New Password{' '}
              <Text style={{ color: COLORS.gray, fontWeight: '400' }}>(leave blank to keep current)</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
              placeholder="Min. 6 characters"
              secureTextEntry
            />
            {errors.password ? <Text style={styles.fieldErrorText}>⚠ {errors.password}</Text> : null}

            <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ marginTop: 8 }} />
            <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
          </View>
        </View>
      </Modal>
      <SuccessModal
        visible={showSuccess}
        title="Citizen Updated!"
        body={`${name}'s information has been updated successfully.`}
        onOk={() => { setShowSuccess(false); onDone(); }}
      />
      <ErrorModal visible={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </>
  );
}

// ── ScoreModal (giữ nguyên logic, thay Alert bằng modal) ─────────────────────
function ScoreModal({ citizen, visible, onClose, onDone }) {
  const [delta, setDelta]   = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  const handleAdjust = async () => {
    if (!delta) return; // field error handled inline below
    setLoading(true);
    try {
      await adjustScore(citizen._id, parseInt(delta), reason);
      setShowSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed');
      setShowError(true);
    } finally { setLoading(false); }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Adjust Score: {citizen?.name}</Text>
            <Text style={styles.currentScore}>Current: {citizen?.behaviorScore} pts</Text>
            <TextInput
              style={styles.input}
              placeholder="Delta (e.g. +10 or -20)"
              value={delta}
              onChangeText={setDelta}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Button title="Apply" onPress={handleAdjust} loading={loading} />
            <Button title="Cancel" color={COLORS.gray} onPress={onClose} />
          </View>
        </View>
      </Modal>
      <SuccessModal
        visible={showSuccess}
        title="Score Adjusted!"
        body={`${parseInt(delta) > 0 ? '+' : ''}${delta} pts applied to ${citizen?.name}.`}
        onOk={() => { setShowSuccess(false); onDone(); }}
      />
      <ErrorModal visible={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </>
  );
}

// ── CitizenCard (bổ sung 2 nút Edit + Delete) ─────────────────────────────────
function CitizenCard({ citizen, onAdjust, onCalcFee, onEdit, onDelete }) {
  const scoreColor = citizen.behaviorScore >= 120 ? COLORS.primary : citizen.behaviorScore >= 80 ? COLORS.warning : COLORS.danger;
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{citizen.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{citizen.name}</Text>
          <Text style={styles.email}>{citizen.email}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{citizen.behaviorScore}</Text>
          <Text style={styles.scoreLbl}>pts</Text>
        </View>
      </View>
      {/* Hàng 1: Score + Calc Fee (giữ nguyên) */}
      <View style={styles.actRow}>
        <Button title="⭐ Score"    color={COLORS.info}    onPress={() => onAdjust(citizen)}      style={styles.actBtn} />
        <Button title="💰 Calc Fee" color={COLORS.warning} onPress={() => onCalcFee(citizen._id)} style={styles.actBtn} />
      </View>
      {/* Hàng 2: Edit + Delete (mới) */}
      <View style={styles.actRow}>
        <Button title="✏️ Edit"    color="#6366f1"       onPress={() => onEdit(citizen)}   style={styles.actBtn} />
        <Button title="🗑️ Delete" color={COLORS.danger}  onPress={() => onDelete(citizen)} style={styles.actBtn} />
      </View>
    </Card>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminCitizens() {
  const [citizens, setCitizens]     = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCitizen, setSelectedCitizen]         = useState(null);
  const [editCitizen, setEditCitizen]                 = useState(null);
  const [deleteCitizenTarget, setDeleteCitizenTarget] = useState(null);
  const [deleteLoading, setDeleteLoading]             = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');

  const load = async () => {
    try {
      const { data } = await getCitizens();
      setCitizens(data);
    } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, []);

  const handleCalcFee = async (citizenId) => {
    try {
      const { data } = await calculateFee(citizenId);
      Alert.alert(
        `💰 Fee: ${data.citizen.name}`,
        `Score: ${data.citizen.behaviorScore}\n` +
        `Organic: ${data.weights.organic}kg\nRecyclable: ${data.weights.recyclable}kg\nHazardous: ${data.weights.hazardous}kg\n` +
        `Base fee: $${data.baseFee}\nDiscount: ${data.discount}\nFinal fee: $${data.finalFee}`
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not calculate');
    }
  };

  const handleDelete = async () => {
    if (!deleteCitizenTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCitizen(deleteCitizenTarget._id);
      setDeleteCitizenTarget(null);
      load();
    } catch (err) {
      setDeleteCitizenTarget(null);
      setErrorMsg(err.response?.data?.message || 'Failed to delete citizen');
      setShowError(true);
    } finally { setDeleteLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Citizens ({citizens.length})</Text>
      <Text style={styles.sub}>Sorted by highest score</Text>

      <FlatList
        data={citizens}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <CitizenCard
            citizen={item}
            onAdjust={(c) => setSelectedCitizen(c)}
            onCalcFee={handleCalcFee}
            onEdit={(c) => setEditCitizen(c)}
            onDelete={(c) => setDeleteCitizenTarget(c)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No citizens found</Text></View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Score Modal (cũ) */}
      {selectedCitizen && (
        <ScoreModal
          citizen={selectedCitizen}
          visible={!!selectedCitizen}
          onClose={() => setSelectedCitizen(null)}
          onDone={() => { setSelectedCitizen(null); load(); }}
        />
      )}

      {/* Edit Modal (mới) */}
      {editCitizen && (
        <EditModal
          citizen={editCitizen}
          visible={!!editCitizen}
          onClose={() => setEditCitizen(null)}
          onDone={() => { setEditCitizen(null); load(); }}
        />
      )}

      {/* Confirm Delete Modal (mới) */}
      <ConfirmDeleteModal
        visible={!!deleteCitizenTarget}
        citizen={deleteCitizenTarget}
        onCancel={() => setDeleteCitizenTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      {/* Error Modal */}
      <ErrorModal visible={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  sub: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  info: { flex: 1 },
  name: { fontWeight: '700', color: COLORS.dark, fontSize: 15 },
  email: { fontSize: 12, color: COLORS.gray },
  scoreBadge: { padding: 8, borderRadius: 10, alignItems: 'center', minWidth: 50 },
  scoreText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  scoreLbl: { color: '#fff', fontSize: 10 },
  actRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actBtn: { flex: 1, marginVertical: 0, padding: 10 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  currentScore: { color: COLORS.gray, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 4, marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12,
    fontSize: 15, marginBottom: 4, color: COLORS.dark, backgroundColor: '#fafafa',
  },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  fieldErrorText: { color: COLORS.danger, fontSize: 12, marginBottom: 8 },
});

const modal = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:     { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 420, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  icon:     { fontSize: 56, marginBottom: 12 },
  title:    { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 10 },
  body:     { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn:      { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
