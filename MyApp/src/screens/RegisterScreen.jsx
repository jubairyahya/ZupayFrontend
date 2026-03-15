import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/theme.js';

export default function RegisterScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textPrimary, fontSize: 20 }}>Register </Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.primary, marginTop: 20 }}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}