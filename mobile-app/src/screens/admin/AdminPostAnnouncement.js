import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../components/UI';

// ── Storage helper — localStorage only (web) ──────────────────────────────────
const STORAGE_KEY = 'admin_announcements';

const saveAnnouncement = (item) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    existing.unshift(item); // mới nhất lên đầu
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('saveAnnouncement error:', err);
    throw err;
  }
};

// ── Tag options ───────────────────────────────────────────────────────────────
const TAG_OPTIONS = [
  { label: 'NEW',      color: COLORS.primary },
  { label: 'UPDATE',   color: COLORS.info },
  { label: 'REMINDER', color: COLORS.warning },
  { label: 'URGENT',   color: COLORS.danger },
];

// ── Modals ────────────────────────────────────────────────────────────────────
function SuccessModal({ visible, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.icon}>✅</Text>
          <Text style={m.title}>Announcement Posted!</Text>
          <Text style={m.body}>
            Your announcement has been saved and will now appear in the Regulations & Announcements screen.
          </Text>
          <TouchableOpacity style={m.btn} onPress={onClose} activeOpacity={0.85}>
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminPostAnnouncement({ navigation }) {
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0]);
  const [loading, setLoading]       = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [errors, setErrors]           = useState({ title: '', body: '' });

  const validate = () => {
    const e = { title: '', body: '' };
    let valid = true;
    if (!title.trim())                  { e.title = 'Please enter a title';                       valid = false; }
    else if (title.trim().length < 5)   { e.title = 'Title must be at least 5 characters';        valid = false; }
    if (!body.trim())                   { e.body  = 'Please enter a message';                     valid = false; }
    else if (body.trim().length < 10)   { e.body  = 'Message must be at least 10 characters';     valid = false; }
    setErrors(e);
    return valid;
  };

  const handlePost = () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const newItem = {
        id:       `ann_${Date.now()}`,
        date:     dateStr,
        tag:      selectedTag.label,
        tagColor: selectedTag.color,
        title:    title.trim(),
        body:     body.trim(),
        isAdmin:  true,
      };

      saveAnnouncement(newItem);
      setShowSuccess(true);
    } catch {
      setErrorMsg('Failed to save announcement. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setTitle(''); setBody(''); setSelectedTag(TAG_OPTIONS[0]); setErrors({ title: '', body: '' });
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Banner */}
      <View style={s.banner}>
        <Text style={s.bannerIcon}>📣</Text>
        <Text style={s.bannerTitle}>Post Announcement</Text>
        <Text style={s.bannerSub}>This will appear in the citizen-facing Announcements tab.</Text>
      </View>

      {/* Tag selector */}
      <Text style={s.fieldLabel}>Tag</Text>
      <View style={s.tagRow}>
        {TAG_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t.label}
            style={[s.tagBtn, { borderColor: t.color }, selectedTag.label === t.label && { backgroundColor: t.color }]}
            onPress={() => setSelectedTag(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tagBtnText, selectedTag.label === t.label && { color: '#fff' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <Text style={s.fieldLabel}>Title <Text style={s.required}>*</Text></Text>
      <TextInput
        style={[s.input, errors.title ? s.inputError : null]}
        value={title}
        onChangeText={(v) => { setTitle(v); setErrors(p => ({ ...p, title: '' })); }}
        placeholder="e.g. New Collection Schedule"
        placeholderTextColor={COLORS.gray}
      />
      {errors.title ? <Text style={s.fieldErr}>⚠ {errors.title}</Text> : null}

      {/* Body */}
      <Text style={s.fieldLabel}>Message <Text style={s.required}>*</Text></Text>
      <TextInput
        style={[s.textarea, errors.body ? s.inputError : null]}
        value={body}
        onChangeText={(v) => { setBody(v); setErrors(p => ({ ...p, body: '' })); }}
        placeholder="Write the full announcement message here..."
        placeholderTextColor={COLORS.gray}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      {errors.body ? <Text style={s.fieldErr}>⚠ {errors.body}</Text> : null}

      {/* Live preview */}
      {(title.trim() || body.trim()) && (
        <View style={s.previewBox}>
          <Text style={s.previewLabel}>Preview</Text>
          <View style={s.previewCard}>
            <View style={s.previewHeader}>
              <View style={[s.previewTag, { backgroundColor: selectedTag.color }]}>
                <Text style={s.previewTagText}>{selectedTag.label}</Text>
              </View>
              <Text style={s.previewDate}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeText}>Admin</Text>
              </View>
            </View>
            <Text style={s.previewTitle}>{title || 'Title...'}</Text>
            <Text style={s.previewBody}>{body || 'Message...'}</Text>
          </View>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handlePost}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.submitText}>📣 Post Announcement</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={s.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <SuccessModal visible={showSuccess} onClose={handleSuccessClose} />
      <ErrorModal visible={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.light, padding: 16 },

  banner:      { backgroundColor: '#f97316', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  bannerIcon:  { fontSize: 40, marginBottom: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
  bannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.88)', textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 6, marginTop: 12 },
  required:   { color: COLORS.danger },

  tagRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tagBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#fff' },
  tagBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.dark },

  input:      { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark },
  textarea:   { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.dark, minHeight: 110 },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  fieldErr:   { color: COLORS.danger, fontSize: 12, marginTop: 4 },

  previewBox:    { marginTop: 20, marginBottom: 4 },
  previewLabel:  { fontSize: 11, fontWeight: '700', color: COLORS.gray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  previewTag:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  previewTagText:{ color: '#fff', fontSize: 10, fontWeight: '800' },
  previewDate:   { fontSize: 12, color: COLORS.gray },
  adminBadge:    { backgroundColor: '#f3e8ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  adminBadgeText:{ fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  previewTitle:  { fontSize: 15, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  previewBody:   { fontSize: 13, color: COLORS.gray, lineHeight: 20 },

  submitBtn:  { backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: COLORS.gray, fontSize: 14 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  icon:    { fontSize: 52, marginBottom: 12 },
  title:   { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  body:    { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});