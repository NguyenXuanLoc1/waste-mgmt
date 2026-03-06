import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, COLORS } from '../../components/UI';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password)
      return Alert.alert('Error', 'All fields are required');
    if (password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.message || 'Try again');
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

      <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
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
        placeholder="Min. 6 characters"
        secureTextEntry
      />
      <Button title="Create Account" onPress={handleRegister} loading={loading} />

      <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={{ color: COLORS.primary }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.white, padding: 24 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  logo: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.dark, marginTop: 8 },
  subtitle: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: COLORS.gray, fontSize: 14 },
});
