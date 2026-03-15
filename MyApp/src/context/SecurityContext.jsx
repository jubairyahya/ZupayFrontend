import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SecurityContext = createContext();

const savePin = async (pin) => {
  if (Platform.OS === 'web') {
    if (pin) localStorage.setItem('zupay_pin', pin);
    else localStorage.removeItem('zupay_pin');
  } else {
    if (pin) await AsyncStorage.setItem('zupay_pin', pin);
    else await AsyncStorage.removeItem('zupay_pin');
  }
};

const loadPin = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('zupay_pin') || null;
  } else {
    return await AsyncStorage.getItem('zupay_pin');
  }
};

export function SecurityProvider({ children }) {
  const [pin, setPin] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const savedPin = await loadPin();
    setPin(savedPin);

    if (Platform.OS !== 'web') {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricsAvailable(compatible && enrolled);
      } catch (e) {
        setBiometricsAvailable(false);
      }
    }

    if (Platform.OS === 'web' && !savedPin) {
      setIsLocked(false);
    } else {
      setIsLocked(true);
    }

    setLoading(false);
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
    } catch (e) {
      return false;
    }
  };

  const verifyPin = (enteredPin) => enteredPin === pin;

  const setupPin = async (newPin) => {
    setPin(newPin);
    await savePin(newPin);
  };

  const removePin = async () => {
    setPin(null);
    await savePin(null);
  };

  const unlock = () => setIsLocked(false);
  const lock = () => setIsLocked(true);
  const hasPinSetup = !!pin;

  if (loading) return null;

  return (
    <SecurityContext.Provider value={{
      pin,
      isLocked,
      hasPinSetup,
      biometricsAvailable,
      setupPin,
      removePin,
      verifyPin,
      authenticateWithBiometrics,
      unlock,
      lock,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}