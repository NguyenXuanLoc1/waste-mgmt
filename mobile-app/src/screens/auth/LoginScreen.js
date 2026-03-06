import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, TouchableOpacity, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS } from '../../components/UI';
import { seedUsers } from '../../services/api';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.message || 'Check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      await seedUsers();
      Alert.alert('✅ Demo users created', 'admin@waste.com / admin123\ncollector@waste.com / collector123');
    } catch {
      Alert.alert('Seed', 'Users may already exist');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.title}>WasteMgmt</Text>
        <Text style={styles.subtitle}>Smart waste reporting platform</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />
        <Button title="Login" onPress={handleLogin} loading={loading} />

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
      </View>
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
  seedBtn: { alignItems: 'center', marginTop: 32, padding: 12 },
  seedText: { color: COLORS.gray, fontSize: 12 },
});
