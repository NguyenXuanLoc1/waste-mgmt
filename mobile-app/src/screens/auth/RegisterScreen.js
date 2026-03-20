import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../components/UI';

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

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({ name: '', email: '', password: '' });
  const [serverError, setServerError] = useState('');

  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e = { name: '', email: '', password: '' };
    let valid = true;

    if (!name.trim() && !email.trim() && !password) {
      e.name     = 'Please fill in all fields';
      e.email    = ' ';
      e.password = ' ';
      valid = false;
    } else {
      if (!name.trim()) {
        e.name = 'Please enter your full name'; valid = false;
      } else if (name.trim().length < 2) {
        e.name = 'Name must be at least 2 characters'; valid = false;
      }

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

  const handleRegister = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setServerError(
        msg.toLowerCase().includes('already')
          ? 'This email is already registered'
          : 'Registration failed. Please try again'
      );
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

      {serverError ? (
        <View style={styles.serverErrorBox}>
          <Text style={styles.serverErrorText}>⚠ {serverError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Create Account</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={{ color: COLORS.primary }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flexGrow: 1, backgroundColor: COLORS.white, padding: 24 },
  header:      { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  logo:        { fontSize: 48 },
  title:       { fontSize: 24, fontWeight: '800', color: COLORS.dark, marginTop: 8 },
  subtitle:    { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  fieldWrap:   { marginBottom: 16 },
  label:       { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginBottom: 6 },
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
  inputError:  { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
  errorText:   { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },

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
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  link:        { alignItems: 'center', marginTop: 20 },
  linkText:    { color: COLORS.gray, fontSize: 14 },
});
