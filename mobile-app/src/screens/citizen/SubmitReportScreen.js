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

export default function SubmitReportScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      // Trên web dùng input file trực tiếp
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
    if (!perm.granted) return Alert.alert('Permission denied');
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
    if (!perm.granted) return Alert.alert('Camera permission denied');
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
            Alert.alert('✅ Location captured');
          },
          () => {
            // Dùng tọa độ mặc định nếu bị từ chối
            setLocation({ latitude: 10.7769, longitude: 106.7009 });
            Alert.alert('✅ Default location set', 'TP.HCM coordinates used');
          }
        );
      } else {
        setLocation({ latitude: 10.7769, longitude: 106.7009 });
        Alert.alert('✅ Default location set');
      }
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Location permission denied');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  const handleSubmit = async () => {
    if (!photo) return Alert.alert('Error', 'Please add a photo');
    if (!category) return Alert.alert('Error', 'Please select a waste category');
    if (!location) return Alert.alert('Error', 'Please capture your location');

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

      await submitReport(fd);
      Alert.alert('✅ Report submitted!', 'Thank you! Your report is under review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit report');
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

      <Button title="Submit Report" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
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