import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import api, { setAuthToken, registerTokenGetter } from '../services/api.js';
import { API_URLS } from '../services/api.js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';



const AuthContext = createContext();


const saveToken = async (token) => {
  if (Platform.OS === 'web') {
    return;
  } else {

    if (token) await SecureStore.setItemAsync('zupay_token', token);
    else await SecureStore.deleteItemAsync('zupay_token');
  }
};

const loadToken = async () => {
  if (Platform.OS === 'web') return null; 
  return await SecureStore.getItemAsync('zupay_token');
};

const saveUser = async (userData) => {
  if (Platform.OS === 'web') {
    if (userData) sessionStorage.setItem('zupay_user', JSON.stringify(userData));
    else sessionStorage.removeItem('zupay_user');
  } else {
    if (userData) await AsyncStorage.setItem('zupay_user', JSON.stringify(userData));
    else await AsyncStorage.removeItem('zupay_user');
  }
};

const loadUser = async () => {
  if (Platform.OS === 'web') {
    try {
      const u = sessionStorage.getItem('zupay_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  } else {
    try {
      const u = await AsyncStorage.getItem('zupay_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }
};

export function AuthProvider({ children }) {

  const tokenRef = useRef(null);
  const balanceRef = useRef(0);
  const isBusinessModeRef = useRef(false);
  const [user, setUser] = useState(() => loadUser());
  const [userLoading, setUserLoading] = useState(true);
  const [isBusinessMode, setIsBusinessMode] = useState(false);

  useEffect(() => {
    registerTokenGetter(() => tokenRef.current);
  }, []);
  useEffect(() => {
    const init = async () => {
      const savedUser = await loadUser();

      if (Platform.OS !== 'web') {
        const savedToken = await SecureStore.getItemAsync('zupay_token');
        console.log('TOKEN FROM SECURESTORE:', savedToken ? 'EXISTS' : 'NULL');

        if (savedToken) {

          tokenRef.current = savedToken;
          setAuthToken(savedToken);
          setUser(savedUser);
          balanceRef.current = Number(savedUser?.bankBalance || 0);
        } else {

          console.log('NO TOKEN — forcing re-login');
          await AsyncStorage.removeItem('zupay_user');
          setUser(null);
        }
      } else {

        setUser(savedUser);
        balanceRef.current = Number(savedUser?.bankBalance || 0);
      }

      setUserLoading(false);
    };
    init();
  }, []);


  if (userLoading) return null;
  const toggleBusinessMode = () => {
    const newState = !isBusinessMode;
    setIsBusinessMode(newState);
    isBusinessModeRef.current = newState;
    if (newState) {
      Speech.speak("Business mode on.");
    } else {
      Speech.speak("Business mode off.");
    }
  };
  const login = async (userData, token = null) => {
    console.log('LOGIN CALLED, token:', token ? 'EXISTS' : 'NULL');
    setUser(userData);
    balanceRef.current = Number(userData?.bankBalance || 0);
    await saveUser(userData);
    if (Platform.OS !== 'web' && token) {
      tokenRef.current = token;
      setAuthToken(token);
      await SecureStore.setItemAsync('zupay_token', token);
      console.log('TOKEN SAVED TO SECURESTORE');
    }
  };

  const logout = async () => {
    tokenRef.current = null;
    setAuthToken(null);
    setUser(null);
    await saveUser(null);
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync('zupay_token');
    }
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    saveUser(updated);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get(API_URLS.AUTH.PROFILE);
      const data = res.data;

      const newBalance = Number(data.bankBalance || 0);
      const oldBalance = balanceRef.current;

      // business mode 
      if (isBusinessModeRef.current && newBalance > oldBalance) {
        const difference = (newBalance - oldBalance).toFixed(2);
        Speech.speak(`Payment received. £${difference} on ZuPay.`, {
          language: 'en-GB',
          pitch: 1.0,
          rate: 0.85,
        });
        Vibration.vibrate([0, 400, 200, 400]);
      }

      balanceRef.current = newBalance;

      const updated = {
        ...user,
        bankBalance: data.bankBalance,
        name: data.name,
        uniqueUserId: data.uniqueUserId,
        qrCode: data.qrCode,
        bankLinked: data.bankLinked,
      };

      setUser(updated);
      saveUser(updated);
    } catch (e) {
      console.log('Refresh error:', e);
    }
  };
  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateUser,
      refreshUser,
      isBusinessMode,
      toggleBusinessMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}