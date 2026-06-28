/**
 * Root layout — loads Space Grotesk (used everywhere, §3), reliably hides the
 * splash, and registers the navigation stack. Onboarding and the icebreaker
 * present modally; tabs and the connection profile push normally.
 *
 * Splash handling is deliberately fail-safe: render once fonts resolve (loaded
 * OR errored) and the store hydrates, with a 3s timeout backstop, and hide the
 * splash from the root view's onLayout (most reliable) plus an effect fallback —
 * so startup can never get stuck behind a blank splash.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { useNudgeReminders } from '../src/hooks/useNudgeReminders';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const hasHydrated = useStore((s) => s.hasHydrated);

  // Keep local nudge reminders in sync with store state (native-only).
  useNudgeReminders();

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const ready = ((loaded || !!fontError) && hasHydrated) || timedOut;

  // Hide the splash from the root view's onLayout — fires after the first real
  // layout pass, the most reliable moment for hideAsync.
  const onLayoutRootView = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Effect fallback in case onLayout doesn't fire.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
          <Stack.Screen name="settings" />
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
