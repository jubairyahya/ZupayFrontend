import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';

const SecurityContext = createContext();

//  Hashing 
const hashPin = async (pin, userId) => {
 const salted = `${pin}:${userId}:zupay_salt_v1`;
 if (Platform.OS === 'web') {
    const encoder = new TextEncoder();
    const data = encoder.encode(salted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const ExpoCrypto = await import('expo-crypto');
    return await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      salted
    );
  }
};

// Storage keyed by userId 
const pinKey = (userId) => `zupay_pin_${userId}`;

const savePin = async (userId, hashedPin) => {
  const key = pinKey(userId);
  if (Platform.OS === 'web') {
    if (hashedPin) localStorage.setItem(key, hashedPin);
    else localStorage.removeItem(key);
  } else {
    if (hashedPin) await AsyncStorage.setItem(key, hashedPin);
    else await AsyncStorage.removeItem(key);
  }
};

const loadPin = async (userId) => {
  const key = pinKey(userId);
  if (Platform.OS === 'web') {
    return localStorage.getItem(key) || null;
  } else {
    return await AsyncStorage.getItem(key);
  }
};

// Provider 
export function SecurityProvider({ children }) {
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS !== 'web') {
        try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricsAvailable(compatible && enrolled);
        } catch {
          setBiometricsAvailable(false);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Does THIS user have a PIN stored on this device/browser?
  const hasPinForUser = async (userId) => {
    if (!userId) return false;
    const stored = await loadPin(userId);
    return !!stored;
  };

  // Save hashed PIN for this user
  const setupPin = async (userId, rawPin) => {
    const hashed = await hashPin(rawPin,userId);
    await savePin(userId, hashed);
  };

  // Verify PIN for this user — always async
  const verifyPin = async (userId, rawPin) => {
    const stored = await loadPin(userId);
    if (!stored) return false;
    const hashed = await hashPin(rawPin, userId);
    return hashed === stored;
  };

  // Clear PIN for this user (e.g. on logout)
  const clearPinForUser = async (userId) => {
    await savePin(userId, null);
  };

  const authenticateWithBiometrics = async () => {
    if (!biometricsAvailable) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock ZuPay',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  };

  if (loading) return null;

  return (
    <SecurityContext.Provider value={{
      biometricsAvailable,
      hasPinForUser,
      setupPin,
      verifyPin,
      clearPinForUser,
      authenticateWithBiometrics,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}