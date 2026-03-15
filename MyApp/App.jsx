import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
import { SecurityProvider, useSecurity } from './src/context/SecurityContext.jsx';

import WelcomeScreen from './src/screens/WelcomeScreen.jsx';
import LoginScreen from './src/screens/LoginScreen.jsx';
import RegisterScreen from './src/screens/RegisterScreen.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import P2PScreen from './src/screens/P2PScreen.jsx';
import LockScreen from './src/screens/LockScreen.jsx';

import {
  BillsScreen,
  TransactionScreen,
  ProfileScreen,
  LinkBankScreen,
} from './src/screens/OtherScreens.jsx';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="P2P" component={P2PScreen} />
      <Stack.Screen name="Transactions" component={TransactionScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="LinkBank" component={LinkBankScreen} />
      <Stack.Screen name="Bills" component={BillsScreen} />
      <Stack.Screen
        name="SetupPin"
        children={({ navigation }) => (
          <LockScreen mode="setup" onUnlock={() => navigation.goBack()} />
        )}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { token } = useAuth();
  const { isLocked, unlock, hasPinSetup } = useSecurity();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    setAppReady(true);
  }, []);

  if (!appReady) return null;

  // Not logged in
  if (!token) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  // Logged in but locked
  if (isLocked) {
    // First time — no PIN yet
    if (!hasPinSetup) {
      return <LockScreen mode="setup" onUnlock={() => unlock()} />;
    }
    // Has PIN — show unlock screen
    return <LockScreen mode="unlock" onUnlock={() => unlock()} />;
  }

  // Logged in and unlocked
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SecurityProvider>
        <RootNavigator />
      </SecurityProvider>
    </AuthProvider>
  );
}