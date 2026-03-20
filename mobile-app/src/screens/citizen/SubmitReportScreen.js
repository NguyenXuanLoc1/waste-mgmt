import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  Image, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitReport, submitGuestReport, sendOtp, verifyOtp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS, Card } from '../../components/UI';

const CATEGORIES = ['organic', 'recyclable', 'hazardous', 'other'];
const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };
const MULTI_SELECTABLE = ['organic', 'recyclable', 'hazardous'];

const showNotification = (title, message, onOk = null) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function SubmitReportScreen({ navigation }) {
  const { isGuest } = useAuth();

  // ── Common state ──────────────────────────────────────────────────────
  const [photo, setPhoto]                   = useState(null);
  const [photoFile, setPhotoFile]           = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [description, setDescription]       = useState('');
  const [location, setLocation]             = useState(null);
  const [loading, setLoading]               = useState(false);

  // ── Guest-only state ──────────────────────────────────────────────────
  const [guestName, setGuestName]           = useState('');
  const [guestPhone, setGuestPhone]         = useState('');
  const [guestEmail, setGuestEmail]         = useState('');
  const [otpContact, setOtpContact]         = useState('');  // which contact was used to send OTP
  const [otpCode, setOtpCode]               = useState('');
  const [otpSent, setOtpSent]               = useState(false);
  const [otpSending, setOtpSending]         = useState(false);
  const [otpVerifying, setOtpVerifying]     = useState(false);
  const [isVerified, setIsVerified]         = useState(false);

  // ── Multi-select category handler ─────────────────────────────────────
  const handleCategoryToggle = (tapped) => {
    setSelectedCategories((prev) => {
      const already = prev.includes(tapped);
      if (tapped === 'other') {
        return already ? [] : ['other'];
      }
      if (already) return prev.filter((c) => c !== tapped);
      return [...prev.filter((c) => c !== 'other'), tapped];
    });
  };

  // ── Photo handlers ────────────────────────────────────────────────────
  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) { setPhotoFile(file); setPhoto({ uri: URL.createObjectURL(file) }); }
      };
      input.click(); return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền thư viện ảnh');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền camera');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── Location ──────────────────────────────────────────────────────────
  const getLocation = async () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); showNotification('Thành công', 'Đã lấy được vị trí!'); },
          () => { setLocation({ latitude: 10.7769, longitude: 106.7009 }); showNotification('Vị trí mặc định', 'Dùng vị trí mặc định TP.HCM'); }
        );
      } else {
        setLocation({ latitude: 10.7769, longitude: 106.7009 });
      }
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return showNotification('Lỗi', 'Không có quyền vị trí');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  // ── OTP: Send ─────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const contact = guestPhone.trim() || guestEmail.trim();
    if (!contact) {
      return showNotification('Lỗi ❌', 'Vui lòng nhập số điện thoại hoặc email trước khi gửi mã.');
    }
    setOtpSending(true);
    try {
      const res = await sendOtp(contact);
      setOtpContact(contact);
      setOtpSent(true);
      // In dev the backend returns devCode — show it so tester can see it
      const devHint = res.data.devCode ? `\n\n[DEV] Mã của bạn: ${res.data.devCode}` : '';
      showNotification('📨 Mã đã gửi', `Mã xác minh đã được gửi đến: ${contact}${devHint}`);
    } catch (err) {
      showNotification('Lỗi', err.response?.data?.message || 'Không thể gửi mã. Thử lại.');
    } finally {
      setOtpSending(false);
    }
  };

  // ── OTP: Verify ───────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return showNotification('Lỗi ❌', 'Vui lòng nhập mã xác minh.');
    setOtpVerifying(true);
    try {
      await verifyOtp(otpContact, otpCode.trim());
      setIsVerified(true);
      showNotification('✅ Xác minh thành công', 'Bạn có thể gửi báo cáo ngay bây giờ!');
    } catch (err) {
      showNotification('Lỗi ❌', err.response?.data?.message || 'Mã không đúng hoặc đã hết hạn.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photo)
      return showNotification('Lỗi ❌', 'Vui lòng chọn hoặc chụp ảnh rác!');
    if (selectedCategories.length === 0)
      return showNotification('Lỗi ❌', 'Vui lòng chọn ít nhất một loại rác!');
    if (!location)
      return showNotification('Lỗi 📍', 'Vui lòng lấy vị trí GPS!');

    // Guest-specific validation
    if (isGuest) {
      if (!guestName.trim())
        return showNotification('Lỗi ❌', 'Vui lòng nhập họ tên của bạn.');
      if (!guestPhone.trim() && !guestEmail.trim())
        return showNotification('Lỗi ❌', 'Vui lòng nhập số điện thoại hoặc email.');
      if (!isVerified)
        return showNotification('Lỗi 🔒', 'Vui lòng xác minh OTP trước khi gửi báo cáo.');
    }

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

      fd.append('wasteCategory', selectedCategories.join(','));
      fd.append('latitude', String(location.latitude));
      fd.append('longitude', String(location.longitude));
      fd.append('description', description);

      if (isGuest) {
        fd.append('guestName', guestName.trim());
        fd.append('guestPhone', guestPhone.trim());
        fd.append('guestEmail', guestEmail.trim());
        fd.append('isVerified', 'true');
        await submitGuestReport(fd);
      } else {
        await submitReport(fd);
      }

      showNotification(
        'Thành công! 🎉',
        'Báo cáo của bạn đã được gửi. AI đang phân tích, kết quả sẽ có trong vài giây!',
        () => navigation.goBack()
      );
    } catch (err) {
      showNotification('Lỗi gửi báo cáo', err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit button enabled logic ───────────────────────────────────────
  const canSubmit = isGuest ? isVerified : true;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>New Waste Report</Text>

      {/* ── Guest banner ── */}
      {isGuest && (
        <View style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>
            👤 You're submitting as a Guest. Please fill in your contact info and verify your identity below.
          </Text>
        </View>
      )}

      {/* ── Photo ── */}
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
        {selectedCategories.length > 0 && (
          <Text style={styles.selectionHint}>
            Selected: {selectedCategories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
          </Text>
        )}
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const selected = selectedCategories.includes(c);
            const isOtherLocked = c === 'other' && selectedCategories.some((s) => MULTI_SELECTABLE.includes(s));
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, selected && styles.catChipActive, isOtherLocked && styles.catChipLocked]}
                onPress={() => handleCategoryToggle(c)}
                activeOpacity={0.75}
              >
                {selected && (
                  <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
                )}
                <Text style={styles.catIcon}>{CATEGORY_ICONS[c]}</Text>
                <Text style={[styles.catLabel, selected && { color: COLORS.white }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* ── Location ── */}
      <Card>
        <Text style={styles.sectionLabel}>📍 Location</Text>
        {location ? (
          <Text style={styles.locText}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} ✅</Text>
        ) : (
          <Text style={styles.locText}>No location captured yet</Text>
        )}
        <Button
          title={location ? '📍 Recapture Location' : '📍 Capture My Location'}
          onPress={getLocation} color={COLORS.info} style={{ marginTop: 8 }}
        />
      </Card>

      {/* ── Description ── */}
      <Card>
        <Text style={styles.sectionLabel}>📝 Description (optional)</Text>
        <Input
          value={description} onChangeText={setDescription}
          placeholder="Describe the waste situation..."
          multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }}
        />
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          GUEST-ONLY SECTION — contact info + OTP verification
          ════════════════════════════════════════════════════════════════ */}
      {isGuest && (
        <>
          {/* Contact info */}
          <Card>
            <Text style={styles.sectionLabel}>👤 Your Contact Info</Text>
            <Text style={styles.fieldHint}>Required so our team can follow up on your report.</Text>

            <Input
              label="Full Name *"
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Nguyen Van A"
              autoCapitalize="words"
            />
            <Input
              label="Phone Number (optional)"
              value={guestPhone}
              onChangeText={(t) => { setGuestPhone(t); setOtpSent(false); setIsVerified(false); }}
              placeholder="0901234567"
              keyboardType="phone-pad"
            />
            <Input
              label="Email (optional)"
              value={guestEmail}
              onChangeText={(t) => { setGuestEmail(t); setOtpSent(false); setIsVerified(false); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.fieldNote}>* At least one of phone or email is required.</Text>
          </Card>

          {/* OTP Verification */}
          <Card style={isVerified ? styles.verifiedCard : {}}>
            <Text style={styles.sectionLabel}>🔐 Verification</Text>

            {isVerified ? (
              /* ── Verified state ── */
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedIcon}>✅</Text>
                <View>
                  <Text style={styles.verifiedTitle}>Identity Verified</Text>
                  <Text style={styles.verifiedSub}>You can now submit your report.</Text>
                </View>
              </View>
            ) : (
              /* ── Not yet verified ── */
              <>
                <Text style={styles.fieldHint}>
                  We'll send a 6-digit code to your phone or email to confirm your identity.
                </Text>

                {/* Send OTP button */}
                <TouchableOpacity
                  style={[styles.otpSendBtn, otpSending && styles.otpSendBtnDisabled]}
                  onPress={handleSendOtp}
                  disabled={otpSending}
                >
                  {otpSending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.otpSendBtnText}>
                      {otpSent ? '🔄 Resend Code' : '📨 Send Verification Code'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* OTP input — shown after send */}
                {otpSent && (
                  <View style={styles.otpInputRow}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label={`Enter code sent to: ${otpContact}`}
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder="123456"
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.verifyBtn, otpVerifying && { opacity: 0.6 }]}
                      onPress={handleVerifyOtp}
                      disabled={otpVerifying}
                    >
                      {otpVerifying ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {/* ── Submit button ── */}
      <Button
        title={
          isGuest && !isVerified
            ? '🔒 Verify Identity First'
            : '🚀 Submit Report'
        }
        onPress={canSubmit ? handleSubmit : () =>
          showNotification('🔒 Verification Required', 'Please verify your identity via OTP before submitting.')}
        loading={loading}
        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        color={canSubmit ? COLORS.primary : COLORS.gray}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },

  // Guest notice banner
  guestNotice: {
    backgroundColor: '#fefce8', borderRadius: 10, padding: 12,
    borderLeftWidth: 4, borderLeftColor: COLORS.warning, marginBottom: 4,
  },
  guestNoticeText: { fontSize: 13, color: '#92400e', lineHeight: 19 },

  // Photo
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

  // Category
  sectionLabel: { fontWeight: '700', color: COLORS.dark, marginBottom: 6, fontSize: 14 },
  selectionHint: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: {
    width: '47%', padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.light, borderWidth: 2, borderColor: COLORS.border,
    position: 'relative',
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipLocked: { opacity: 0.45, borderStyle: 'dashed' },
  checkBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 99,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  checkBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  catIcon: { fontSize: 24 },
  catLabel: { marginTop: 4, fontWeight: '600', color: COLORS.dark, fontSize: 13 },

  // Location
  locText: { color: COLORS.gray, fontSize: 13, marginBottom: 4 },

  // Guest contact section
  fieldHint: { fontSize: 12, color: COLORS.gray, marginBottom: 10, lineHeight: 17 },
  fieldNote: { fontSize: 11, color: COLORS.gray, marginTop: 4, fontStyle: 'italic' },

  // OTP
  otpSendBtn: {
    backgroundColor: '#8b5cf6',
    padding: 13, borderRadius: 10, alignItems: 'center', marginBottom: 12,
  },
  otpSendBtnDisabled: { opacity: 0.6 },
  otpSendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  otpInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    padding: 14, borderRadius: 10, alignItems: 'center',
    marginBottom: 6, minWidth: 80,
  },
  verifyBtnText: { color: '#fff', fontWeight: '700' },

  // Verified state
  verifiedCard: { borderWidth: 1.5, borderColor: COLORS.primary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifiedIcon: { fontSize: 32 },
  verifiedTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  verifiedSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  // Submit
  submitBtn: { marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
});
