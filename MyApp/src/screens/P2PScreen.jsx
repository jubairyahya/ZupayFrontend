import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, ScrollView, ActivityIndicator,
  Platform, Image, Modal,
} from 'react-native';
import { radius } from '../theme/theme.js';
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


function DetailRow({ label, value, mono, colors }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailMono, { color: colors.textPrimary }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}


function TxDetailContent({ tx, userId, formatTime, onClose, onSendAgain, colors }) {
  const received = tx.receiverUniqueId === userId;
  return (
    <>
      <View style={[styles.modalIconBox, {
        backgroundColor: received ? 'rgba(0,229,160,0.1)' : 'rgba(0,212,255,0.1)',
        borderColor: colors.border, // CHANGED
      }]}>
        <Text style={styles.modalIcon}>{received ? '📥' : '📤'}</Text>
      </View>

      <Text style={[styles.modalAmount, { color: colors.textPrimary }]}>
        {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
      </Text>
      <View style={[styles.modalStatusBadge, {
        backgroundColor: tx.status === 'SUCCESS' ? 'rgba(0,229,160,0.15)' : 'rgba(255,77,109,0.15)'
      }]}>
        <Text style={[styles.modalStatusText, {
          color: tx.status === 'SUCCESS' ? colors.success : colors.error
        }]}>
          {tx.status}
        </Text>
      </View>

      <View style={[styles.modalDetails, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <DetailRow label="Transaction ID" value={tx.transactionId} mono colors={colors} />
        <DetailRow label="Date & Time" value={formatTime(tx.time)} colors={colors} />
        <DetailRow
          label={received ? 'From' : 'To'}
          value={received
            ? `${tx.senderName ?? tx.senderUniqueId}`
            : `${tx.receiverName ?? tx.receiverUniqueId}`
          }
          colors={colors}
        />
        <DetailRow label="Note" value={tx.description || '—'} colors={colors} />
        <DetailRow label="Amount" value={`£${tx.amount?.toFixed(2)}`} colors={colors} />
      </View>
      <TouchableOpacity style={[styles.sendAgainBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          const targetId = received ? tx.senderUniqueId : tx.receiverUniqueId;
          onSendAgain(targetId);
        }}
      >

        <Text style={[styles.sendAgainText, { color: colors.bg }]}>
          {received ? `💸 Send to ${tx.senderName ?? tx.senderUniqueId}` : `💸 Send Again to ${tx.receiverName ?? tx.receiverUniqueId}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={onClose}>
        <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>✕ Close</Text>
      </TouchableOpacity>
    </>

  );
}

export default function P2PScreen({ navigation, route }) {
  const { user, updateUser, refreshUser, isBusinessMode } = useAuth();
  const { isDark, colors } = useTheme();

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
  const scrollRef = useRef(null);

  const [permission, requestPermission] = Platform.OS !== 'web'
    ? useCameraPermissions()
    : [{ granted: false }, () => { }];

  useEffect(() => {
    fetchHistory();
    refreshUser();
    const interval = setInterval(() => {
      console.log("🏪 Shop Check: Refreshing balance...");
      refreshUser();
    }, 5000);
    if (route?.params?.scannedId) { setReceiverId(route.params.scannedId); lookupUser(route.params.scannedId); }
    if (route?.params?.prefillUserId) { setReceiverId(route.params.prefillUserId); lookupUser(route.params.prefillUserId); }
    if (route?.params?.openScanner && Platform.OS !== 'web') { setTimeout(() => openScanner(), 500); }
    return () => clearInterval(interval);
  }, []);

  const lookupUser = async (id) => {
    if (!id || id.trim().length < 3) { setReceiverInfo(null); setLookupError(''); return; }
    if (id.trim() === user?.uniqueUserId) { setReceiverInfo(null); setLookupError('⚠ This is your own ZuPay ID.'); return; }
    if (lookupInProgress.current) return;
    lookupInProgress.current = true;
    try {
      setLookupLoading(true); setLookupError(''); setReceiverInfo(null);
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
    if (!receiverInfo && receiverId && !lookupInProgress.current) lookupUser(receiverId);
  };

  const handleQrScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true); setShowScanner(false); setReceiverId(data);
    lookupInProgress.current = false;
    lookupUser(data);
    setTimeout(() => setScanned(false), 1000);
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await getTransactionHistory();
      setHistory(data);
      await refreshUser();
    } catch (e) { console.log('History error:', e); }
    finally { setHistoryLoading(false); }
  };

  const handleSend = () => {
    setError(''); setSuccess(null);
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
      setSuccess({ transactionId: data.transactionId, amount: data.amount, receiverName: receiverInfo.name });
      setReceiverId(''); setReceiverInfo(null); setAmount(''); setDescription('');
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed.');
    } finally { setLoading(false); }
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') return;
    if (!permission?.granted) await requestPermission();
    setShowScanner(true);
  };

  const isReceived = (tx) => tx.receiverUniqueId === user?.uniqueUserId;
  const formatTime = (t) => {
    try {
      const date = new Date(t + 'Z');
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = date.getFullYear();
      const hour = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${months[date.getMonth()]} ${year}, ${hour}:${min}`;
    } catch { return t; }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* My QR Modal */}
      <Modal visible={showMyQR} transparent animationType="slide">
        <View style={styles.modalOverlay}>

          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>My QR Code</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Let others scan to send you money</Text>
            {user?.qrCode ? (
              <View style={styles.qrWrapper}>
                <Image source={{ uri: `data:image/png;base64,${user.qrCode}` }} style={styles.qrImage} resizeMode="contain" />
              </View>
            ) : (
              <Text style={[styles.noQr, { color: colors.textMuted }]}>QR code not available</Text>
            )}
            <Text style={[styles.qrId, { color: colors.primary }]}>{user?.uniqueUserId}</Text>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => setShowMyQR(false)}>
              <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      {Platform.OS !== 'web' && (
        <Modal visible={showScanner} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <CameraView style={{ flex: 1 }} facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleQrScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>Point at a ZuPay QR code</Text>
              <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setShowScanner(false)}>
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Transaction Lock */}
      {showTransactionLock && (
        <View style={[styles.lockOverlay, { backgroundColor: colors.bg }]}>
          <LockScreen mode="transaction" onUnlock={() => { setShowTransactionLock(false); executeTransaction(); }} />
        </View>
      )}

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide" onRequestClose={() => setSelectedTx(null)}>
        <View style={styles.modalOverlay}>

          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            {selectedTx && (
              <TxDetailContent
                tx={selectedTx}
                userId={user?.uniqueUserId}
                formatTime={formatTime}
                onClose={() => setSelectedTx(null)}
                colors={colors}
                onSendAgain={(targetId) => {
                  setSelectedTx(null);
                  setReceiverId(targetId);
                  lookupUser(targetId);
                  setTimeout(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, 300);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>

            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Send Money</Text>

          <TouchableOpacity style={[styles.myQrBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => setShowMyQR(true)}>
            <Text style={styles.myQrIcon}>⬛</Text>
          </TouchableOpacity>
        </View>

        {/* Balance */}

        <View style={[styles.balancePill, { backgroundColor: colors.overlay, borderColor: colors.primary }]}>
          <Text style={[styles.balancePillLabel, { color: colors.textMuted }]}>Available Balance</Text>
          <Text style={[styles.balancePillValue, { color: colors.primary }]}>
            £{user?.bankBalance ? Number(user.bankBalance).toFixed(2) : '0.00'}
          </Text>
        </View>

        {/* Send Form */}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>💸 New Transfer</Text>

          {/* Receiver ID */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Recipient ZuPay ID</Text>

            <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={styles.inputIcon}>🆔</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={receiverId}
                onChangeText={(v) => { setReceiverId(v); setReceiverInfo(null); setLookupError(''); }}
                onBlur={handleReceiverBlur}
                placeholder="e.g. joh5428"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              {lookupLoading && <ActivityIndicator color={colors.primary} size="small" />}
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={[styles.scanBtn, { backgroundColor: colors.overlay, borderColor: colors.primaryLight }]} onPress={openScanner}>
                  <Text style={styles.scanBtnText}>📷</Text>
                </TouchableOpacity>
              )}
            </View>
            {lookupError ? <Text style={styles.lookupError}>{lookupError}</Text> : null}
            {receiverInfo && (
              <View style={styles.receiverCard}>
                <View style={[styles.receiverAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.receiverAvatarText, { color: colors.bg }]}>
                    {receiverInfo.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>

                  <Text style={[styles.receiverName, { color: colors.textPrimary }]}>{receiverInfo.name}</Text>
                  <Text style={[styles.receiverIdText, { color: colors.textMuted }]}>{receiverInfo.uniqueUserId}</Text>
                </View>
                <Text style={[styles.receiverTick, { color: colors.success }]}>✓</Text>
              </View>
            )}
          </View>

          {receiverInfo && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (GBP)</Text>

                <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={styles.inputIcon}>£</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
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

                    style={[styles.quickBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    amount === a && { backgroundColor: colors.overlay, borderColor: colors.primary }
                    ]}
                    onPress={() => setAmount(a)}
                  >
                    <Text style={[styles.quickBtnText, { color: colors.textMuted },
                    amount === a && { color: colors.primary }
                    ]}>
                      £{a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Note (optional)</Text>

                <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={styles.inputIcon}>📝</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
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
              <Text style={[styles.successText, { color: colors.textSecondary }]}>£{success.amount?.toFixed(2)} transferred successfully</Text>
              <Text style={[styles.successRef, { color: colors.textMuted }]}>Ref: {success.transactionId?.slice(0, 8)}...</Text>
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
                : <Text style={[styles.sendBtnText, { color: colors.bg }]}>
                  Send £{amount || '0'} to {receiverInfo.name} →
                </Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* History */}
        <View style={styles.sectionHeader}>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transaction History</Text>
          <TouchableOpacity onPress={fetchHistory}>
            <Text style={[styles.refreshBtn, { color: colors.primary }]}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {historyLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>

            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {history
              .filter(tx => tx.transactionType !== 'BILL_PAYMENT')
              .map((tx) => {
                const received = isReceived(tx);
                return (

                  <TouchableOpacity
                    key={tx.transactionId}
                    style={[styles.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setSelectedTx(tx)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.txIconBox, {
                      backgroundColor: received ? 'rgba(0,229,160,0.1)' : colors.overlay,
                      borderColor: colors.border,
                    }]}>
                      <Text style={styles.txIcon}>{received ? '📥' : '📤'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>

                      <Text style={[styles.txName, { color: colors.textPrimary }]}>
                        {received ? `From ${tx.senderUniqueId}` : `To ${tx.receiverUniqueId}`}
                      </Text>
                      <Text style={[styles.txDesc, { color: colors.textMuted }]}>{tx.description}</Text>
                      <Text style={[styles.txTime, { color: colors.textMuted }]}>{formatTime(tx.time)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.txAmount, { color: received ? colors.success : colors.textPrimary }]}>
                        {received ? '+' : '-'}£{tx.amount?.toFixed(2)}
                      </Text>
                      <View style={[styles.statusBadge, {
                        backgroundColor: tx.status === 'SUCCESS' ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,109,0.1)'
                      }]}>
                        <Text style={[styles.statusText, {
                          color: tx.status === 'SUCCESS' ? colors.success : colors.error
                        }]}>
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

//  StyleSheet 
const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: { position: 'absolute', top: -60, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#00D4FF', opacity: 0.05 },
  orb2: { position: 'absolute', bottom: 100, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#0EA5E9', opacity: 0.04 },
  scroll: { padding: 24, paddingTop: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backText: { fontSize: 15, fontWeight: '600' },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  myQrBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  myQrIcon: { fontSize: 20 },
  balancePill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.lg, padding: 16, borderWidth: 1, marginBottom: 20 },
  balancePillLabel: { fontSize: 13 },
  balancePillValue: { fontSize: 20, fontWeight: '800' },
  card: {
    borderRadius: radius.xl, padding: 24, borderWidth: 1, gap: 16, marginBottom: 28,
    ...(Platform.OS === 'web' ? { boxShadow: neu } : { shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12 }),
  },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15 },
  scanBtn: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scanBtnText: { fontSize: 18 },
  lookupError: { color: '#FF4D6D', fontSize: 12, marginTop: 4 },
  receiverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: radius.md, padding: 14, gap: 12, borderWidth: 1, borderColor: '#00E5A0', marginTop: 4 },
  receiverAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  receiverAvatarText: { fontSize: 20, fontWeight: '800' },
  receiverName: { fontSize: 16, fontWeight: '700' },
  receiverIdText: { fontSize: 12, marginTop: 2 },
  receiverTick: { fontSize: 22, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '600' },
  errorBox: { backgroundColor: 'rgba(255,77,109,0.1)', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#FF4D6D' },
  errorText: { color: '#FF4D6D', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: '#00E5A0', gap: 4 },
  successTitle: { color: '#00E5A0', fontSize: 16, fontWeight: '800' },
  successText: { fontSize: 13 },
  successRef: { fontSize: 11 },
  sendBtn: {
    backgroundColor: '#00D4FF', borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '6px 6px 14px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.3)' }
      : { shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 }),
  },
  sendBtnText: { fontSize: 16, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  refreshBtn: { fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15 },
  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: 14, gap: 12, borderWidth: 1,
    ...(Platform.OS === 'web' ? { boxShadow: neu } : { shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }),
  },
  txIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  txIcon: { fontSize: 20 },
  txName: { fontSize: 14, fontWeight: '600' },
  txDesc: { fontSize: 12, marginTop: 1 },
  txTime: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 28, paddingBottom: 48, alignItems: 'center', borderTopWidth: 1, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSub: { fontSize: 13 },
  qrWrapper: { width: 220, height: 220, borderRadius: radius.lg, backgroundColor: '#fff', padding: 12, alignItems: 'center', justifyContent: 'center' },
  qrImage: { width: 196, height: 196 },
  noQr: { fontSize: 14 },
  qrId: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: '100%', borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  closeBtnText: { fontSize: 15, fontWeight: '700' },
  scannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, alignItems: 'center', gap: 20 },
  scannerFrame: { width: 250, height: 250, borderWidth: 3, borderColor: '#00D4FF', borderRadius: radius.lg, position: 'absolute', top: -300, alignSelf: 'center' },
  scannerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelScanBtn: { backgroundColor: '#FF4D6D', borderRadius: radius.lg, paddingHorizontal: 32, paddingVertical: 14 },
  cancelScanText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  modalIconBox: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalIcon: { fontSize: 32 },
  modalAmount: { fontSize: 36, fontWeight: '900' },
  modalStatusBadge: { borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 6 },
  modalStatusText: { fontSize: 13, fontWeight: '700' },
  modalDetails: { width: '100%', borderRadius: radius.lg, borderWidth: 1, marginTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  detailLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  detailMono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 },
  sendAgainBtn: { width: '100%', borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  sendAgainText: { fontSize: 15, fontWeight: '800' },
  modalCloseBtn: { width: '100%', borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  modalCloseBtnText: { fontSize: 15, fontWeight: '600' },
});