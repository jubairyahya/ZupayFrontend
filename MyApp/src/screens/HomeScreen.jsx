import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { radius } from '../theme/theme.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const QUICK_ACTIONS = [
  { icon: '💸', label: 'Send', screen: 'P2P', params: {} },
  { icon: '📷', label: 'Scan', screen: 'P2P', params: { openScanner: true } },
  { icon: '📊', label: 'History', screen: 'Transactions', params: {} },
];

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { isDark, colors } = useTheme();
  const s = makeStyles(colors, isDark);

  const [balanceVisible, setBalanceVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  React.useEffect(() => {
    const interval = setInterval(() => refreshUser(), 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const balance = user?.bankBalance ? Number(user.bankBalance).toFixed(2) : '0.00';
  const bankLinked = user?.bankLinked;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={s.orb1} />
      <View style={s.orb2} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Bar */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Hello there,</Text>
            <Text style={s.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={s.avatarSmall}>
              <Text style={s.avatarSmallText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceCardInner}>
            <View style={s.cardOrb} />
            <View style={s.balanceTop}>
              <View>
                <Text style={s.balanceLabel}>Total Balance</Text>
                <View style={s.balanceRow}>
                  <Text style={s.balanceCurrency}>GBP </Text>
                  <Text style={s.balanceAmount}>
                    {balanceVisible ? balance : '••••••'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setBalanceVisible(!balanceVisible)}
              >
                <Text style={s.eyeIcon}>{balanceVisible ? '👁' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.balanceDivider} />

            <View style={s.balanceBottom}>
              <View style={s.balanceStat}>
                <Text style={s.balanceStatLabel}>ZuPay ID</Text>
                <Text style={s.balanceStatValue}>{user?.uniqueUserId || '—'}</Text>
              </View>
              <View style={s.balanceStatDivider} />
              <View style={s.balanceStat}>
                <Text style={s.balanceStatLabel}>Bank</Text>
                <View style={s.bankStatusRow}>
                  <View style={[
                    s.bankDot,
                    { backgroundColor: bankLinked ? colors.success : colors.error }
                  ]} />
                  <Text style={[
                    s.balanceStatValue,
                    { color: bankLinked ? colors.success : colors.error }
                  ]}>
                    {bankLinked ? 'Linked' : 'Not Linked'}
                  </Text>
                </View>
              </View>
              <View style={s.balanceStatDivider} />
              <View style={s.balanceStat}>
                <Text style={s.balanceStatLabel}>Status</Text>
                <Text style={[s.balanceStatValue, { color: colors.success }]}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Link Bank Banner */}
        {!bankLinked && (
          <TouchableOpacity
            style={s.linkBanner}
            onPress={() => navigation.navigate('LinkBank')}
            activeOpacity={0.85}
          >
            <Text style={s.linkBannerIcon}>🏦</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.linkBannerTitle}>Link your bank account</Text>
              <Text style={s.linkBannerSub}>Start sending & receiving money</Text>
            </View>
            <Text style={s.linkBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Bills Section */}
        <View style={s.billsSection}>
          <View style={s.billsSectionHeader}>
            <View>
              <Text style={s.billsSectionTitle}>Pay Bills</Text>
              <Text style={s.billsSectionSub}>Council tax, fines, energy & water</Text>
            </View>
            <TouchableOpacity
              style={s.billsSeeAll}
              onPress={() => navigation.navigate('Bills')}
            >
              <Text style={s.billsSeeAllText}>All →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.billsGrid}>
            {[
              { key: 'COUNCIL_TAX', icon: '🏛️', label: 'Council Tax', color: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.3)' },
              { key: 'FINE',        icon: '⚖️',  label: 'Fines',       color: 'rgba(255,77,109,0.10)', border: 'rgba(255,77,109,0.3)' },
              { key: 'ENERGY',      icon: '⚡',  label: 'Energy',      color: 'rgba(255,200,0,0.10)',  border: 'rgba(255,200,0,0.3)' },
              { key: 'WATER',       icon: '💧',  label: 'Water',       color: 'rgba(0,229,160,0.10)',  border: 'rgba(0,229,160,0.3)' },
            ].map((bill) => (
              <TouchableOpacity
                key={bill.key}
                style={[s.billShortcut, { backgroundColor: bill.color, borderColor: bill.border }]}
                onPress={() => navigation.navigate('Bills', { category: bill.key })}
                activeOpacity={0.8}
              >
                <Text style={s.billShortcutIcon}>{bill.icon}</Text>
                <Text style={s.billShortcutLabel}>{bill.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom  Bar */}
      <View style={s.bottomBar}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={s.bottomBtn}
            onPress={() => navigation.navigate(action.screen, action.params)}
            activeOpacity={0.7}
          >
            <Text style={s.bottomIcon}>{action.icon}</Text>
            <Text style={s.bottomLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}


// Styles 

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1 },

  // Decorative orbs 
  orb1: {
    position: 'absolute', top: -60, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: colors.primary, opacity: isDark ? 0.05 : 0.07,
  },
  orb2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: colors.accent, opacity: isDark ? 0.04 : 0.06,
  },

  scroll: { padding: 24, paddingTop: 16 },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  greeting: { color: colors.textMuted, fontSize: 14 },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  avatarBtn: { width: 44, height: 44, borderRadius: 22 },
  avatarSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primaryLight,
  },
  avatarSmallText: { color: colors.bg, fontSize: 18, fontWeight: '800' },

  // Balance card
  balanceCard: {
    borderRadius: radius.xl, marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 40px ${colors.primary}1F, 8px 8px 20px rgba(0,0,0,${isDark ? 0.6 : 0.1})` }
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.15 : 0.08,
          shadowRadius: 20,
          elevation: 10,
        }),
  },
  balanceCardInner: {
    backgroundColor: colors.surfaceHigh,
    padding: 24,
    borderRadius: radius.xl,
  },
  cardOrb: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.primary, opacity: isDark ? 0.08 : 0.06,
  },
  balanceTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  balanceLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  balanceCurrency: { color: colors.textSecondary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  balanceAmount: { color: colors.textPrimary, fontSize: 40, fontWeight: '900', lineHeight: 46 },
  eyeBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  eyeIcon: { fontSize: 18 },
  balanceDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  balanceBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  balanceStatValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  balanceStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
  bankStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bankDot: { width: 7, height: 7, borderRadius: 4 },

  // Link bank banner
  linkBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radius.lg, padding: 16, gap: 12,
    borderWidth: 1, borderColor: colors.primary, marginBottom: 24,
  },
  linkBannerIcon: { fontSize: 24 },
  linkBannerTitle: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  linkBannerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  linkBannerArrow: { color: colors.primary, fontSize: 18, fontWeight: '700' },

  // Bills section
  billsSection: { marginBottom: 8 },
  billsSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  billsSectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  billsSectionSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  billsSeeAll: {
    backgroundColor: colors.overlay, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  billsSeeAllText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  billsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  billShortcut: {
    width: '47.5%', borderRadius: radius.lg,
    paddingVertical: 16, paddingHorizontal: 16,
    borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  billShortcutIcon: { fontSize: 22 },
  billShortcutLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },

  // Bottom  bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingVertical: 12, paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    gap: 8,
  },
  bottomBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  bottomIcon: { fontSize: 24 },
  bottomLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
});