import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, Platform, Modal, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitReport } from '../../services/api';
import { Button, Input, COLORS, Card } from '../../components/UI';

const CATEGORIES = ['organic', 'recyclable', 'hazardous', 'other'];
const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

// ── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ visible, onOk }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>🎉</Text>
          <Text style={modal.title}>Report Submitted!</Text>
          <Text style={modal.body}>
            Your report has been sent successfully.{'\n'}
            AI is analyzing your photo — results will appear shortly.
          </Text>
          <TouchableOpacity style={modal.btn} onPress={onOk} activeOpacity={0.85}>
            <Text style={modal.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Error Modal ──────────────────────────────────────────────────────────────
function ErrorModal({ visible, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <Text style={modal.icon}>❌</Text>
          <Text style={[modal.title, { color: COLORS.danger }]}>Oops!</Text>
          <Text style={modal.body}>{message}</Text>
          <TouchableOpacity style={[modal.btn, { backgroundColor: COLORS.danger }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={modal.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function SubmitReportScreen({ navigation }) {
  const [photo, setPhoto]       = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading]   = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  const showErr = (msg) => { setErrorMsg(msg); setShowError(true); };

  // ── Photo Picker ─────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          setPhotoFile(file);
          setPhoto({ uri: URL.createObjectURL(file) });
        }
      };
      input.click();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showErr('Gallery permission is required.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return showErr('Camera permission is required.');
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── Location ─────────────────────────────────────────────────────────────
  const getLocation = async () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          ()    => setLocation({ latitude: 10.7769, longitude: 106.7009 })
        );
      } else {
        setLocation({ latitude: 10.7769, longitude: 106.7009 });
      }
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return showErr('Location permission is required.');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photo)    return showErr('Please select or take a photo.');
    if (!category) return showErr('Please select a waste category.');
    if (!location) return showErr('Please capture your GPS location.');

    setLoading(true);
    try {
      const fd = new FormData();
      if (Platform.OS === 'web' && photoFile) {
        fd.append('photo', photoFile, photoFile.name);
      } else {
        fd.append('photo', {
          uri: Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri,
          type: 'image/jpeg',
          name: 'waste_report.jpg',
        });
      }
      fd.append('wasteCategory', category);
      fd.append('latitude',    String(location.latitude));
      fd.append('longitude',   String(location.longitude));
      fd.append('description', description);

      await submitReport(fd);
      setShowSuccess(true);
    } catch (err) {
      showErr(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>New Waste Report</Text>

      {/* ── Photo Section ── */}
      <Card>
        <Text style={styles.sectionLabel}>📷 Photo</Text>

        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={styles.preview}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>No photo selected</Text>
            <Text style={styles.placeholderSub}>Tap Camera or Gallery below</Text>
          </View>
        )}

        {/* 2 nút thẳng hàng */}
        <View style={styles.twoCol}>
          <TouchableOpacity style={[styles.colBtn, { backgroundColor: COLORS.info }]} onPress={takePhoto}>
            <Text style={styles.colBtnText}>📸 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.colBtn, { backgroundColor: '#6b7280' }]} onPress={pickPhoto}>
            <Text style={styles.colBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Category ── */}
      <Card>
        <Text style={styles.sectionLabel}>🗂️ Waste Category</Text>
        {/* 4 nút thẳng hàng 2×2 */}
        <View style={styles.twoCol}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={styles.catIcon}>{CATEGORY_ICONS[c]}</Text>
              <Text style={[styles.catLabel, category === c && { color: COLORS.white }]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* ── Location ── */}
      <Card>
        <Text style={styles.sectionLabel}>📍 Location</Text>
        {location ? (
          <View style={styles.locBadge}>
            <Text style={styles.locBadgeText}>
              ✅ {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text style={styles.locEmpty}>No location captured yet</Text>
        )}
        <Button
          title={location ? '📍 Recapture Location' : '📍 Capture My Location'}
          onPress={getLocation}
          color={COLORS.info}
          style={{ marginTop: 8 }}
        />
      </Card>

      {/* ── Description ── */}
      <Card>
        <Text style={styles.sectionLabel}>📝 Description (optional)</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the waste situation..."
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
      </Card>

      {/* ── Submit Button ── */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>🚀 Submit Report</Text>
        }
      </TouchableOpacity>

      {/* ── Modals ── */}
      <SuccessModal
        visible={showSuccess}
        onOk={() => { setShowSuccess(false); navigation.goBack(); }}
      />
      <ErrorModal
        visible={showError}
        message={errorMsg}
        onClose={() => setShowError(false)}
      />
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  sectionLabel: { fontWeight: '700', color: COLORS.dark, marginBottom: 10, fontSize: 14 },

  // Photo
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  photoPlaceholder: {
    width: '100%', height: 200, borderRadius: 10,
    backgroundColor: COLORS.light, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  placeholderIcon: { fontSize: 36, marginBottom: 8 },
  placeholderText: { color: COLORS.dark, fontWeight: '600', fontSize: 14 },
  placeholderSub:  { color: COLORS.gray, fontSize: 12, marginTop: 4 },

  // Shared 2-column layout
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colBtn: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  colBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Category chips (same twoCol layout)
  catChip: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catIcon:  { fontSize: 26 },
  catLabel: { marginTop: 6, fontWeight: '600', color: COLORS.dark, fontSize: 13 },

  // Location
  locBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 8,
    padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  locBadgeText: { color: '#16a34a', fontWeight: '600', fontSize: 13 },
  locEmpty:     { color: COLORS.gray, fontSize: 13, marginBottom: 4 },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  icon:  { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 10 },
  body:  { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
