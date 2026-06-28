/**
 * TEMPORARY DEBUG layout v2 — no splash-screen control at all (lets the native
 * splash auto-hide), plus load markers so we can confirm the new bundle is live.
 * If you see a magenta screen with "KNOWABLE v2", rendering works and the splash
 * was the problem. Will be reverted.
 */
import React from 'react';
import { Text, View } from 'react-native';

console.log('[Knowable] DEBUG v2 module loaded');

export default function RootLayout() {
  console.log('[Knowable] DEBUG v2 render');
  return (
    <View style={{ flex: 1, backgroundColor: '#D85A30', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#F0EBE0' }}>KNOWABLE v2</Text>
    </View>
  );
}
