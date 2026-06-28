/**
 * TEMPORARY DEBUG layout — isolates "splash stuck on top" vs a navigator/screen
 * problem. If the simulator shows a yellow screen with "KNOWABLE TEST OK", then
 * rendering + splash-hide work and the issue is in the Stack/screens. If it's
 * still dark, the native splash isn't hiding (or the RN root isn't displaying).
 * Will be reverted once we know which it is.
 */
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#E8C547', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1a1a1a' }}>KNOWABLE TEST OK</Text>
    </View>
  );
}
