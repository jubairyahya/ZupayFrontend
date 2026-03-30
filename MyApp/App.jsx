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
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false); // New state

  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);
  const LOCK_TIMEOUT = 30 * 1000;

  // Effect for Timer (Background/Foreground)
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

  // EFFECT FOR INITIAL LOGIN: Trigger lock when user first logs in
  useEffect(() => {
    if (user && !isInitialCheckDone) {
      setShowLock(true);
      setIsInitialCheckDone(true);
    }
    if (!user) {
      setIsInitialCheckDone(false); // Reset when they log out
    }
  }, [user]);

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
            {showLock && (
              <Stack.Screen name="SessionLock">
                {(props) => (
                  <LockScreen
                    {...props}
                    onUnlock={() => setShowLock(false)}
                  />
                )}
              </Stack.Screen>
            )}
            <Stack.Screen name="Main" component={HomeScreen} />
            {/* ... other screens ... */}
            <Stack.Screen name="SetupPin" component={LockScreen} />
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