import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Platform,
} from 'react-native';
import { colors, radius } from '../theme/theme.js';

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <Animated.View style={[
        styles.content,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}>

        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>Zu</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.appName}>ZuPay</Text>
        <Text style={styles.tagline}>The future of digital payments</Text>

        <View style={styles.pills}>
          {[' Instant', ' Secure', ' Premium'].map((pill) => (
            <View key={pill} style={styles.pill}>
              <Text style={styles.pillText}>{pill}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          {[
            { value: '< 1s', label: 'Transfer' },
            { value: '24/7', label: 'Support' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Bank-grade security · Zero fees · Instant transfers
        </Text>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  orb1: {
    position: 'absolute', top: -100, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: colors.primary, opacity: 0.06,
  },
  orb2: {
    position: 'absolute', bottom: -80, right: -60,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.accent, opacity: 0.05,
  },
  content: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 20,
  },
  logoWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoOuter: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
    ...(Platform.OS === 'web'
      ? { boxShadow: '8px 8px 16px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,255,0.2)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }),
  },
  logoInner: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 38, fontWeight: '900' },
  appName: { color: colors.textPrimary, fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.textSecondary, fontSize: 16, letterSpacing: 1, marginTop: -12 },
  pills: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  pillText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statValue: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  buttons: { width: '100%', gap: 12 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 18,
    alignItems: 'center', width: '100%',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 20px rgba(0,212,255,0.3), 6px 6px 14px rgba(0,0,0,0.5)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  primaryBtnText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, paddingVertical: 18,
    alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 },
});