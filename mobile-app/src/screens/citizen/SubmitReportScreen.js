import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  Image, TouchableOpacity, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitReport } from '../../services/api';
import { Button, Input, COLORS, Card } from '../../components/UI';

const CATEGORIES = ['organic', 'recyclable', 'hazardous', 'other'];
const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };

// Categories that support multi-selection together
const MULTI_SELECTABLE = ['organic', 'recyclable', 'hazardous'];

// HÀM HIỂN THỊ THÔNG BÁO HOẠT ĐỘNG CHO CẢ WEB LẪN MOBILE
const showNotification = (title, message, onOk = null) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function SubmitReportScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // ── CHANGED: was `category` (string), now `selectedCategories` (array) ──
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY SELECTION HANDLER
  //
  // Rules:
  //   1. organic / recyclable / hazardous  →  multi-selectable together
  //   2. Tapping "other"                   →  clears all others, selects only "other"
  //   3. Tapping organic/recyclable/hazardous while "other" is active
  //                                        →  deselects "other", adds the tapped one
  //   4. Tapping an already-selected item  →  deselects it (toggle off)
  // ─────────────────────────────────────────────────────────────────────────
  const handleCategoryToggle = (tapped) => {
    setSelectedCategories((prev) => {
      const isAlreadySelected = prev.includes(tapped);

      // Tap on "other"
      if (tapped === 'other') {
        // Toggle off if already selected
        if (isAlreadySelected) return [];
        // Otherwise clear everything and select only "other"
        return ['other'];
      }

      // Tap on organic / recyclable / hazardous
      if (isAlreadySelected) {
        // Toggle it off
        return prev.filter((c) => c !== tapped);
      } else {
        // Remove "other" if it was active, then add the new selection
        const withoutOther = prev.filter((c) => c !== 'other');
        return [...withoutOther, tapped];
      }
    });
  };

  const isCategorySelected = (cat) => selectedCategories.includes(cat);

  // ─────────────────────────────────────────────────────────────────────────
  // PHOTO HANDLERS (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
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
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
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
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền sử dụng camera');
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOCATION HANDLER (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const getLocation = async () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            showNotification('Thành công', 'Đã lấy được vị trí của bạn!');
          },
          () => {
            setLocation({ latitude: 10.7769, longitude: 106.7009 });
            showNotification('Vị trí mặc định', 'Không thể lấy vị trí thật, đang dùng vị trí giả lập tại TP.HCM');
          }
        );
      } else {
        setLocation({ latitude: 10.7769, longitude: 106.7009 });
        showNotification('Thông báo', 'Trình duyệt không hỗ trợ lấy vị trí');
      }
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return showNotification('Lỗi', 'Không có quyền truy cập vị trí');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT HANDLER
  //
  // CHANGED: sends `wasteCategory` as a comma-separated string so the existing
  // backend endpoint receives a single field value it can read from req.body.
  // Example: "organic,recyclable"  or just  "other"
  //
  // If your backend is updated to accept an array via JSON, switch the
  // fd.append line to: fd.append('wasteCategory', JSON.stringify(selectedCategories))
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photo) return showNotification('Lỗi ❌', 'Vui lòng chọn hoặc chụp một tấm ảnh rác!');
    if (selectedCategories.length === 0)
      return showNotification('Lỗi ❌', 'Vui lòng chọn ít nhất một phân loại rác!');
    if (!location) return showNotification('Lỗi 📍', 'Vui lòng bấm lấy vị trí GPS!');

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

      // ── CHANGED: join the array into a comma-separated string ──
      // Backend receives e.g. "organic,recyclable" or "other"
      fd.append('wasteCategory', selectedCategories.join(','));

      fd.append('latitude', String(location.latitude));
      fd.append('longitude', String(location.longitude));
      fd.append('description', description);

      await submitReport(fd);

      showNotification(
        'Thành công! 🎉',
        'Báo cáo của bạn đã được gửi. AI đang âm thầm phân tích, kết quả sẽ có trong vài giây!',
        () => navigation.goBack()
      );

    } catch (err) {
      showNotification('Lỗi gửi báo cáo', err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>New Waste Report</Text>

      {/* ── Photo Section (unchanged) ── */}
      <Card>
        <Text style={styles.sectionLabel}>📷 Photo</Text>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderText}>No photo selected</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: COLORS.info }]} onPress={takePhoto}>
            <Text style={styles.photoBtnText}>📸 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: COLORS.gray }]} onPress={pickPhoto}>
            <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Category — multi-select ── */}
      <Card>
        <Text style={styles.sectionLabel}>🗂️ Waste Category</Text>

        {/* Hint text shows when 1+ items are selected */}
        {selectedCategories.length > 0 && (
          <Text style={styles.selectionHint}>
            Selected:{' '}
            {selectedCategories
              .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
              .join(', ')}
          </Text>
        )}

        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const selected = isCategorySelected(c);
            // "Other" chip gets a distinct locked style when multi-select is active
            const isOtherLocked =
              c === 'other' && selectedCategories.some((s) => MULTI_SELECTABLE.includes(s));

            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.catChip,
                  selected && styles.catChipActive,
                  isOtherLocked && styles.catChipLocked,
                ]}
                onPress={() => handleCategoryToggle(c)}
                activeOpacity={0.75}
              >
                {/* Checkmark badge on selected chips */}
                {selected && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkBadgeText}>✓</Text>
                  </View>
                )}
                <Text style={styles.catIcon}>{CATEGORY_ICONS[c]}</Text>
                <Text style={[styles.catLabel, selected && { color: COLORS.white }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
                {/* Small "exclusive" label under Other */}
                {c === 'other' && (
                  <Text style={[styles.catSubLabel, selected && { color: 'rgba(255,255,255,0.8)' }]}>
                    exclusive
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── Location (unchanged) ── */}
      <Card>
        <Text style={styles.sectionLabel}>📍 Location</Text>
        {location ? (
          <Text style={styles.locText}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} ✅
          </Text>
        ) : (
          <Text style={styles.locText}>No location captured yet</Text>
        )}
        <Button
          title={location ? '📍 Recapture Location' : '📍 Capture My Location'}
          onPress={getLocation}
          color={COLORS.info}
          style={{ marginTop: 8 }}
        />
      </Card>

      {/* ── Description (unchanged) ── */}
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

      <Button title="🚀 Submit Report" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  sectionLabel: { fontWeight: '700', color: COLORS.dark, marginBottom: 6, fontSize: 14 },

  // ── Selection hint ──
  selectionHint: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  // ── Photo ──
  preview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  photoPlaceholder: {
    width: '100%', height: 150, borderRadius: 10, backgroundColor: COLORS.light,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  placeholderText: { color: COLORS.gray },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  photoBtnText: { color: '#fff', fontWeight: '600' },

  // ── Category grid ──
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  catChip: {
    width: '47%',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderWidth: 2,
    borderColor: COLORS.border,
    // Relative positioning enables the checkmark badge
    position: 'relative',
  },

  // Active (selected) state — same green as original
  catChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // "Other" when multi-selectable items are already active — slightly dimmed
  catChipLocked: {
    opacity: 0.45,
    borderStyle: 'dashed',
  },

  // Small ✓ badge in top-right corner of selected chip
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 99,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  catIcon: { fontSize: 24 },
  catLabel: { marginTop: 4, fontWeight: '600', color: COLORS.dark, fontSize: 13 },
  catSubLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2 },

  // ── Location ──
  locText: { color: COLORS.gray, fontSize: 13, marginBottom: 4 },
});
