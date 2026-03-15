import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { colors, radius } from '../theme/theme.js';
import { loginUser } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

 const handleLogin = async () => {
  setError('');
  if (!form.username || !form.password) {
    setError('Please fill in all fields.');
    return;
  }
  try {
    setLoading(true);
    const data = await loginUser({ username: form.username, password: form.password });
    login(data.token, {
      name: data.name,
      uniqueUserId: data.uniqueUserId,
      qrCode: data.qrCode,
      bankLinked: data.bankLinked,
      bankBalance: data.bankBalance,
    });
  } catch (err) {
    setError(err.response?.data?.message || err.message || 'Login failed.');
  } finally {
    setLoading(false);
  }
};
  const neu = Platform.OS === 'web'
    ? '6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.02)'
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>👋</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your ZuPay account</Text>
        </View>

        <View style={[styles.card, Platform.OS === 'web' && { boxShadow: neu }]}>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>🆔</Text>
              <TextInput
                style={styles.input}
                value={form.username}
                onChangeText={set('username')}
                placeholder="Enter your username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={set('password')}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.loginBtnText}>Sign In →</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerBtnText}>Create New Account</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.footer}>🔒 Your data is encrypted with 256-bit SSL</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  orb1: {
    position: 'absolute', top: -80, right: -60,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.primary, opacity: 0.06,
  },
  orb2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.accent, opacity: 0.05,
  },
  scroll: { padding: 24, paddingBottom: 60 },
  backBtn: { marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 32, gap: 10 },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  iconText: { fontSize: 32 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: 24,
    borderWidth: 1, borderColor: colors.border, gap: 16,
  },
  inputGroup: { gap: 8 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  errorBox: {
    backgroundColor: 'rgba(255,77,109,0.1)',
    borderRadius: radius.md, padding: 12,
    borderWidth: 1, borderColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: 13 },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {}
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  loginBtnText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  registerBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
  },
  registerBtnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24 },
});