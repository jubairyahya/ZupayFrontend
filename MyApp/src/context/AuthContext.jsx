import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import api, { setAuthToken } from '../services/api.js';
import { API_URLS } from '../services/api.js';

const AuthContext = createContext();

const save = (key, value) => {
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  }
};

const load = (key) => {
  if (Platform.OS === 'web') return localStorage.getItem(key) || null;
  return null;
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = load('zupay_token');
    if (t) setAuthToken(t); // restore token on reload
    return t;
  });
  const [user, setUser] = useState(() => {
    try {
      const u = load('zupay_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    setAuthToken(newToken); // set axios default header
    save('zupay_token', newToken);
    save('zupay_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null); // clear axios header
    save('zupay_token', null);
    save('zupay_user', null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    save('zupay_user', JSON.stringify(updated));
  };

  const refreshUser = async () => {
    try {
      const res = await api.get(API_URLS.AUTH.PROFILE);
      const data = res.data;
      const updated = {
        name: data.name,
        uniqueUserId: data.uniqueUserId,
        qrCode: data.qrCode,
        bankLinked: data.bankLinked,
        bankBalance: data.bankBalance,
      };
      setUser(updated);
      save('zupay_user', JSON.stringify(updated));
    } catch (e) {
      console.log('Refresh error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}