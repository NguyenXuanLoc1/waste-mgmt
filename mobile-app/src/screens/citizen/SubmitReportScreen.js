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
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

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
    if (Platform.OS === 'web') {
      pickPhoto();
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền sử dụng camera');
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

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

  const handleSubmit = async () => {
    // KIỂM TRA THÔNG TIN TRƯỚC KHI GỬI
    if (!photo) return showNotification('Lỗi ❌', 'Vui lòng chọn hoặc chụp một tấm ảnh rác!');
    if (!category) return showNotification('Lỗi ❌', 'Vui lòng chọn phân loại rác!');
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

      fd.append('wasteCategory', category);
      fd.append('latitude', String(location.latitude));
      fd.append('longitude', String(location.longitude));
      fd.append('description', description);

      // Gửi API
      await submitReport(fd);
      
      // HIỆN THÔNG BÁO VÀ QUAY VỀ TRANG CHỦ
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>New Waste Report</Text>

      {/* Photo Section */}
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

      {/* Category */}
      <Card>
        <Text style={styles.sectionLabel}>🗂️ Waste Category</Text>
        <View style={styles.catGrid}>
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

      {/* Location */}
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

      {/* Description */}
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
  sectionLabel: { fontWeight: '700', color: COLORS.dark, marginBottom: 10, fontSize: 14 },
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
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: {
    width: '47%', padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.light, borderWidth: 2, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catIcon: { fontSize: 24 },
  catLabel: { marginTop: 4, fontWeight: '600', color: COLORS.dark, fontSize: 13 },
  locText: { color: COLORS.gray, fontSize: 13, marginBottom: 4 },
});