import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { darkColors, lightColors } from '../theme/theme.js';

const ThemeContext = createContext();

const saveTheme = (isDark) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('zupay_theme', isDark ? 'dark' : 'light');
  }
};

const loadTheme = () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('zupay_theme') !== 'light';
  }
  return true; // default dark
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => loadTheme());

  const toggleTheme = () => {
    setIsDark(prev => {
      saveTheme(!prev);
      return !prev;
    });
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}