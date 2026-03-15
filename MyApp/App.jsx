import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
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
  return token ? <AppStack /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}