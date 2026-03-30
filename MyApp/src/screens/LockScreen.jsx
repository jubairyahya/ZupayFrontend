import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Platform, Vibration,
} from 'react-native';
import { radius } from '../theme/theme.js';
import { useSecurity } from '../context/SecurityContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const PIN_LENGTH = 4;

export default function LockScreen({ navigation, route, onUnlock }) {
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const {
    verifyPin, setupPin, hasPinForUser,
    authenticateWithBiometrics, biometricsAvailable,
  } = useSecurity();

  const userId = user?.uniqueUserId ?? route?.params?.userId;

  const [mode, setMode] = useState(route?.params?.mode ?? null);
  const [step, setStep] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const determineMode = async () => {
      if (!userId) return;

     if (route?.name === 'SetupPin') {
  const exists = await hasPinForUser(userId);
  if (exists) {
    
    setMode('setup');
    setStep('enter'); 
    setChecking(false);
  } else {
    
    setMode('setup');
    setStep('create');
    setChecking(false);
  }
  return;
}

      if (route?.params?.mode || onUnlock) {
        const resolvedMode = onUnlock ? 'transaction' : route.params.mode;
        setMode(resolvedMode);
        setStep(resolvedMode === 'setup' ? 'create' : 'enter');
        setChecking(false);
        return;
      }

      const exists = await hasPinForUser(userId);
      const resolvedMode = exists ? 'unlock' : 'setup';
      setMode(resolvedMode);
      setStep(resolvedMode === 'setup' ? 'create' : 'enter');
      setChecking(false);
    };

    determineMode();
  }, [userId]);

  useEffect(() => {
    if (mode === 'unlock' && biometricsAvailable && !checking) {
      setTimeout(() => tryBiometrics(), 400);
    }
  }, [mode, checking]);

  const handleUnlock = () => {
    if (onUnlock) {
      onUnlock();
    } else if (navigation) {
      const routeName = route?.name;
      if (routeName === 'SetupPin') {
        navigation.replace('Profile');
      } else {
        navigation.replace('Main');
      }
    }
  };

  const tryBiometrics = async () => {
    const success = await authenticateWithBiometrics();
    if (success) handleUnlock();
  };

  const shake = () => {
    if (Platform.OS !== 'web') Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start();
  };

  const animateDot = (index) => {
    Animated.sequence([
      Animated.timing(dotAnims[index], { toValue: 1, duration: 100, useNativeDriver: false }),
      Animated.timing(dotAnims[index], { toValue: 0.8, duration: 80, useNativeDriver: false }),
    ]).start();
  };

  const handlePress = (digit) => {
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= PIN_LENGTH) return;
    const newPin = current + digit;
    animateDot(current.length);

    if (step === 'create') {
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => { setStep('confirm'); setError(''); }, 200);
      }
    } else if (step === 'confirm') {
      setConfirmPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        setTimeout(async () => {
          if (newPin === pin) {
            try {
              if (!userId) { setError('User ID missing. Please log in again.'); return; }
              await setupPin(userId, newPin);
              handleUnlock();
            } catch (e) {
              console.log('setupPin error:', e);
              setError('Failed to save PIN. Try again.');
              setConfirmPin('');
            }
          } else {
            shake();
            setError('PINs do not match. Try again.');
            setConfirmPin('');
          }
        }, 200);
      }
    } else {
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        setTimeout(async () => {
          const ok = await verifyPin(userId, newPin);
if (ok) {
  if (mode === 'setup') {
    // Old PIN verified → now let them create new one
    setStep('create');
    setPin('');
    setError('');
  } else {
    handleUnlock();
  }
} else {
  shake();
  setError('Incorrect PIN. Try again.');
  setPin('');
}
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'confirm') setConfirmPin((p) => p.slice(0, -1));
    else setPin((p) => p.slice(0, -1));
    setError('');
  };

  if (checking || !step) return null;

  const currentLength = step === 'confirm' ? confirmPin.length : pin.length;

  const getTitle = () => {
     if (mode === 'setup' && step === 'enter') return 'Enter Current PIN';
    if (step === 'create') return 'Create PIN';
    if (step === 'confirm') return 'Confirm PIN';
    if (mode === 'transaction') return 'Confirm Transaction';
    return 'Welcome Back';
  };

  const getSubtitle = () => {
     if (mode === 'setup' && step === 'enter') return 'Enter your current PIN to continue';
    if (step === 'create') return 'Set a 4-digit PIN to secure your account';
    if (step === 'confirm') return 'Enter your PIN again to confirm';
    if (mode === 'transaction') return 'Enter your PIN to authorise this payment';
    return 'Enter your PIN to continue';
  };

  const KEYPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'del'],
  ];

  // styles 
  const styles = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>{mode === 'transaction' ? '💸' : '🔐'}</Text>
        </View>

        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < currentLength;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                  filled && {
                    transform: [{
                      scale: dotAnims[i].interpolate({
                        inputRange: [0, 1], outputRange: [1, 1.3],
                      })
                    }]
                  }
                ]}
              />
            );
          })}
        </Animated.View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key) => {
                if (key === 'bio') {
                  return (
                    <TouchableOpacity
                      key="bio"
                      style={[
                        styles.key, styles.keySpecial,
                        (!biometricsAvailable || step === 'create' || step === 'confirm') && { opacity: 0.2 }
                      ]}
                      onPress={tryBiometrics}
                      disabled={!biometricsAvailable || step === 'create' || step === 'confirm'}
                    >
                      <Text style={styles.keySpecialText}>
                        {Platform.OS === 'ios' ? '🪪' : '👁'}
                      </Text>
                      <Text style={styles.keyBioLabel}>
                        {Platform.OS === 'ios' ? 'Face ID' : 'Bio'}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity
                      key="del"
                      style={[styles.key, styles.keySpecial]}
                      onPress={handleDelete}
                    >
                      <Text style={styles.keySpecialText}>⌫</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.key}
                    onPress={() => handlePress(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}


// Styles 

const makeStyles = (colors, isDark) => StyleSheet.create({
 container: { 
  flex: 1,
  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
},
  orb1: {
    position: 'absolute', top: -80, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: colors.primary, opacity: isDark ? 0.06 : 0.08,
  },
  orb2: {
    position: 'absolute', bottom: 50, left: -100,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: colors.primaryLight, opacity: isDark ? 0.04 : 0.06,
  },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
    marginBottom: 28,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 30px ${colors.primary}26, 6px 6px 14px rgba(0,0,0,0.2)` }
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.2 : 0.1,
          shadowRadius: 20,
          elevation: 10,
        }),
  },
  logoIcon: { fontSize: 40 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 40, lineHeight: 20 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 10px ${colors.primary}99` }
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.8 : 0.4,
          shadowRadius: 8,
        }),
  },
  errorText: { color: colors.error, fontSize: 13, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  keypad: { width: '100%', maxWidth: 320, marginTop: 20, gap: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  key: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
    ...(Platform.OS === 'web'
      ? { boxShadow: `4px 4px 10px rgba(0,0,0,${isDark ? 0.5 : 0.15}), -2px -2px 6px rgba(255,255,255,${isDark ? 0.02 : 0.8})` }
      : {
          shadowColor: isDark ? '#000' : '#94A3B8',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: isDark ? 0.5 : 0.2,
          shadowRadius: 8,
          elevation: 6,
        }),
  },
  keyText: { color: colors.textPrimary, fontSize: 26, fontWeight: '600' },
  keySpecial: { backgroundColor: 'transparent', borderColor: 'transparent', shadowColor: 'transparent', elevation: 0 },
  keySpecialText: { fontSize: 24, color: colors.textSecondary },
  keyBioLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});