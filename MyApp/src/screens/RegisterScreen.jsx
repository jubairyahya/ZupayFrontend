import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { colors, radius } from '../theme/theme.js';
import { registerUser } from '../services/authService.js';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    setError('');
    if (!form.name || !form.username || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      const data = await registerUser({
        name: form.name,
        username: form.username,
        password: form.password,
      });
      setSuccess({ uniqueUserId: data.uniqueUserId });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>You're all set!</Text>
          <Text style={styles.successSub}>Welcome to ZuPay</Text>
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>YOUR ZUPAY ID</Text>
            <Text style={styles.idValue}>{success.uniqueUserId}</Text>
            <Text style={styles.idHint}>Share this ID to receive payments</Text>
          </View>
          <View style={styles.featureList}>
            {[
              ' Send & receive money instantly',
              ' Bank-grade JWT security',
              ' Pay bills with one tap',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          >
            <Text style={styles.loginBtnText}>Go to Login →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Register Form ─────────────────────────────────────
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
            <Text style={styles.iconText}>🚀</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join ZuPay in seconds</Text>
        </View>

        <View style={styles.card}>
          {[
            { key: 'name', label: 'Full Name', placeholder: 'John Doe', icon: '👤', secure: false },
            { key: 'username', label: 'Username', placeholder: 'johndoe123', icon: '🆔', secure: false },
            { key: 'password', label: 'Password', placeholder: 'Min 8 chars, A-Z, 0-9, symbol', icon: '🔒', secure: true },
          ].map(({ key, label, placeholder, icon, secure }) => (
            <View key={key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{label}</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>{icon}</Text>
                <TextInput
                  style={styles.input}
                  value={form[key]}
                  onChangeText={set(key)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>Password requirements:</Text>
            <Text style={styles.hintText}>· Uppercase (A-Z)  · Lowercase (a-z)</Text>
            <Text style={styles.hintText}>· Number (0-9)  · Symbol (@#$%^&+=!)</Text>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.registerBtnText}>Create Account →</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}> Your data is safe</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const neu = Platform.OS === 'web'
  ? '6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.02)'
  : null;

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
    ...(Platform.OS === 'web' ? { boxShadow: neu } : {
      shadowColor: '#000', shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
    }),
  },
  iconText: { fontSize: 32 },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: 24,
    borderWidth: 1, borderColor: colors.border, gap: 16,
    ...(Platform.OS === 'web' ? { boxShadow: neu } : {
      shadowColor: '#000', shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
    }),
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
  hintBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  hintTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  hintText: { color: colors.textMuted, fontSize: 12 },
  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 20px rgba(0,212,255,0.3), 6px 6px 14px rgba(0,0,0,0.5)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  registerBtnText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  loginLink: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
  },
  loginLinkText: { color: colors.textMuted, fontSize: 14 },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24 },

  // Success
  successContainer: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 20,
  },
  successIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0,229,160,0.1)',
    borderWidth: 2, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  successIcon: { color: colors.success, fontSize: 48, fontWeight: '800' },
  successTitle: { color: colors.textPrimary, fontSize: 32, fontWeight: '800' },
  successSub: { color: colors.textSecondary, fontSize: 16, marginTop: -12 },
  idCard: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary, gap: 6,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 24px rgba(0,212,255,0.15), 6px 6px 14px rgba(0,0,0,0.5)' }
      : {}),
  },
  idLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  idValue: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  idHint: { color: colors.textMuted, fontSize: 12 },
  featureList: { width: '100%', gap: 10 },
  featureRow: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  featureText: { color: colors.textSecondary, fontSize: 14 },
  loginBtn: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 20px rgba(0,212,255,0.3), 6px 6px 14px rgba(0,0,0,0.5)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  loginBtnText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
});