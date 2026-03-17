import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
import { SecurityProvider } from './src/context/SecurityContext.jsx';

import WelcomeScreen from './src/screens/WelcomeScreen.jsx';
import LoginScreen from './src/screens/LoginScreen.jsx';
import RegisterScreen from './src/screens/RegisterScreen.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import P2PScreen from './src/screens/P2PScreen.jsx';
import LockScreen from './src/screens/LockScreen.jsx';
import { ThemeProvider } from './src/context/ThemeContext.jsx';
import {
  TransactionScreen,
  ProfileScreen,
  LinkBankScreen,
} from './src/screens/OtherScreens.jsx';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user } = useAuth(); 

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
         
          <>
            <Stack.Screen name="LockScreen" component={LockScreen} />
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen name="P2P" component={P2PScreen} />
            <Stack.Screen name="Transactions" component={TransactionScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="LinkBank" component={LinkBankScreen} />
          </>
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