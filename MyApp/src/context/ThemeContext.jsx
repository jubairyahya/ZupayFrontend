import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../theme/theme.js';

const ThemeContext = createContext();

const saveTheme = async (isDark) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('zupay_theme', isDark ? 'dark' : 'light');
  } else {
    await AsyncStorage.setItem('zupay_theme', isDark ? 'dark' : 'light');
  }
};

const loadTheme = async () => {
  if (Platform.OS === 'web') {
    const saved = localStorage.getItem('zupay_theme');
    return saved ? saved === 'dark' : false; // default light
  } else {
    const saved = await AsyncStorage.getItem('zupay_theme');
    return saved ? saved === 'dark' : false; // default light
  }
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false); // default light
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    loadTheme().then((val) => {
      setIsDark(val);
      setThemeLoaded(true);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      saveTheme(!prev);
      return !prev;
    });
  };

  const colors = isDark ? darkColors : lightColors;

  if (!themeLoaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}