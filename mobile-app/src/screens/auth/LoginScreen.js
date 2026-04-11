import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, TouchableOpacity, TextInput
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
// Loại bỏ Input vì mình sẽ tự build UI cho field, giữ lại Button và COLORS
import { Button, COLORS } from '../../components/UI';
import { seedUsers } from '../../services/api';

// ── Field component tự build UI chuẩn giống Hình 2 & Có tính năng xem mật khẩu ──
function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry, error }) {
  // Trạng thái bật/tắt hiển thị mật khẩu (mặc định sẽ theo prop secureTextEntry truyền vào)
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Label */}
      <Text style={fieldStyles.label}>{label}</Text>
      
      {/* Khung Input */}
      <View style={[fieldStyles.inputContainer, error ? fieldStyles.inputError : null]}>
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={isSecure}
          placeholderTextColor="#94a3b8"
        />
        
        {/* Nút con mắt chỉ hiện khi đây là trường nhập mật khẩu */}
        {secureTextEntry && (
          <TouchableOpacity 
            style={fieldStyles.eyeBtn} 
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            <Text style={fieldStyles.eyeIcon}>{isSecure ? '🐵' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dòng báo lỗi */}
      {error ? <Text style={fieldStyles.error}>⚠ {error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.dark || '#0f172a', 
    marginBottom: 6,
    marginLeft: 2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputError: { 
    borderColor: COLORS.danger, 
    backgroundColor: '#fff5f5' 
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark || '#0f172a',
    paddingVertical: 12, // Đảm bảo text không bị cắt trên Android
    outlineStyle: 'none',
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  error: { 
    color: COLORS.danger, 
    fontSize: 12, 
    marginTop: 6, 
    paddingHorizontal: 4 
  },
});

// ── Shared modal components ───────────────────────────────────────────────────
function InfoModal({ visible, icon, title, titleColor, body, btnColor, btnLabel, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={mStyles.overlay}>
        <View style={mStyles.card}>
          <Text style={mStyles.icon}>{icon}</Text>
          <Text style={[mStyles.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
          <Text style={mStyles.body}>{body}</Text>
          <TouchableOpacity style={[mStyles.btn, btnColor ? { backgroundColor: btnColor } : null]} onPress={onClose} activeOpacity={0.85}>
            <Text style={mStyles.btnText}>{btnLabel || 'OK'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  icon:    { fontSize: 52, marginBottom: 12 },
  title:   { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  body:    { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { login, loginAsGuest } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  // Inline field errors
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Modals
  const [errorModal, setErrorModal]   = useState({ visible: false, message: '' });
  const [seedModal, setSeedModal]     = useState({ visible: false, success: false, message: '' });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const e = { email: '', password: '' };
    let valid = true;
    if (!email.trim() && !password.trim()) {
      e.email = 'Please enter your email and password'; valid = false;
    } else {
      if (!email.trim())                        { e.email    = 'Please enter your email address';       valid = false; }
      else if (!EMAIL_REGEX.test(email.trim())) { e.email    = 'Please enter a valid email address';    valid = false; }
      if (!password.trim())                     { e.password = 'Please enter your password';            valid = false; }
      else if (password.length < 6)             { e.password = 'Password must be at least 6 characters'; valid = false; }
    }
    setErrors(e);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorModal({ visible: true, message: err.response?.data?.message || 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await seedUsers();
      setSeedModal({ visible: true, success: true, message: 'admin@waste.com / admin123\ncollector@waste.com / collector123' });
    } catch {
      setSeedModal({ visible: true, success: false, message: 'Users may already exist' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Logo / hero ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.title}>WasteMgmt</Text>
        <Text style={styles.subtitle}>Smart waste reporting platform</Text>
      </View>

      {/* ── Login form ── */}
      <View style={styles.form}>
        <Field
          label="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        
        <Field
          label="Password"
          value={password}
          onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
          placeholder="••••••••"
          secureTextEntry={true} // Bắt buộc truyền true để component biết đây là ô mật khẩu và hiện nút mắt
          error={errors.password}
        />
        
        <View style={{ marginTop: 8 }}>
          <Button title="Login" onPress={handleLogin} loading={loading} />
        </View>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={{ color: COLORS.primary }}>Register</Text>
          </Text>
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Guest button ── */}
        <TouchableOpacity style={styles.guestBtn} onPress={loginAsGuest} activeOpacity={0.8}>
          <Text style={styles.guestIcon}>👤</Text>
          <View>
            <Text style={styles.guestTitle}>Continue as Guest</Text>
            <Text style={styles.guestSub}>Browse without an account</Text>
          </View>
          <Text style={styles.guestArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.seedBtn} onPress={handleSeed}>
          <Text style={styles.seedText}>🔧 Seed demo users (dev only)</Text>
        </TouchableOpacity>
      </View>

      {/* ── Error modal ── */}
      <InfoModal
        visible={errorModal.visible}
        icon="❌"
        title="Login Failed"
        titleColor={COLORS.danger}
        body={errorModal.message}
        btnColor={COLORS.danger}
        btnLabel="Close"
        onClose={() => setErrorModal({ visible: false, message: '' })}
      />

      {/* ── Seed modal ── */}
      <InfoModal
        visible={seedModal.visible}
        icon={seedModal.success ? '✅' : 'ℹ️'}
        title={seedModal.success ? 'Demo Users Created' : 'Seed Info'}
        body={seedModal.message}
        onClose={() => setSeedModal({ visible: false, success: false, message: '' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.white, padding: 24 },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  logo: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.dark, marginTop: 8 },
  subtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  form: { flex: 1 },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: COLORS.gray, fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.gray, fontSize: 13 },
  guestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, backgroundColor: COLORS.light,
  },
  guestIcon: { fontSize: 28 },
  guestTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  guestSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  guestArrow: { marginLeft: 'auto', fontSize: 22, color: COLORS.gray },
  seedBtn: { alignItems: 'center', marginTop: 32, padding: 12 },
  seedText: { color: COLORS.gray, fontSize: 12 },
});