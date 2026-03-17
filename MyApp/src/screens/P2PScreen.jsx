import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, ScrollView, ActivityIndicator,
  Platform, Image, Modal,
} from 'react-native';
import { colors, radius } from '../theme/theme.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { findUser, sendMoney, getTransactionHistory } from '../services/authService.js';
import LockScreen from './LockScreen.jsx';

let CameraView, useCameraPermissions;
if (Platform.OS !== 'web') {
  const Camera = require('expo-camera');
  CameraView = Camera.CameraView;
  useCameraPermissions = Camera.useCameraPermissions;
}

function DetailRow({ label, value, mono }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, mono && styles.detailMono]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function TxDetailContent({ tx, userId, formatTime, onClose, onSendAgain }) {
  const received = tx.receiverUniqueId === userId;
  return (
    <>
      <View style={[
        styles.modalIconBox,
        { backgroundColor: received ? 'rgba(0,229,160,0.1)' : 'rgba(0,212,255,0.1)' }
      ]}>
        <Text style={styles.modalIcon}>{received ? '📥' : '📤'}</Text>
      </View>
      <Text style={styles.modalAmount}>
        {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
      </Text>
      <View style={[
        styles.modalStatusBadge,
        {
          backgroundColor: tx.status === 'SUCCESS'
            ? 'rgba(0,229,160,0.15)' : 'rgba(255,77,109,0.15)'
        }
      ]}>
        <Text style={[
          styles.modalStatusText,
          { color: tx.status === 'SUCCESS' ? colors.success : colors.error }
        ]}>
          {tx.status}
        </Text>
      </View>
      <View style={styles.modalDetails}>
        <DetailRow label="Transaction ID" value={tx.transactionId} mono />
        <DetailRow label="Date & Time" value={formatTime(tx.time)} />
        <DetailRow
          label={received ? 'From' : 'To'}
          value={received
            ? `${tx.senderName ?? tx.senderUniqueId}`
            : `${tx.receiverName ?? tx.receiverUniqueId}`
          }
        />
        <DetailRow label="Note" value={tx.description || '—'} />
        <DetailRow label="Amount" value={`£${tx.amount?.toFixed(2)}`} />
      </View>
      {!received && (
        <TouchableOpacity
          style={styles.sendAgainBtn}
          onPress={() => onSendAgain(tx)}
        >
          <Text style={styles.sendAgainText}>
            💸 Send Again to {tx.receiverName ?? tx.receiverUniqueId}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
        <Text style={styles.modalCloseBtnText}>Close</Text>
      </TouchableOpacity>
    </>
  );
}

export default function P2PScreen({ navigation, route }) {
  const { user, updateUser, refreshUser } = useAuth();
  const { isDark, colors: themeColors } = useTheme();

  const [receiverId, setReceiverId] = useState('');
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showTransactionLock, setShowTransactionLock] = useState(false);
  const lookupInProgress = useRef(false);

  const [permission, requestPermission] = Platform.OS !== 'web'
    ? useCameraPermissions()
    : [{ granted: false }, () => { }];

  useEffect(() => {
    fetchHistory();
    if (route?.params?.scannedId) {
      setReceiverId(route.params.scannedId);
      lookupUser(route.params.scannedId);
    }
    if (route?.params?.prefillUserId) {
      setReceiverId(route.params.prefillUserId);
      lookupUser(route.params.prefillUserId);
    }
    if (route?.params?.openScanner && Platform.OS !== 'web') {
      setTimeout(() => openScanner(), 500);
    }
  }, []);

  const lookupUser = async (id) => {
    if (!id || id.trim().length < 3) {
      setReceiverInfo(null);
      setLookupError('');
      return;
    }
    if (id.trim() === user?.uniqueUserId) {
      setReceiverInfo(null);
      setLookupError('⚠ This is your own ZuPay ID.');
      return;
    }
    if (lookupInProgress.current) return;
    lookupInProgress.current = true;
    try {
      setLookupLoading(true);
      setLookupError('');
      setReceiverInfo(null);
      const data = await findUser(id.trim());
      setReceiverInfo(data);
    } catch (err) {
      setLookupError('❌ ' + (err.response?.data?.message || 'User not found'));
      setReceiverInfo(null);
    } finally {
      setLookupLoading(false);
      lookupInProgress.current = false;
    }
  };

  const handleReceiverBlur = () => {
    if (!receiverInfo && receiverId && !lookupInProgress.current) {
      lookupUser(receiverId);
    }
  };


  const handleQrScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);
    setReceiverId(data);
    lookupInProgress.current = false;
    lookupUser(data);
    setTimeout(() => setScanned(false), 1000);
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await getTransactionHistory();
      setHistory(data);
    } catch (e) {
      console.log('History error:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = () => {
    setError('');
    setSuccess(null);
    if (!receiverInfo) return setError('Please enter a valid ZuPay ID first.');
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError('Enter a valid amount.');
    if (Number(amount) > (user?.bankBalance || 0)) return setError('Insufficient balance.');
    setShowTransactionLock(true);
  };

  const executeTransaction = async () => {
    try {
      setLoading(true);
      const data = await sendMoney({
        receiverUniqueId: receiverInfo.uniqueUserId,
        amount: Number(amount),
        description: description.trim() || 'P2P Transfer',
      });
      updateUser({ bankBalance: (user.bankBalance || 0) - Number(amount) });
      refreshUser();
      setSuccess({
        transactionId: data.transactionId,
        amount: data.amount,
        receiverName: receiverInfo.name,
      });
      setReceiverId('');
      setReceiverInfo(null);
      setAmount('');
      setDescription('');
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') return;
    if (!permission?.granted) await requestPermission();
    setShowScanner(true);
  };

  const isReceived = (tx) => tx.receiverUniqueId === user?.uniqueUserId;
  const formatTime = (t) => { try { return new Date(t).toLocaleString(); } catch { return t; } };

  return (
  <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* My QR Modal */}
      <Modal visible={showMyQR} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>My QR Code</Text>
            <Text style={styles.modalSub}>Let others scan to send you money</Text>
            {user?.qrCode ? (
              <View style={styles.qrWrapper}>
                <Image
                  source={{ uri: `data:image/png;base64,${user.qrCode}` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <Text style={styles.noQr}>QR code not available</Text>
            )}
            <Text style={styles.qrId}>{user?.uniqueUserId}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMyQR(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      {Platform.OS !== 'web' && (
        <Modal visible={showScanner} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleQrScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>Point at a ZuPay QR code</Text>
              <TouchableOpacity
                style={styles.cancelScanBtn}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Transaction Lock */}
      {showTransactionLock && (
        <View style={styles.lockOverlay}>
          <LockScreen
            mode="transaction"
            onUnlock={() => {
              setShowTransactionLock(false);
              executeTransaction();
            }}
          />
        </View>
      )}
      {/* Transaction Lock */}
      {showTransactionLock && (
        <View style={styles.lockOverlay}>
          <LockScreen
            mode="transaction"
            onUnlock={() => {
              setShowTransactionLock(false);
              executeTransaction();
            }}
          />
        </View>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            {selectedTx && (
              <TxDetailContent
                tx={selectedTx}
                userId={user?.uniqueUserId}
                formatTime={formatTime}
                onClose={() => setSelectedTx(null)}
                onSendAgain={(tx) => {
                  setSelectedTx(null);
                  setReceiverId(tx.receiverUniqueId);
                  lookupUser(tx.receiverUniqueId);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Send Money</Text>
          <TouchableOpacity style={styles.myQrBtn} onPress={() => setShowMyQR(true)}>
            <Text style={styles.myQrIcon}>⬛</Text>
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <View style={styles.balancePill}>
          <Text style={styles.balancePillLabel}>Available Balance</Text>
          <Text style={styles.balancePillValue}>
            £{user?.bankBalance ? Number(user.bankBalance).toFixed(2) : '0.00'}
          </Text>
        </View>

        {/* Send Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💸 New Transfer</Text>

          {/* Receiver ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Recipient ZuPay ID</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>🆔</Text>
              <TextInput
                style={styles.input}
                value={receiverId}
                onChangeText={(v) => {
                  setReceiverId(v);
                  setReceiverInfo(null);
                  setLookupError('');
                }}
                onBlur={handleReceiverBlur}
                placeholder="e.g. joh5428"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              {lookupLoading && <ActivityIndicator color={colors.primary} size="small" />}
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
                  <Text style={styles.scanBtnText}>📷</Text>
                </TouchableOpacity>
              )}
            </View>

            {lookupError ? (
              <Text style={styles.lookupError}>{lookupError}</Text>
            ) : null}

            {receiverInfo && (
              <View style={styles.receiverCard}>
                <View style={styles.receiverAvatar}>
                  <Text style={styles.receiverAvatarText}>
                    {receiverInfo.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiverName}>{receiverInfo.name}</Text>
                  <Text style={styles.receiverIdText}>{receiverInfo.uniqueUserId}</Text>
                </View>
                <Text style={styles.receiverTick}>✓</Text>
              </View>
            )}
          </View>

          {/* Amount — only show if receiver found */}
          {receiverInfo && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (GBP)</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>£</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.quickRow}>
                {['10', '20', '50', '100'].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickBtn, amount === a && styles.quickBtnActive]}
                    onPress={() => setAmount(a)}
                  >
                    <Text style={[styles.quickBtnText, amount === a && styles.quickBtnTextActive]}>
                      £{a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Note (optional)</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📝</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g. dinner, rent..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>✓ Sent to {success.receiverName}!</Text>
              <Text style={styles.successText}>£{success.amount?.toFixed(2)} transferred successfully</Text>
              <Text style={styles.successRef}>Ref: {success.transactionId?.slice(0, 8)}...</Text>
            </View>
          ) : null}

          {receiverInfo && (
            <TouchableOpacity
              style={[styles.sendBtn, loading && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.sendBtnText}>
                  Send £{amount || '0'} to {receiverInfo.name} →
                </Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <TouchableOpacity onPress={fetchHistory}>
            <Text style={styles.refreshBtn}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {historyLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {history.map((tx) => {
              const received = isReceived(tx);
              return (
                <TouchableOpacity
                  key={tx.transactionId}
                  style={styles.txRow}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.75}
                >
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
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[
                      styles.txAmount,
                      { color: received ? colors.success : colors.textPrimary }
                    ]}>
                      {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: tx.status === 'SUCCESS' ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,109,0.1)' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: tx.status === 'SUCCESS' ? colors.success : colors.error }
                      ]}>
                        {tx.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.primary, opacity: 0.05,
  },
  orb2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.accent, opacity: 0.04,
  },
  scroll: { padding: 24, paddingTop: 16 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  pageTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  myQrBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight,
  },
  myQrIcon: { fontSize: 20 },
  balancePill: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.overlay, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.primary, marginBottom: 20,
  },
  balancePillLabel: { color: colors.textMuted, fontSize: 13 },
  balancePillValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: 24, borderWidth: 1, borderColor: colors.border,
    gap: 16, marginBottom: 28,
    ...(Platform.OS === 'web' ? { boxShadow: neu } : {
      shadowColor: '#000', shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
    }),
  },
  cardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  inputGroup: { gap: 8 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  inputIcon: { fontSize: 16, color: colors.textMuted },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  scanBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.overlay, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryLight,
  },
  scanBtnText: { fontSize: 18 },
  lookupError: { color: colors.error, fontSize: 12, marginTop: 4 },
  receiverCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,229,160,0.08)',
    borderRadius: radius.md, padding: 14, gap: 12,
    borderWidth: 1, borderColor: colors.success, marginTop: 4,
  },
  receiverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  receiverAvatarText: { color: colors.bg, fontSize: 20, fontWeight: '800' },
  receiverName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  receiverIdText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  receiverTick: { color: colors.success, fontSize: 22, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  quickBtnActive: { backgroundColor: colors.overlay, borderColor: colors.primary },
  quickBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  quickBtnTextActive: { color: colors.primary },
  errorBox: {
    backgroundColor: 'rgba(255,77,109,0.1)', borderRadius: radius.md,
    padding: 12, borderWidth: 1, borderColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: 13 },
  successBox: {
    backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.success, gap: 4,
  },
  successTitle: { color: colors.success, fontSize: 16, fontWeight: '800' },
  successText: { color: colors.textSecondary, fontSize: 13 },
  successRef: { color: colors.textMuted, fontSize: 11 },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '6px 6px 14px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.3)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  sendBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  refreshBtn: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border,
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
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: 28, paddingBottom: 48,
    alignItems: 'center', borderTopWidth: 1, borderColor: colors.border, gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  modalSub: { color: colors.textMuted, fontSize: 13 },
  qrWrapper: {
    width: 220, height: 220, borderRadius: radius.lg,
    backgroundColor: '#fff', padding: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  qrImage: { width: 196, height: 196 },
  noQr: { color: colors.textMuted, fontSize: 14 },
  qrId: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: '100%', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  closeBtnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  scannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 32, alignItems: 'center', gap: 20,
  },
  scannerFrame: {
    width: 250, height: 250, borderWidth: 3,
    borderColor: colors.primary, borderRadius: radius.lg,
    position: 'absolute', top: -300, alignSelf: 'center',
  },
  scannerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelScanBtn: {
    backgroundColor: colors.error, borderRadius: radius.lg,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  cancelScanText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg, zIndex: 999,
  },
  modalIconBox: {
    width: 70, height: 70, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalIcon: { fontSize: 32 },
  modalAmount: { color: colors.textPrimary, fontSize: 36, fontWeight: '900' },
  modalStatusBadge: {
    borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 6,
  },
  modalStatusText: { fontSize: 13, fontWeight: '700' },
  modalDetails: {
    width: '100%', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  detailValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  detailMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11,
  },
  sendAgainBtn: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  sendAgainText: { color: colors.bg, fontSize: 15, fontWeight: '800' },
  modalCloseBtn: {
    width: '100%', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  modalCloseBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
});