import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, TextInput, Modal, Alert,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { colors, radius } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logoutUser, linkBankAccount, getTransactionHistory } from '../services/authService.js';

// ── Bills Screen ──────────────────────────────────────────────────
export function BillsScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pay Bills</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 48 }}>🧾</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>Bills Coming Soon</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Backend integration in progress</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Transaction Screen ────────────────────────────────────────────
export function TransactionScreen({ navigation }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Sent', 'Received'];

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactionHistory();
      setTransactions(data);
    } catch (e) {
      console.log('Transaction fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const isReceived = (tx) => tx.receiverUniqueId === user?.uniqueUserId;
  const formatTime = (t) => {
    try { return new Date(t).toLocaleString(); } catch { return t; }
  };

  const filtered = transactions.filter((tx) => {
    if (filter === 'All') return true;
    if (filter === 'Sent') return !isReceived(tx);
    if (filter === 'Received') return isReceived(tx);
    return true;
  });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={fetchTransactions}>
          <Text style={s.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyText}>No transactions found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[s.scroll, { gap: 10 }]}>
          {filtered.map((tx) => {
            const received = isReceived(tx);
            return (
              <View key={tx.transactionId} style={s.txRow}>
                <View style={[
                  s.txIconBox,
                  { backgroundColor: received ? 'rgba(0,229,160,0.1)' : colors.overlay }
                ]}>
                  <Text style={{ fontSize: 18 }}>{received ? '📥' : '📤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txName}>
                    {received ? `From ${tx.senderUniqueId}` : `To ${tx.receiverUniqueId}`}
                  </Text>
                  <Text style={s.txMeta}>{tx.description}</Text>
                  <Text style={s.txMeta}>{formatTime(tx.time)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[
                    s.txAmount,
                    { color: received ? colors.success : colors.textPrimary }
                  ]}>
                    {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
                  </Text>
                  <View style={[
                    s.statusBadge,
                    { backgroundColor: tx.status === 'SUCCESS' ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,109,0.1)' }
                  ]}>
                    <Text style={[
                      s.statusText,
                      { color: tx.status === 'SUCCESS' ? colors.success : colors.error }
                    ]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Profile Screen ────────────────────────────────────────────────
export function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();

  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    logout();
  };

  const INFO_ROWS = [
    { label: 'ZuPay ID', value: user?.uniqueUserId || '—', icon: '🆔' },
    { label: 'Bank Linked', value: user?.bankLinked ? 'Yes ✓' : 'No', icon: '🏦' },
    { label: 'Member Since', value: 'ZuPay Member', icon: '⭐' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={s.profileName}>{user?.name || 'User'}</Text>
          <View style={s.onlineBadge}>
            <Text style={s.onlineBadgeText}>● Active</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          {INFO_ROWS.map((row, i) => (
            <View key={row.label} style={[
              s.infoRow,
              i === INFO_ROWS.length - 1 && { borderBottomWidth: 0 }
            ]}>
              <Text style={s.infoIcon}>{row.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>{row.label}</Text>
                <Text style={s.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* QR Code */}
        <View style={s.qrSection}>
          <Text style={s.qrSectionTitle}>My QR Code</Text>
          <Text style={s.qrSectionSub}>Share to receive payments instantly</Text>
          {user?.qrCode ? (
            <View style={s.qrBox}>
              <Image
                source={{ uri: `data:image/png;base64,${user.qrCode}` }}
                style={s.qrImg}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={s.noQrText}>QR not available</Text>
          )}
          <Text style={s.qrIdText}>{user?.uniqueUserId}</Text>
          <Text style={s.qrHint}>Others can scan this to send you money</Text>
        </View>

        {/* Change PIN */}
        <TouchableOpacity
          style={s.securityBtn}
          onPress={() => navigation.navigate('SetupPin')}
        >
          <Text style={s.securityBtnText}>🔐 Change PIN</Text>
        </TouchableOpacity>

        {/* Link Bank */}
        {user && !user.bankLinked && (
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => navigation.navigate('LinkBank')}
          >
            <Text style={s.linkBtnText}>🏦 Link Bank Account</Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutBtnText}>🚪 Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Link Bank Screen ──────────────────────────────────────────────
export function LinkBankScreen({ navigation }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    sortCode: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLink = async () => {
    if (!form.accountHolderName || !form.accountNumber || !form.sortCode)
      return Alert.alert('Missing Fields', 'Please fill all fields.');
    try {
      setLoading(true);
      const data = await linkBankAccount(form);
      updateUser({ bankLinked: data.bankLinked, bankBalance: data.bankBalance });
      Alert.alert('🏦 Bank Linked!', data.message, [
        { text: 'Great!', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'accountHolderName', label: 'Account Holder Name', placeholder: 'John Doe', keyboard: 'default' },
    { key: 'accountNumber', label: 'Account Number', placeholder: '12345678', keyboard: 'numeric' },
    { key: 'sortCode', label: 'Sort Code', placeholder: '12-34-56', keyboard: 'numeric' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Link Bank</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.infoCard}>
          <Text style={s.cardTitle}>🏦 Connect Your Bank</Text>
          <Text style={s.cardSub}>Link your bank account to fund your ZuPay wallet</Text>

          {fields.map(({ key, label, placeholder, keyboard }) => (
            <View key={key} style={{ marginBottom: 16 }}>
              <Text style={s.inputLabel}>{label}</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={form[key]}
                  onChangeText={set(key)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={keyboard}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.confirmBtn, loading && { opacity: 0.7 }]}
          onPress={handleLink}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.confirmBtnText}>Link Bank Account →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  refreshIcon: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  scroll: { padding: 24, paddingBottom: 60 },

  // Filters
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.bg, fontWeight: '700' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  txIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  txName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  txMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15 },

  // Profile
  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 8 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '800' },
  profileName: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  onlineBadge: {
    backgroundColor: 'rgba(0,229,160,0.1)',
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  onlineBadgeText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border, gap: 12,
  },
  infoIcon: { fontSize: 20 },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 },

  // QR
  qrSection: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: 20, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 8, marginBottom: 16,
  },
  qrSectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  qrSectionSub: { color: colors.textMuted, fontSize: 12 },
  qrBox: {
    width: 200, height: 200, borderRadius: radius.lg,
    backgroundColor: '#fff', padding: 10,
    alignItems: 'center', justifyContent: 'center', marginVertical: 8,
  },
  qrImg: { width: 180, height: 180 },
  noQrText: { color: colors.textMuted, fontSize: 13 },
  qrIdText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  qrHint: { color: colors.textMuted, fontSize: 12 },

  // Buttons
  securityBtn: {
    backgroundColor: colors.overlay, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 12,
  },
  securityBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  linkBtn: {
    backgroundColor: colors.overlay, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary, marginBottom: 12,
  },
  linkBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(255,77,109,0.1)', borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.error,
  },
  logoutBtnText: { color: colors.error, fontSize: 15, fontWeight: '700' },

  // Link Bank
  cardTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: colors.textSecondary, fontSize: 13, marginBottom: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  confirmBtn: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: radius.lg, alignItems: 'center',
  },
  confirmBtnText: { color: colors.bg, fontSize: 17, fontWeight: '700' },
});