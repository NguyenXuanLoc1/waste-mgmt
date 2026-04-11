import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../components/UI';
import api, { BASE_URL } from '../../services/api';

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ visible, success, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.icon}>{success ? '✅' : '❌'}</Text>
          <Text style={[m.title, !success && { color: COLORS.danger }]}>
            {success ? 'Success' : 'Error'}
          </Text>
          <Text style={m.body}>{message}</Text>
          <TouchableOpacity
            style={[m.btnOK, !success && { backgroundColor: COLORS.danger }]}
            onPress={onClose}
          >
            <Text style={m.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Avatar Preview Modal ──────────────────────────────────────────────────────
function AvatarPreviewModal({ visible, previewUri, uploading, onConfirm, onCancel }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.title}>Change Profile Photo</Text>
          <Text style={m.body}>This photo will appear on your profile.</Text>
          {previewUri
            ? <Image source={{ uri: previewUri }} style={m.previewImg} />
            : <View style={m.previewPlaceholder}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
          }
          <View style={m.btnRow}>
            <TouchableOpacity
              style={[m.btn, m.btnOutline]}
              onPress={onCancel}
              disabled={uploading}
            >
              <Text style={[m.btnText, { color: COLORS.gray }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btn, uploading && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color="#fff" />
                : <Text style={m.btnText}>Set as Photo</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();

  const [name, setName]         = useState(user?.name  || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [nameErr, setNameErr]   = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading]         = useState(false);

  const [localAvatarUrl, setLocalAvatarUrl] = useState(user?.avatarUrl || null);
  const [avatarKey, setAvatarKey]           = useState(Date.now());

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri]         = useState(null);
  const [pendingFile, setPendingFile]       = useState(null);
  const [modal, setModal] = useState({ visible: false, success: true, message: '' });

  const showModal = (success, message) => setModal({ visible: true, success, message });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    if (user?.avatarUrl) setLocalAvatarUrl(user.avatarUrl);
  }, [user?.avatarUrl]);

  // ── Web: mở file picker ───────────────────────────────────────────────────
  const handlePickAvatar = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) { document.body.removeChild(input); return; }
      const url = URL.createObjectURL(file);
      setPendingFile(file);
      setPreviewUri(url);
      setPreviewVisible(true);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    setTimeout(() => input.click(), 0);
  };

  // ── Upload avatar — dùng axios instance (tự gắn token qua interceptor) ──────
  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', pendingFile, pendingFile.name || 'avatar.jpg');

      // ✅ Dùng api (axios) thay vì fetch — interceptor tự gắn Bearer token
      const { data } = await api.post('/citizen/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await updateUser(data.user);
      setLocalAvatarUrl(data.user.avatarUrl);
      setAvatarKey(Date.now());
      setPreviewVisible(false);
      setPendingFile(null);
      setPreviewUri(null);
      showModal(true, 'Profile photo updated!');
    } catch (err) {
      setPreviewVisible(false);
      showModal(false, err.response?.data?.message || err.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewVisible(false);
    setPendingFile(null);
    if (previewUri) URL.revokeObjectURL(previewUri);
    setPreviewUri(null);
  };

  // ── Save profile — dùng axios instance (tự gắn token qua interceptor) ────────
  const handleSaveProfile = async () => {
    setNameErr('');
    setPhoneErr('');

    if (!name.trim())            { setNameErr('Please enter your name');              return; }
    if (name.trim().length < 2)  { setNameErr('Name must be at least 2 characters'); return; }
    if (phone.trim() && !/^\d+$/.test(phone.trim())) {
      setPhoneErr('Phone number must contain only digits');
      return;
    }

    setSavingProfile(true);
    try {
      // ✅ Dùng api (axios) thay vì fetch — interceptor tự gắn Bearer token
      const { data } = await api.put('/citizen/profile', {
        name:  name.trim(),
        phone: phone.trim(),
      });

      await updateUser(data.user);
      showModal(true, 'Profile updated successfully!');
    } catch (err) {
      showModal(false, err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const avatarUri = localAvatarUrl ? `${localAvatarUrl}?t=${avatarKey}` : null;
  const initials  = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.light }}>

      {/* CUSTOM HEADER */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
        <View style={s.headerRight} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* AVATAR SECTION */}
        <View style={s.avatarBanner}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={s.avatarTouch}>
            {avatarUri
              ? <Image key={avatarKey} source={{ uri: avatarUri }} style={s.avatarImg} />
              : <View style={s.avatarCircle}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
            }
            <View style={s.camBadge}>
              <Text style={s.camIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.avatarName}>{user?.name}</Text>
          <Text style={s.avatarSub}>Tap to change photo</Text>
        </View>

        {/* FORM */}
        <View style={s.card}>
          <Text style={s.label}>
            Full Name <Text style={{ color: COLORS.danger }}>*</Text>
          </Text>
          <TextInput
            style={[s.input, nameErr && s.inputErr]}
            value={name}
            onChangeText={v => { setName(v); setNameErr(''); }}
            placeholder="Your full name"
            placeholderTextColor={COLORS.gray}
          />
          {!!nameErr && <Text style={s.errText}>⚠ {nameErr}</Text>}

          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={[s.input, phoneErr && s.inputErr]}
            value={phone}
            onChangeText={v => {
              // Chỉ cho nhập số — lọc ngay khi gõ
              const digitsOnly = v.replace(/[^0-9]/g, '');
              setPhone(digitsOnly);
              setPhoneErr('');
            }}
            placeholder="e.g. 0901234567"
            placeholderTextColor={COLORS.gray}
            keyboardType="phone-pad"
            maxLength={15}
          />
          {!!phoneErr && <Text style={s.errText}>⚠ {phoneErr}</Text>}

          <Text style={s.label}>Email</Text>
          <View style={s.readonlyRow}>
            <Text style={s.readonlyVal}>{user?.email || '—'}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Cannot change</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, savingProfile && { opacity: 0.65 }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>💾  Save Changes</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>

      <AvatarPreviewModal
        visible={previewVisible}
        previewUri={previewUri}
        uploading={uploading}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelPreview}
      />
      <ResultModal
        visible={modal.visible}
        success={modal.success}
        message={modal.message}
        onClose={() => setModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, paddingTop: 14 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingVertical: 4 },
  backArrow:      { fontSize: 32, color: '#fff', lineHeight: 34, fontWeight: '200', marginTop: -2 },
  backText:       { fontSize: 16, color: '#fff', fontWeight: '600' },
  headerTitle:    { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  headerRight:    { width: 60 },

  avatarBanner:   { backgroundColor: COLORS.primary, alignItems: 'center', paddingTop: 24, paddingBottom: 28 },
  avatarTouch:    { position: 'relative', marginBottom: 10 },
  avatarImg:      { width: 108, height: 108, borderRadius: 54, borderWidth: 3, borderColor: '#fff' },
  avatarCircle:   { width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 38, fontWeight: '900', color: '#fff' },
  camBadge:       { position: 'absolute', bottom: 2, right: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3 },
  camIcon:        { fontSize: 16 },
  avatarName:     { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
  avatarSub:      { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  card:           { backgroundColor: '#fff', margin: 14, borderRadius: 16, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  label:          { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginTop: 14, marginBottom: 5 },
  input:          { backgroundColor: COLORS.light, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 14, color: COLORS.dark },
  inputErr:       { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  errText:        { color: COLORS.danger, fontSize: 12, marginTop: 3 },
  readonlyRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11 },
  readonlyVal:    { fontSize: 14, color: COLORS.gray, flex: 1 },
  badge:          { backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:      { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  saveBtnText:    { color: '#fff', fontWeight: '800', fontSize: 15 },
});

const m = StyleSheet.create({
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 380, elevation: 10 },
  icon:               { fontSize: 50, marginBottom: 10 },
  title:              { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 6, textAlign: 'center' },
  body:               { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  previewImg:         { width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: COLORS.primary, marginBottom: 22 },
  previewPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.light, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  btnRow:             { flexDirection: 'row', gap: 10, width: '100%' },
  btn:                { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnOK:              { alignSelf: 'stretch', paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', marginTop: 4 },
  btnOutline:         { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d1d5db' },
  btnText:            { color: '#fff', fontWeight: '700', fontSize: 14 },
});