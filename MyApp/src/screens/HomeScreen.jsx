import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getTransactionHistory } from '../services/authService.js';

const QUICK_ACTIONS = [
  { icon: '💸', label: 'Send', screen: 'P2P' },
   { icon: '📷', label: 'Scan', screen: 'P2P', params: { openScanner: true } },
  { icon: '📊', label: 'History', screen: 'Transactions' },
];

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [recentTx, setRecentTx] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchRecentTx();
    }, [])
  );

  React.useEffect(() => {
    const interval = setInterval(() => refreshUser(), 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentTx = async () => {
    try {
      setTxLoading(true);
      const data = await getTransactionHistory();
      setRecentTx(data.slice(0, 5));
    } catch (e) {
      console.log('TX error:', e);
    } finally {
      setTxLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchRecentTx()]);
    setRefreshing(false);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const balance = user?.bankBalance ? Number(user.bankBalance).toFixed(2) : '0.00';
  const bankLinked = user?.bankLinked;
  const isReceived = (tx) => tx.receiverUniqueId === user?.uniqueUserId;
  const formatTime = (t) => { try { return new Date(t).toLocaleString(); } catch { return t; } };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
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
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardInner}>
            <View style={styles.cardOrb} />
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceCurrency}>GBP </Text>
                  <Text style={styles.balanceAmount}>
                    {balanceVisible ? balance : '••••••'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setBalanceVisible(!balanceVisible)}
              >
                <Text style={styles.eyeIcon}>{balanceVisible ? '👁' : '🙈'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceBottom}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>ZuPay ID</Text>
                <Text style={styles.balanceStatValue}>{user?.uniqueUserId || '—'}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Bank</Text>
                <View style={styles.bankStatusRow}>
                  <View style={[
                    styles.bankDot,
                    { backgroundColor: bankLinked ? colors.success : colors.error }
                  ]} />
                  <Text style={[
                    styles.balanceStatValue,
                    { color: bankLinked ? colors.success : colors.error }
                  ]}>
                    {bankLinked ? 'Linked' : 'Not Linked'}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Status</Text>
                <Text style={[styles.balanceStatValue, { color: colors.success }]}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Link Bank Banner */}
        {!bankLinked && (
          <TouchableOpacity
            style={styles.linkBanner}
            onPress={() => navigation.navigate('LinkBank')}
            activeOpacity={0.85}
          >
            <Text style={styles.linkBannerIcon}>🏦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkBannerTitle}>Link your bank account</Text>
              <Text style={styles.linkBannerSub}>Start sending & receiving money</Text>
            </View>
            <Text style={styles.linkBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionBtn}
              onPress={() => navigation.navigate(action.screen, action.params)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconBox}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {txLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : recentTx.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('P2P')}
            >
              <Text style={styles.emptyBtnText}>Send your first payment →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.txList}>
            {recentTx.map((tx) => {
              const received = isReceived(tx);
              return (
                <View key={tx.transactionId} style={styles.txRow}>
                  <View style={[
                    styles.txIconBox,
                    { backgroundColor: received ? 'rgba(0,229,160,0.1)' : colors.overlay }
                  ]}>
                    <Text style={styles.txIcon}>{received ? '📥' : '📤'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txName}>
                      {received ? `From ${tx.senderUniqueId}` : `To ${tx.receiverUniqueId}`}
                    </Text>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txTime}>{formatTime(tx.time)}</Text>
                  </View>
                  <Text style={[
                    styles.txAmount,
                    { color: received ? colors.success : colors.textPrimary }
                  ]}>
                    {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
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
    position: 'absolute', top: -60, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: colors.primary, opacity: 0.05,
  },
  orb2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: colors.accent, opacity: 0.04,
  },
  scroll: { padding: 24, paddingTop: 16 },
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
  avatarSmallText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  balanceCard: {
    borderRadius: radius.xl, marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 40px rgba(0,212,255,0.12), 8px 8px 20px rgba(0,0,0,0.6)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 14 }),
  },
  balanceCardInner: { backgroundColor: colors.surfaceHigh, padding: 24, borderRadius: radius.xl },
  cardOrb: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.primary, opacity: 0.08,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
  balanceBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  balanceStatValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  balanceStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
  bankStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bankDot: { width: 7, height: 7, borderRadius: 4 },
  linkBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderRadius: radius.lg, padding: 16, gap: 12,
    borderWidth: 1, borderColor: colors.primary, marginBottom: 24,
  },
  linkBannerIcon: { fontSize: 24 },
  linkBannerTitle: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  linkBannerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  linkBannerArrow: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionIconBox: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
    ...(Platform.OS === 'web'
      ? { boxShadow: '6px 6px 12px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.02)' }
      : { shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 }),
  },
  actionIcon: { fontSize: 26 },
  actionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  emptyBtn: {
    backgroundColor: colors.overlay, borderRadius: radius.lg,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.primary,
  },
  emptyBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 14, gap: 12,
    borderWidth: 1, borderColor: colors.border,
    ...(Platform.OS === 'web' ? { boxShadow: neu } : {
      shadowColor: '#000', shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    }),
  },
  txIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  txIcon: { fontSize: 20 },
  txName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  txDesc: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  txTime: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
});