import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/theme.js';

export default function LockScreen({ onUnlock, mode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>🔐</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>
        {mode === 'transaction' ? 'Confirm Transaction' : 'Unlock ZuPay'}
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 14, width: 200, alignItems: 'center' }}
        onPress={onUnlock}
      >
        <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 16 }}>Confirm →</Text>
      </TouchableOpacity>
    </View>
  );
}