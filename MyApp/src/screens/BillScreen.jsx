import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    StatusBar, ScrollView, TextInput, Modal, ActivityIndicator,
    Alert, FlatList,
} from 'react-native';
import { radius } from '../theme/theme.js';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import LockScreen from './LockScreen.jsx';

const BILL_CATEGORIES = [
    {
        key: 'COUNCIL_TAX',
        label: 'Council Tax',
        icon: '🏛️',
        color: 'rgba(0,212,255,0.15)',
        borderColor: 'rgba(0,212,255,0.4)',
        providers: [
            'Westminster City Council', 'Camden Council', 'Hackney Council',
            'Islington Council', 'Southwark Council', 'Tower Hamlets Council',
            'Lambeth Council', 'Newham Council', 'Lewisham Council',
            'Croydon Council', 'Barnet Council', 'Ealing Council',
            'Enfield Council', 'Haringey Council', 'Brent Council',
            'Wandsworth Council', 'Greenwich Council', 'Hillingdon Council',
            'Glasgow City Council', 'City of Edinburgh Council', 'Fife Council',
            'South Lanarkshire Council', 'North Lanarkshire Council',
            'Aberdeen City Council', 'Dundee City Council', 'Renfrewshire Council',
            'Highland Council', 'West Lothian Council',
            'Birmingham City Council', 'Manchester City Council', 'Leeds City Council',
            'Liverpool City Council', 'Sheffield City Council', 'Bristol City Council',
            'Cardiff Council', 'Swansea Council', 'Bradford Council',
            'Kirklees Council', 'Wakefield Council', 'Coventry City Council',
            'Sunderland City Council', 'Doncaster Council', 'Wigan Council',
            'Leicester City Council', 'Nottingham City Council', 'Plymouth City Council',
            'Southampton City Council',
        ],
    },
    {
        key: 'PCN_FINE',
        label: 'Fines',
        icon: '⚖️',
        color: 'rgba(255,77,109,0.12)',
        borderColor: 'rgba(255,77,109,0.4)',
        providers: [
            'Transport for London (TfL)', 'Westminster City Council', 'Camden Council',
            'Hackney Council', 'Islington Council', 'Tower Hamlets Council',
            'City of London Parking', 'Euro Car Parks', 'ParkingEye',
            'CP Plus (GroupNexus)', 'Horizon Parking',
            'HM Courts & Tribunals Service', 'DVLA Enforcement',
            'Metropolitan Police (Traffic)', 'HMRC Penalty',
        ],
    },
    {
        key: 'ENERGY',
        label: 'Energy',
        icon: '⚡',
        color: 'rgba(255,200,0,0.12)',
        borderColor: 'rgba(255,200,0,0.4)',
        providers: [
            'British Gas', 'EDF Energy', 'E.ON Next', 'Octopus Energy',
            'OVO Energy', 'Scottish Power', 'Shell Energy', 'Bulb Energy',
            'Utilita Energy', 'So Energy', 'Outfox the Market',
            'Rebel Energy', 'Ecotricity', 'Good Energy', 'Pure Planet',
        ],
    },
    {
        key: 'WATER',
        label: 'Water',
        icon: '💧',
        color: 'rgba(0,229,160,0.12)',
        borderColor: 'rgba(0,229,160,0.4)',
        providers: [
            'Thames Water', 'Severn Trent Water', 'United Utilities',
            'Anglian Water', 'Yorkshire Water', 'South West Water',
            'Welsh Water (Dŵr Cymru)', 'Northumbrian Water',
            'Southern Water', 'Affinity Water', 'Bristol Water',
            'Portsmouth Water', 'South East Water', 'SES Water',
        ],
    },
];

export default function BillScreen({ navigation, route }) {
    const { isDark, colors } = useTheme();
    const s = makeStyles(colors);

    const [step, setStep] = useState('category');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [reference, setReference] = useState('');
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const [providerSearch, setProviderSearch] = useState('');
    const [successModal, setSuccessModal] = useState(false);
    const [paidTx, setPaidTx] = useState(null);
    const [showPinLock, setShowPinLock] = useState(false);
    const [recentBills, setRecentBills] = useState([]);

    const fetchRecentBills = async () => {
        try {
            const res = await api.get('/transaction/history');
            const filtered = res.data.filter(tx =>
                tx.transactionType === 'BILL_PAYMENT' && tx.type === selectedCategory?.key
            );
            const unique = filtered.reduce((acc, current) => {
                const x = acc.find(item => item.reference === current.reference);
                if (!x) return acc.concat([current]);
                return acc;
            }, []);
            setRecentBills(unique);
        } catch (err) {
            console.log('History fetch error:', err);
        }
    };

    useEffect(() => {
        if (selectedCategory && step === 'provider') fetchRecentBills();
    }, [selectedCategory, step]);

    useEffect(() => {
        if (route?.params) {
            const { category, provider, reference } = route.params;
            if (category) {
                const cat = BILL_CATEGORIES.find(c => c.key === category);
                if (cat) setSelectedCategory(cat);
            }
            if (provider && reference) {
                setSelectedProvider(provider);
                setReference(reference);
                setStep('reference');
            } else if (category) {
                setStep('provider');
            }
        }
    }, [route?.params]);

    useEffect(() => {
        if (!reference || reference.length < 4 || !selectedProvider || !selectedCategory) {
            setBillData(null);
            return;
        }
        const timer = setTimeout(() => fetchBill(), 600);
        return () => clearTimeout(timer);
    }, [reference]);

    const fetchBill = async () => {
        try {
            setLoading(true);
            setBillData(null);
            const res = await api.get('/bills/fetch', {
                params: { reference, type: selectedCategory.key, providerName: selectedProvider },
            });
            setBillData(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            setBillData({ error: msg });
        } finally {
            setLoading(false);
        }
    };

    const handlePay = () => {
        if (!billData || billData.error || billData.paid) return;
        setShowPinLock(true);
    };

    const executePayment = async () => {
        try {
            setPaying(true);
            const res = await api.post('/bills/pay', {
                reference, type: selectedCategory.key, providerName: selectedProvider,
            });
            setPaidTx(res.data);
            setSuccessModal(true);
        } catch (err) {
            Alert.alert('Payment Failed', err.response?.data?.error || err.message);
        } finally {
            setPaying(false);
        }
    };

    const resetAll = () => {
        setStep('category');
        setSelectedCategory(null);
        setSelectedProvider(null);
        setReference('');
        setBillData(null);
        setProviderSearch('');
        setSuccessModal(false);
        setPaidTx(null);
    };

    const filteredProviders = selectedCategory?.providers.filter(p =>
        p.toLowerCase().includes(providerSearch.toLowerCase())
    ) || [];

    const formatDate = (d) => {
        try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };



    return (
        <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => {
                    if (step === 'category') {
                        navigation.goBack();
                    } else if (step === 'provider') {

                        navigation.setParams({ category: null, provider: null, reference: null });
                        setStep('category');
                        setProviderSearch('');
                    } else if (step === 'reference') {
                        setStep('provider');
                        setReference('');
                        setBillData(null);
                    }
                }}>
                    <Text style={s.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Pay Bills</Text>
                <View style={{ width: 60 }} />
            </View>


            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/*  Category */}
                {step === 'category' && (
                    <>
                        <Text style={s.stepTitle}>What type of bill?</Text>
                        <Text style={s.stepSub}>Select a category to get started</Text>
                        <View style={s.categoryGrid}>
                            {BILL_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[s.categoryCard, { backgroundColor: cat.color, borderColor: cat.borderColor }]}
                                    onPress={() => { setSelectedCategory(cat); setStep('provider'); setProviderSearch(''); }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={s.categoryIcon}>{cat.icon}</Text>
                                    <Text style={s.categoryLabel}>{cat.label}</Text>
                                    <Text style={s.categoryCount}>{cat.providers.length} providers</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/*  Provider */}
                {step === 'provider' && selectedCategory && (
                    <>
                        <Text style={s.stepTitle}>{selectedCategory.icon} {selectedCategory.label}</Text>
                        <Text style={s.stepSub}>Select your provider</Text>
                        {recentBills.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={s.sectionHeader}>Recently Paid</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                    {recentBills.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={s.recentCard}
                                            onPress={() => {
                                                setSelectedProvider(item.receiverName);
                                                setReference(item.reference);
                                                setStep('reference');
                                            }}
                                        >
                                            <Text style={s.recentRef}>{item.reference}</Text>
                                            <Text style={s.recentProvider} numberOfLines={1}>{item.receiverName}</Text>
                                            <View style={s.recentBadge}>
                                                <Text style={s.recentBadgeText}> Pay →</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        <View style={s.searchBox}>
                            <Text style={s.searchIcon}>🔍</Text>
                            <TextInput
                                style={s.searchInput}
                                value={providerSearch}
                                onChangeText={setProviderSearch}
                                placeholder="Search providers..."
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={s.providerList}>
                            {filteredProviders.map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[s.providerRow,
                                    selectedProvider === p && { borderColor: colors.primary, backgroundColor: colors.overlay }
                                    ]}
                                    onPress={() => { setSelectedProvider(p); setStep('reference'); setReference(''); setBillData(null); }}
                                    activeOpacity={0.75}
                                >
                                    <View style={[s.providerDot, { backgroundColor: selectedCategory.borderColor }]} />
                                    <Text style={s.providerName}>{p}</Text>
                                    <Text style={s.providerArrow}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/*  Reference + Bill Preview */}
                {step === 'reference' && selectedProvider && (
                    <>
                        <Text style={s.stepTitle}>Enter Reference</Text>
                        <Text style={s.stepSub}>{selectedCategory.icon} {selectedProvider}</Text>

                        <View style={s.refCard}>
                            <Text style={s.refLabel}>Reference Number</Text>
                            <View style={s.refInputRow}>
                                <TextInput
                                    style={s.refInput}
                                    value={reference}
                                    onChangeText={setReference}
                                    placeholder="e.g. ABC1003"
                                    placeholderTextColor={colors.textMuted}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                                {reference.length >= 4 && (
                                    <TouchableOpacity style={s.fetchBtn} onPress={fetchBill}>
                                        <Text style={s.fetchBtnText}>Search</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={s.refHint}>Find this on your bill letter or online account</Text>
                        </View>

                        {loading && (
                            <View style={s.loadingBox}>
                                <ActivityIndicator color={colors.primary} size="large" />
                                <Text style={s.loadingText}>Looking up your bill...</Text>
                            </View>
                        )}

                        {!loading && billData && !billData.error && (
                            <View style={[s.billPreviewCard,
                            billData.paid && { borderColor: 'rgba(255,77,109,0.4)', backgroundColor: 'rgba(255,77,109,0.05)' }
                            ]}>
                                <View style={s.billPreviewHeader}>
                                    <View style={s.billPreviewIconBox}>
                                        <Text style={{ fontSize: 28 }}>{selectedCategory.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.billPreviewProvider}>{selectedProvider}</Text>
                                        <Text style={s.billPreviewAccount}>{billData.accountName}</Text>
                                    </View>
                                    <View style={[s.billStatusBadge,
                                    { backgroundColor: billData.paid ? 'rgba(255,77,109,0.15)' : 'rgba(0,229,160,0.15)' }
                                    ]}>
                                        <Text style={[s.billStatusText, { color: billData.paid ? colors.error : colors.success }]}>
                                            {billData.paid ? 'PAID' : 'DUE'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={s.billDivider} />
                                <View style={s.billInfoRow}>
                                    <BillInfoItem label="Details" value={billData.accountName} colors={colors} />
                                    <BillInfoItem label="Type" value={billData.billType?.replace('_', ' ')} colors={colors} />
                                </View>
                                <View style={s.billInfoRow}>
                                    <BillInfoItem label="Due Date" value={formatDate(billData.dueDate)} colors={colors} />
                                    <BillInfoItem label="Amount Due" value={`£${Number(billData.amount).toFixed(2)}`} highlight colors={colors} />
                                </View>
                                {!billData.paid ? (
                                    <TouchableOpacity
                                        style={[s.payBtn, paying && { opacity: 0.7 }]}
                                        onPress={handlePay}
                                        disabled={paying}
                                        activeOpacity={0.85}
                                    >
                                        {paying
                                            ? <ActivityIndicator color={isDark ? '#000' : '#fff'} />
                                            : <Text style={s.payBtnText}>💳 Pay £{Number(billData.amount).toFixed(2)} Now</Text>
                                        }
                                    </TouchableOpacity>
                                ) : (
                                    <View style={s.alreadyPaidBox}>
                                        <Text style={s.alreadyPaidText}>✅ This bill has already been paid</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {!loading && billData?.error && (
                            <View style={s.errorBox}>
                                <Text style={s.errorIcon}>⚠️</Text>
                                <Text style={s.errorText}>{billData.error}</Text>
                            </View>
                        )}

                        {!loading && !billData && reference.length >= 4 && (
                            <View style={s.hintBox}>
                                <Text style={s.hintIcon}>🔎</Text>
                                <Text style={s.hintText}>No bill found for this reference</Text>
                                <Text style={s.hintSub}>Check the reference number and try again</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Success Modal */}
            <Modal visible={successModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <View style={s.successIconBox}>
                            <Text style={{ fontSize: 48 }}>🎉</Text>
                        </View>
                        <Text style={s.successTitle}>Payment Successful!</Text>
                        <Text style={s.successSub}>Your {selectedCategory?.label} bill has been paid</Text>
                        {paidTx && (
                            <View style={s.successDetails}>
                                <SuccessRow label="Provider" value={paidTx.receiverName} colors={colors} />
                                <SuccessRow label="Amount" value={`£${Number(paidTx.amount).toFixed(2)}`} colors={colors} />
                                <SuccessRow label="Reference" value={reference} colors={colors} />
                                <SuccessRow label="Transaction ID" value={paidTx.transactionId?.slice(0, 16) + '...'} mono colors={colors} />
                            </View>
                        )}
                        <TouchableOpacity style={s.doneBtn} onPress={resetAll}>
                            <Text style={s.doneBtnText}>Done ✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.historyBtn} onPress={() => { resetAll(); navigation.navigate('Transactions'); }}>
                            <Text style={s.historyBtnText}>View Transaction History →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showPinLock && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: colors.bg, zIndex: 999,
                }}>
                    <LockScreen
                        mode="transaction"
                        onUnlock={() => {
                            setShowPinLock(false);
                            executePayment();
                        }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

function BillInfoItem({ label, value, highlight, colors }) {
    const s = makeStyles(colors);
    return (
        <View style={s.billInfoItem}>
            <Text style={s.billInfoLabel}>{label}</Text>
            <Text style={[s.billInfoValue, highlight && { color: colors.primary, fontSize: 18, fontWeight: '900' }]}>
                {value}
            </Text>
        </View>
    );
}

function SuccessRow({ label, value, mono, colors }) {
    const s = makeStyles(colors);
    return (
        <View style={s.successRow}>
            <Text style={s.successRowLabel}>{label}</Text>
            <Text style={[s.successRowValue, mono && { fontFamily: 'monospace', fontSize: 11 }]}>{value}</Text>
        </View>
    );
}

// All styles 
const makeStyles = (colors) => StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    scroll: { padding: 24, paddingBottom: 60 },
    stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 16 },
    stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepDotText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
    stepTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 6 },
    stepSub: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    categoryCard: { width: '47%', borderRadius: radius.xl, padding: 20, borderWidth: 1.5, alignItems: 'center', gap: 8 },
    categoryIcon: { fontSize: 36 },
    categoryLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    categoryCount: { color: colors.textMuted, fontSize: 11 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 10,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
    providerList: { gap: 8 },
    providerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12,
    },
    providerDot: { width: 8, height: 8, borderRadius: 4 },
    providerName: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    providerArrow: { color: colors.textMuted, fontSize: 18 },
    refCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 20,
    },
    refLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 10 },
    refInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    refInput: {
        flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 14, paddingVertical: 12,
        color: colors.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1,
    },
    fetchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
    fetchBtnText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
    refHint: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
    loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
    loadingText: { color: colors.textMuted, fontSize: 14 },
    billPreviewCard: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
    },
    billPreviewHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14 },
    billPreviewIconBox: {
        width: 56, height: 56, borderRadius: 16, backgroundColor: colors.overlay,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    },
    billPreviewProvider: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    billPreviewAccount: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    billStatusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
    billStatusText: { fontSize: 11, fontWeight: '800' },
    billDivider: { height: 1, backgroundColor: colors.border },
    billInfoRow: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    billInfoItem: { flex: 1 },
    billInfoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 4 },
    billInfoValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    payBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center' },
    payBtnText: { color: colors.bg, fontSize: 16, fontWeight: '900' },
    alreadyPaidBox: {
        margin: 16, backgroundColor: 'rgba(255,77,109,0.1)', borderRadius: radius.lg,
        paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,77,109,0.3)',
    },
    alreadyPaidText: { color: colors.error, fontSize: 14, fontWeight: '700' },
    errorBox: {
        alignItems: 'center', paddingVertical: 24, backgroundColor: 'rgba(255,77,109,0.08)',
        borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,77,109,0.25)', gap: 8,
    },
    errorIcon: { fontSize: 28 },
    errorText: { color: colors.error, fontSize: 14, fontWeight: '600' },
    hintBox: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    hintIcon: { fontSize: 32 },
    hintText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
    hintSub: { color: colors.textMuted, fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        padding: 32, paddingBottom: 48, alignItems: 'center', gap: 12,
        borderTopWidth: 1, borderColor: colors.border,
    },
    successIconBox: {
        width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(0,229,160,0.1)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
        borderColor: 'rgba(0,229,160,0.3)', marginBottom: 4,
    },
    successTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
    successSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    successDetails: {
        width: '100%', backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 8,
    },
    successRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    successRowLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    successRowValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    doneBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    doneBtnText: { color: colors.bg, fontSize: 16, fontWeight: '900' },
    historyBtn: {
        width: '100%', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
        paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    historyBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    sectionHeader: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 5 },
    recentCard: {
        backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15,
        marginRight: 12, borderWidth: 1, borderColor: colors.border, width: 150,
    },
    recentRef: { color: colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    recentProvider: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontWeight: '600' },
    recentBadge: {
        marginTop: 10, backgroundColor: colors.overlay,
        paddingVertical: 4, borderRadius: 4, alignItems: 'center',
    },
    recentBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
});