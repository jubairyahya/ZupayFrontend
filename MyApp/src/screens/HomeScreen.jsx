import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>Welcome {user?.name}!</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Home screen coming in Commit 3</Text>
      <TouchableOpacity onPress={logout} style={{ borderWidth: 1, borderColor: colors.error, padding: 12, borderRadius: 12 }}>
        <Text style={{ color: colors.error }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}