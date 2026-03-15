import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
import WelcomeScreen from './src/screens/WelcomeScreen.jsx';
import LoginScreen from './src/screens/LoginScreen.jsx';
import RegisterScreen from './src/screens/RegisterScreen.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import { colors } from './src/theme/theme.js';

const Stack = createNativeStackNavigator();

// Placeholder for screens coming in future commits
function PlaceholderScreen({ route }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '800' }}>
        {route.name}
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 10 }}>Coming soon...</Text>
    </View>
  );
}

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
      <Stack.Screen name="P2P" component={PlaceholderScreen} />
      <Stack.Screen name="Scan" component={PlaceholderScreen} />
      <Stack.Screen name="Transactions" component={PlaceholderScreen} />
      <Stack.Screen name="Profile" component={PlaceholderScreen} />
      <Stack.Screen name="LinkBank" component={PlaceholderScreen} />
      <Stack.Screen name="Bills" component={PlaceholderScreen} />
      <Stack.Screen name="Chat" component={PlaceholderScreen} />
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