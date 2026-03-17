import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, TextInput, Modal, Alert,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { Switch } from 'react-native';
import { colors , radius } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logoutUser, linkBankAccount, getTransactionHistory } from '../services/authService.js';
import { useTheme } from '../context/ThemeContext.jsx';


// Transaction Screen 
export function TransactionScreen({ navigation }) {
  const { user } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'spending'
  const [period, setPeriod] = useState('Monthly');
  const [selectedTx, setSelectedTx] = useState(null);

  const filters = ['All', 'Sent', 'Received'];
  const periods = ['Weekly', 'Monthly', 'Yearly'];

  useEffect(() => { fetchTransactions(); }, []);

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
  const handleSendAgain = (tx) => {
    setSelectedTx(null);
    navigation.navigate('P2P', {
      prefillUserId: tx.receiverUniqueId,
      prefillName: tx.receiverName,
    });
  };


  const filtered = transactions.filter((tx) => {
    if (filter === 'All') return true;
    if (filter === 'Sent') return !isReceived(tx);
    if (filter === 'Received') return isReceived(tx);
    return true;
  });

  //  Spending Analytics Logic 
  const getSpendingData = () => {
    // Only outgoing transactions
    const sent = transactions.filter(tx => !isReceived(tx) && tx.status === 'SUCCESS');
    const now = new Date();

    if (period === 'Weekly') {
      // Last 7 days
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const data = Array(7).fill(0);
      sent.forEach(tx => {
        const txDate = new Date(tx.time);
        const diffDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
          const dayIndex = txDate.getDay() === 0 ? 6 : txDate.getDay() - 1;
          data[dayIndex] += tx.amount;
        }
      });
      return { labels: days, data };
    }

    if (period === 'Monthly') {
      // Last 4 weeks
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const data = Array(4).fill(0);
      sent.forEach(tx => {
        const txDate = new Date(tx.time);
        const diffDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 28) {
          const weekIndex = Math.min(3, Math.floor(diffDays / 7));
          data[3 - weekIndex] += tx.amount;
        }
      });
      return { labels, data };
    }

    if (period === 'Yearly') {
      // Last 12 months
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = Array(12).fill(0);
      sent.forEach(tx => {
        const txDate = new Date(tx.time);
        const diffMonths = (now.getFullYear() - txDate.getFullYear()) * 12
          + (now.getMonth() - txDate.getMonth());
        if (diffMonths < 12) {
          data[txDate.getMonth()] += tx.amount;
        }
      });
      return { labels, data };
    }

    return { labels: [], data: [] };
  };

  const spendingData = getSpendingData();
  const maxVal = Math.max(...spendingData.data, 1);
  const totalSpend = spendingData.data.reduce((a, b) => a + b, 0);
  const avgSpend = spendingData.data.filter(v => v > 0).length > 0
    ? totalSpend / spendingData.data.filter(v => v > 0).length
    : 0;

 return (
  <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
      {/* ✅ Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />

            {selectedTx && (() => {
              const received = selectedTx.receiverUniqueId === user?.uniqueUserId;
              return (
                <>
                  {/* Icon + Status */}
                  <View style={[
                    s.modalIconBox,
                    { backgroundColor: received ? 'rgba(0,229,160,0.1)' : 'rgba(0,212,255,0.1)' }
                  ]}>
                    <Text style={s.modalIcon}>{received ? '📥' : '📤'}</Text>
                  </View>

                  <Text style={s.modalAmount}>
                    {received ? '+' : '-'}£{selectedTx.amount?.toFixed(2)}
                  </Text>

                  <View style={[
                    s.modalStatusBadge,
                    {
                      backgroundColor: selectedTx.status === 'SUCCESS'
                        ? 'rgba(0,229,160,0.15)' : 'rgba(255,77,109,0.15)'
                    }
                  ]}>
                    <Text style={[
                      s.modalStatusText,
                      { color: selectedTx.status === 'SUCCESS' ? colors.success : colors.error }
                    ]}>
                      {selectedTx.status}
                    </Text>
                  </View>

                  {/* Details */}
                  <View style={s.modalDetails}>
                    <DetailRow
                      label="Transaction ID"
                      value={selectedTx.transactionId}
                      mono
                    />
                    <DetailRow
                      label="Date & Time"
                      value={formatTime(selectedTx.time)}
                    />
                    <DetailRow
                      label={received ? 'From' : 'To'}
                      value={received
                        ? `${selectedTx.senderName} (${selectedTx.senderUniqueId})`
                        : `${selectedTx.receiverName} (${selectedTx.receiverUniqueId})`
                      }
                    />
                    <DetailRow
                      label="Your ID"
                      value={user?.uniqueUserId}
                    />
                    <DetailRow
                      label="Note"
                      value={selectedTx.description || '—'}
                    />
                    <DetailRow
                      label="Amount"
                      value={`£${selectedTx.amount?.toFixed(2)}`}
                    />
                  </View>

                  {/* Send Again — only for sent transactions */}
                  {!received && (
                    <TouchableOpacity
                      style={s.sendAgainBtn}
                      onPress={() => handleSendAgain(selectedTx)}
                    >
                      <Text style={s.sendAgainText}>
                        💸 Send Again to {selectedTx.receiverName}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={s.modalCloseBtn}
                    onPress={() => setSelectedTx(null)}
                  >
                    <Text style={s.modalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={fetchTransactions}>
          <Text style={s.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'history' && s.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[s.tabText, activeTab === 'history' && s.tabTextActive]}>
            📋 History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'spending' && s.tabBtnActive]}
          onPress={() => setActiveTab('spending')}
        >
          <Text style={[s.tabText, activeTab === 'spending' && s.tabTextActive]}>
            📊 Spending
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : activeTab === 'history' ? (
        // History Tab 
        <>
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

          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyText}>No transactions found</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[s.scroll, { gap: 10 }]}>
              {filtered.map((tx) => {
                const received = isReceived(tx);
                return (

                  <TouchableOpacity
                    key={tx.transactionId}
                    style={s.txRow}
                    onPress={() => setSelectedTx(tx)}
                    activeOpacity={0.75}
                  >
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
                    { }
                    <Text style={s.tapHint}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : (
        // ── Spending Analytics Tab
        <ScrollView contentContainerStyle={s.scroll}>

          {/* Period Selector */}
          <View style={s.periodRow}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.periodBtn, period === p && s.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[s.periodText, period === p && s.periodTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Cards */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total Spent</Text>
              <Text style={s.summaryValue}>£{totalSpend.toFixed(2)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Avg per Period</Text>
              <Text style={s.summaryValue}>£{avgSpend.toFixed(2)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Transactions</Text>
              <Text style={s.summaryValue}>
                {transactions.filter(tx => !isReceived(tx)).length}
              </Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>
              {period === 'Weekly' ? 'Spending This Week'
                : period === 'Monthly' ? 'Spending This Month'
                  : 'Spending This Year'}
            </Text>

            {totalSpend === 0 ? (
              <View style={s.noSpendBox}>
                <Text style={s.noSpendIcon}>💸</Text>
                <Text style={s.noSpendText}>No spending data for this period</Text>
              </View>
            ) : (
              <View style={s.chartArea}>
                {/* Y axis labels */}
                <View style={s.yAxis}>
                  {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                    <Text key={fraction} style={s.yLabel}>
                      £{Math.round(maxVal * fraction)}
                    </Text>
                  ))}
                </View>

                {/* Bars */}
                <View style={s.barsContainer}>
                  {spendingData.data.map((val, i) => {
                    const heightPercent = maxVal > 0 ? (val / maxVal) : 0;
                    const barHeight = Math.max(heightPercent * 160, val > 0 ? 4 : 0);
                    return (
                      <View key={i} style={s.barWrapper}>
                        {val > 0 && (
                          <Text style={s.barValue}>£{val.toFixed(0)}</Text>
                        )}
                        <View style={s.barTrack}>
                          <View style={[
                            s.bar,
                            {
                              height: barHeight,
                              backgroundColor: val === Math.max(...spendingData.data)
                                ? colors.primary
                                : colors.primaryLight ?? '#00a0c0',
                              opacity: val === 0 ? 0.15 : 1,
                            }
                          ]} />
                        </View>
                        <Text style={s.barLabel}>{spendingData.labels[i]}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Top Spending breakdown */}
          {totalSpend > 0 && (
            <View style={s.breakdownCard}>
              <Text style={s.chartTitle}>Recent Outgoing</Text>
              {transactions
                .filter(tx => !isReceived(tx) && tx.status === 'SUCCESS')
                .slice(0, 5)
                .map((tx) => (
                  <View key={tx.transactionId} style={s.breakdownRow}>
                    <View style={s.breakdownLeft}>
                      <Text style={s.breakdownIcon}>📤</Text>
                      <View>
                        <Text style={s.breakdownName}>To {tx.receiverUniqueId}</Text>
                        <Text style={s.breakdownDesc}>{tx.description}</Text>
                      </View>
                    </View>
                    <Text style={s.breakdownAmount}>-£{tx.amount?.toFixed(2)}</Text>
                  </View>
                ))}
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
// helper component
function DetailRow({ label, value, mono }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, mono && s.detailMono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

//  Profile Screen 
export function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const { isDark, toggleTheme, colors: themeColors } = useTheme();

  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) { }
    logout();
  };

  const INFO_ROWS = [
    { label: 'ZuPay ID', value: user?.uniqueUserId || '—', icon: '🆔' },
    { label: 'Bank Linked', value: user?.bankLinked ? 'Yes ✓' : 'No', icon: '🏦' },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
       <Text style={[s.headerTitle, { color: themeColors.textPrimary }]}>Profile</Text>
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
         <Text style={[s.profileName, { color: themeColors.textPrimary }]}>{user?.name || 'User'}</Text>
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
        {/* Theme Toggle */}
        <View style={s.themeRow}>
          <Text style={s.infoIcon}>🌙</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.infoValue}>Dark/Light -Mode</Text>
            <Text style={s.infoLabel}>{isDark ? 'Currently dark' : 'Currently light'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#C5D8F0', true: '#00D4FF' }}
            thumbColor={isDark ? '#0099BB' : '#ffffff'}
          />
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

// ── Link Bank Screen 
export function LinkBankScreen({ navigation }) {
  const { updateUser } = useAuth();
  const { isDark, colors: themeColors } = useTheme();
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
    <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
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

//  Styles
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

  // ── Add inside StyleSheet.create({...}) ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.bg, fontWeight: '700' },

  periodRow: {
    flexDirection: 'row', gap: 8,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: colors.bg, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  summaryValue: { color: colors.primary, fontSize: 16, fontWeight: '800' },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  chartTitle: {
    color: colors.textPrimary,
    fontSize: 15, fontWeight: '800',
    marginBottom: 20,
  },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 220 },
  yAxis: {
    width: 40,
    height: 180,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 20,
  },
  yLabel: { color: colors.textMuted, fontSize: 9 },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
    gap: 4,
  },
  barValue: { color: colors.textMuted, fontSize: 8, fontWeight: '600' },
  barTrack: {
    width: '100%',
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  noSpendBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noSpendIcon: { fontSize: 32 },
  noSpendText: { color: colors.textMuted, fontSize: 13 },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownIcon: { fontSize: 18 },
  breakdownName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  breakdownDesc: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  breakdownAmount: { color: colors.error, fontSize: 14, fontWeight: '700' },

  // ✅ Add to StyleSheet.create({...})
  tapHint: {
    color: colors.textMuted, fontSize: 18,
    fontWeight: '300', marginLeft: 4,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 28, paddingBottom: 48,
    alignItems: 'center',
    borderTopWidth: 1, borderColor: colors.border,
    gap: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: 8,
  },
  modalIconBox: {
    width: 70, height: 70, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalIcon: { fontSize: 32 },
  modalAmount: {
    color: colors.textPrimary, fontSize: 36,
    fontWeight: '900',
  },
  modalStatusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  modalStatusText: { fontSize: 13, fontWeight: '700' },
  modalDetails: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.textMuted, fontSize: 12,
    fontWeight: '600', flex: 1,
  },
  detailValue: {
    color: colors.textPrimary, fontSize: 13,
    fontWeight: '600', flex: 2, textAlign: 'right',
  },
  detailMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
  },
  sendAgainBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  sendAgainText: {
    color: colors.bg, fontSize: 15, fontWeight: '800',
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCloseBtnText: {
    color: colors.textSecondary, fontSize: 15, fontWeight: '600',
  },
  themeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: 12,
  gap: 12,
},
});