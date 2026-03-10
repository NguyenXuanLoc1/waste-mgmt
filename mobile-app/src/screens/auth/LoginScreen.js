import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../components/UI';
import { seedUsers } from '../../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && error.trim() ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
      {error && error.trim() ? (
        <Text style={styles.errorText}>⚠ {error}</Text>
      ) : null}
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [seedMsg, setSeedMsg]   = useState('');

  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e = { email: '', password: '' };
    let valid = true;

    if (!email.trim() && !password) {
      e.email    = 'Please enter your email and password';
      e.password = ' ';
      valid = false;
    } else {
      if (!email.trim()) {
        e.email = 'Please enter your email'; valid = false;
      } else if (!EMAIL_REGEX.test(email.trim())) {
        e.email = 'Please enter a valid email address'; valid = false;
      }

      if (!password) {
        e.password = 'Please enter a password'; valid = false;
      } else if (password.length < 6) {
        e.password = 'Password must be at least 6 characters'; valid = false;
      }
    }

    setErrors(e);
    return valid;
  };

  const handleLogin = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await seedUsers();
      setSeedMsg('✅ Created: admin@waste.com / admin123 · collector@waste.com / collector123');
    } catch {
      setSeedMsg('ℹ️ Demo users already exist');
    }
    setTimeout(() => setSeedMsg(''), 5000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.title}>WasteMgmt</Text>
        <Text style={styles.subtitle}>Smart waste reporting platform</Text>
      </View>

      <View style={styles.form}>
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

        {serverError ? (
          <View style={styles.serverErrorBox}>
            <Text style={styles.serverErrorText}>⚠ {serverError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Login</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={{ color: COLORS.primary }}>Register</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.seedBtn} onPress={handleSeed}>
          <Text style={styles.seedText}>🔧 Seed demo users (dev only)</Text>
        </TouchableOpacity>

        {seedMsg ? (
          <View style={styles.seedMsgBox}>
            <Text style={styles.seedMsgText}>{seedMsg}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: COLORS.white, padding: 24 },
  header:     { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  logo:       { fontSize: 64 },
  title:      { fontSize: 28, fontWeight: '800', color: COLORS.dark, marginTop: 8 },
  subtitle:   { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  form:       { flex: 1 },

  fieldWrap:  { marginBottom: 16 },
  label:      { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  errorText:  { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },

  serverErrorBox: {
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  serverErrorText: { color: COLORS.danger, fontSize: 13 },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  link:       { alignItems: 'center', marginTop: 16 },
  linkText:   { color: COLORS.gray, fontSize: 14 },

  seedBtn:    { alignItems: 'center', marginTop: 32, padding: 12 },
  seedText:   { color: COLORS.gray, fontSize: 12 },

  seedMsgBox: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  seedMsgText: { color: COLORS.primary, fontSize: 12, textAlign: 'center' },
});
