import React, { useState } from 'react';
import {
<<<<<<< HEAD
  View, Text, StyleSheet, ScrollView, Alert,
  Image, TouchableOpacity, Platform, ActivityIndicator,
=======
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, Platform, Modal, ActivityIndicator,
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitReport, submitGuestReport, sendOtp, verifyOtp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS, Card } from '../../components/UI';

const CATEGORIES = ['organic', 'recyclable', 'hazardous', 'other'];
const CATEGORY_ICONS = { organic: '🌿', recyclable: '♻️', hazardous: '☢️', other: '🗑️' };
<<<<<<< HEAD
const MULTI_SELECTABLE = ['organic', 'recyclable', 'hazardous'];

const showNotification = (title, message, onOk = null) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};
=======

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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function SubmitReportScreen({ navigation }) {
<<<<<<< HEAD
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
=======
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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
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
<<<<<<< HEAD
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền thư viện ảnh');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [4, 3] });
=======
    if (!perm.granted) return showErr('Gallery permission is required.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') { pickPhoto(); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
<<<<<<< HEAD
    if (!perm.granted) return showNotification('Lỗi', 'Cần cấp quyền camera');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── Location ──────────────────────────────────────────────────────────
=======
    if (!perm.granted) return showErr('Camera permission is required.');
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── Location ─────────────────────────────────────────────────────────────
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
  const getLocation = async () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
<<<<<<< HEAD
          (pos) => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); showNotification('Thành công', 'Đã lấy được vị trí!'); },
          () => { setLocation({ latitude: 10.7769, longitude: 106.7009 }); showNotification('Vị trí mặc định', 'Dùng vị trí mặc định TP.HCM'); }
=======
          (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          ()    => setLocation({ latitude: 10.7769, longitude: 106.7009 })
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
        );
      } else {
        setLocation({ latitude: 10.7769, longitude: 106.7009 });
      }
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
<<<<<<< HEAD
    if (status !== 'granted') return showNotification('Lỗi', 'Không có quyền vị trí');
=======
    if (status !== 'granted') return showErr('Location permission is required.');
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

<<<<<<< HEAD
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
=======
  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photo)    return showErr('Please select or take a photo.');
    if (!category) return showErr('Please select a waste category.');
    if (!location) return showErr('Please capture your GPS location.');
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a

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
<<<<<<< HEAD

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
=======
      fd.append('wasteCategory', category);
      fd.append('latitude',    String(location.latitude));
      fd.append('longitude',   String(location.longitude));
      fd.append('description', description);

      await submitReport(fd);
      setShowSuccess(true);
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
    } catch (err) {
      showErr(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  // ── Submit button enabled logic ───────────────────────────────────────
  const canSubmit = isGuest ? isVerified : true;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
=======
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>New Waste Report</Text>

<<<<<<< HEAD
      {/* ── Guest banner ── */}
      {isGuest && (
        <View style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>
            👤 You're submitting as a Guest. Please fill in your contact info and verify your identity below.
          </Text>
        </View>
      )}

      {/* ── Photo ── */}
=======
      {/* ── Photo Section ── */}
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
        </View>
      </Card>

      {/* ── Location ── */}
      <Card>
        <Text style={styles.sectionLabel}>📍 Location</Text>
        {location ? (
<<<<<<< HEAD
          <Text style={styles.locText}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} ✅</Text>
=======
          <View style={styles.locBadge}>
            <Text style={styles.locBadgeText}>
              ✅ {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
          </View>
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
        ) : (
          <Text style={styles.locEmpty}>No location captured yet</Text>
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
      />
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
  photoPlaceholder: {
    width: '100%', height: 200, borderRadius: 10,
    backgroundColor: COLORS.light, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  placeholderIcon: { fontSize: 36, marginBottom: 8 },
  placeholderText: { color: COLORS.dark, fontWeight: '600', fontSize: 14 },
  placeholderSub:  { color: COLORS.gray, fontSize: 12, marginTop: 4 },

<<<<<<< HEAD
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
=======
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
>>>>>>> 806cede266f41d1f806fba0cd09293974fcf847a
});
