import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { login as apiLogin, register as apiRegister } from '../services/api';

const storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key) => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

// The guest user object — role must be 'citizen' so RoleNavigator
// routes them into the citizen stack, isGuest flag drives UI changes.
const GUEST_USER = {
  id: null,
  name: 'Guest',
  email: null,
  role: 'citizen',
  behaviorScore: null,
  isGuest: true,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on app start (guests are never persisted)
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Never restore a guest from storage — guests always start fresh
          if (!parsed?.isGuest) setUser(parsed);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // ── Normal login ──────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    await storage.setItem('token', data.token);
    await storage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // ── Register ──────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    const { data } = await apiRegister({ name, email, password });
    await storage.setItem('token', data.token);
    await storage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // ── Guest login — no network call, no storage ─────────────────────────
  const loginAsGuest = () => {
    setUser(GUEST_USER);
    // Intentionally do NOT persist guest to storage
  };

  // ── Logout — works for both real users and guests ─────────────────────
  const logout = async () => {
    await storage.deleteItem('token');
    await storage.deleteItem('user');
    setUser(null);
  };

  // ── updateUser — cập nhật user trong state VÀ storage (dùng cho Profile) ──
  const updateUser = async (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    if (!newUser.isGuest) {
      await storage.setItem('user', JSON.stringify(newUser));
    }
  };

  // Convenience boolean readable anywhere in the app
  const isGuest = user?.isGuest === true;

  return (
    <AuthContext.Provider value={{
      user, setUser, updateUser,
      loading, isGuest,
      login, register, loginAsGuest, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);