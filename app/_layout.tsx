/**
 * Root layout — loads Space Grotesk (used everywhere, §3), keeps the splash up
 * until fonts are ready, and registers the navigation stack. Onboarding and the
 * icebreaker present modally; tabs and the connection profile push normally.
 */
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { colors } from '../src/theme';
import { useStore } from '../src/store/useStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  // Wait for persisted state to rehydrate before rendering so screens never
  // flash seed data over the user's saved profile/connections.
  const hasHydrated = useStore((s) => s.hasHydrated);

  // Fail-safe: never block startup forever. Render once fonts resolve (loaded
  // OR errored) and the store hydrates — and force-render after 4s regardless,
  // so a font/hydration hiccup can't leave a blank splash.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const fontsResolved = loaded || !!fontError;
  const ready = (fontsResolved && hasHydrated) || timedOut;

  // Diagnostic — shows in the Metro terminal which gate (if any) is stalling.
  useEffect(() => {
    console.log('[Knowable] startup gate', {
      fontsLoaded: loaded,
      fontError: fontError ? String(fontError) : null,
      hasHydrated,
      timedOut,
    });
  }, [loaded, fontError, hasHydrated, timedOut]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.cream },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="connection/[id]" />
          <Stack.Screen name="edit/[facet]" />
          <Stack.Screen name="connect" />
          <Stack.Screen name="claim/[id]" />
          <Stack.Screen name="add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="find" />
          <Stack.Screen name="invite" />
          <Stack.Screen name="icebreaker" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="onboarding/index"
            options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.nearBlack } }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
