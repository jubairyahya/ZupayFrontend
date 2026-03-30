import React, { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
import { SecurityProvider } from './src/context/SecurityContext.jsx';
import { ThemeProvider } from './src/context/ThemeContext.jsx';


import WelcomeScreen from './src/screens/WelcomeScreen.jsx';
import LoginScreen from './src/screens/LoginScreen.jsx';
import RegisterScreen from './src/screens/RegisterScreen.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import P2PScreen from './src/screens/P2PScreen.jsx';
import LockScreen from './src/screens/LockScreen.jsx';
import BillScreen from './src/screens/BillScreen';
import {
  TransactionScreen,
  ProfileScreen,
  LinkBankScreen,
} from './src/screens/OtherScreens.jsx';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user } = useAuth();
  const [showLock, setShowLock] = useState(false);

  const hasUnlockedInitially = useRef(false); 
  
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);
  const LOCK_TIMEOUT = 30 * 1000; 


  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState === 'background') {
        backgroundTime.current = Date.now();
      }
      if (appState.current === 'background' && nextState === 'active') {
        const elapsed = Date.now() - (backgroundTime.current || 0);
        if (user && elapsed > LOCK_TIMEOUT) {
          setShowLock(true);
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [user]);

  useEffect(() => {
    if (user && !hasUnlockedInitially.current) {
      setShowLock(true);
    } else if (!user) {
      // Reset when user logs out so it works next time they login
      hasUnlockedInitially.current = false; 
      setShowLock(false);
    }
  }, [user]);

  const handleFinalUnlock = () => {
    hasUnlockedInitially.current = true; // Mark that we've passed the gate
    setShowLock(false);
  };


  if (user && showLock) {
    return (
      <LockScreen 
        onUnlock={handleFinalUnlock} 
      />
    );
  }

  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen name="P2P" component={P2PScreen} />
            <Stack.Screen name="Transactions" component={TransactionScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="LinkBank" component={LinkBankScreen} />
            <Stack.Screen name="SetupPin" component={LockScreen} />
            <Stack.Screen name="Bills" component={BillScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SecurityProvider>
          <RootNavigator />
        </SecurityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}