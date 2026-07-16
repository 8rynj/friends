/**
 * Root layout — loads Space Grotesk (used everywhere, §3), reliably hides the
 * splash, and registers the navigation stack. Onboarding and the icebreaker
 * present modally; tabs and the connection profile push normally.
 *
 * Splash handling is deliberately fail-safe: render once fonts resolve (loaded
 * OR errored) and the store hydrates, with a 3s timeout backstop, and hide the
 * splash from the root view's onLayout (most reliable) plus an effect fallback —
 * so startup can never get stuck behind a blank splash.
 *
 * Also owns push notifications (§Notifications): registers/clears this
 * device's Expo push token as the Settings toggles change, and routes tapped
 * notifications to their connection profile (src/notifications/).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { colors } from '../src/theme';
import { useStore } from '../src/store/useStore';
import { registerForPushTokenAsync, useNotificationDeepLinks } from '../src/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const router = useRouter();
  const hasHydrated = useStore((s) => s.hasHydrated);
  const pushNudges = useStore((s) => s.settings.pushNudges);
  const pushUpdates = useStore((s) => s.settings.pushUpdates);
  const pushToken = useStore((s) => s.pushToken);
  const setPushToken = useStore((s) => s.setPushToken);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useNotificationDeepLinks(router);

  // Register (or clear) this device's push token as the Settings toggles change (§Notifications).
  useEffect(() => {
    if (!hasHydrated) return;
    const pushEnabled = pushNudges || pushUpdates;
    if (pushEnabled && !pushToken) {
      registerForPushTokenAsync().then((token) => {
        if (token) setPushToken(token);
      });
    } else if (!pushEnabled && pushToken) {
      setPushToken(null);
    }
  }, [hasHydrated, pushNudges, pushUpdates, pushToken, setPushToken]);

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
