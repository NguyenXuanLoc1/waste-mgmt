import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Modal, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS } from '../../components/UI';

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry, error }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={error ? { borderColor: COLORS.danger, borderWidth: 1 } : {}}
      />
      {error ? <Text style={fieldStyles.error}>⚠ {error}</Text> : null}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  error: { color: COLORS.danger, fontSize: 12, marginTop: -6, marginBottom: 8, paddingHorizontal: 2 },
});

function ErrorModal({ visible, message, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={mStyles.overlay}>
        <View style={mStyles.card}>
          <Text style={mStyles.icon}>❌</Text>
          <Text style={[mStyles.title, { color: COLORS.danger }]}>Registration Failed</Text>
          <Text style={mStyles.body}>{message}</Text>
          <TouchableOpacity style={[mStyles.btn, { backgroundColor: COLORS.danger }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={mStyles.btnText}>Close</Text>
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({ name: '', email: '', password: '' });
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });

  // ── Xóa lỗi khi user gõ lại ──────────────────────────────────────────
  const clearError = (field) => setErrors(prev => ({ ...prev, [field]: '' }));

  const validate = () => {
    const e = { name: '', email: '', password: '' };
    let valid = true;

    // Case: tất cả field trống
    if (!name.trim() && !email.trim() && !password) {
      e.name = 'Please fill in all fields';
      e.email = ' ';
      e.password = ' ';
      setErrors(e);
      return false;
    }

    if (!name.trim())                         { e.name     = 'Please enter your full name';             valid = false; }
    else if (name.trim().length < 2)          { e.name     = 'Name must be at least 2 characters';      valid = false; }
    if (!email.trim())                        { e.email    = 'Please enter your email';                 valid = false; }
    else if (!EMAIL_REGEX.test(email.trim())) { e.email    = 'Please enter a valid email address';      valid = false; }
    if (!password.trim())                     { e.password = 'Please enter a password';                 valid = false; }
    else if (password.length < 6)             { e.password = 'Password must be at least 6 characters'; valid = false; }

    setErrors(e);
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setErrorModal({
        visible: true,
        message: msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('already')
          ? 'This email is already registered. Please use a different email or login.'
          : 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the waste reporting community</Text>
      </View>

      <Field
        label="Full Name"
        value={name}
        onChangeText={(v) => { setName(v); clearError('name'); }}
        placeholder="John Doe"
        error={errors.name}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={(v) => { setEmail(v); clearError('email'); }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={(v) => { setPassword(v); clearError('password'); }}
        placeholder="Min. 6 characters"
        secureTextEntry
        error={errors.password}
      />

      <Button title="Create Account" onPress={handleRegister} loading={loading} />

      <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>
          Already have an account?{' '}
          <Text style={{ color: COLORS.primary }}>Login</Text>
        </Text>
      </TouchableOpacity>

      <ErrorModal
        visible={errorModal.visible}
        message={errorModal.message}
        onClose={() => setErrorModal({ visible: false, message: '' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.white, padding: 24 },
  header:    { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  logo:      { fontSize: 48 },
  title:     { fontSize: 24, fontWeight: '800', color: COLORS.dark, marginTop: 8 },
  subtitle:  { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  link:      { alignItems: 'center', marginTop: 20 },
  linkText:  { color: COLORS.gray, fontSize: 14 },
});