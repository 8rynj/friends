/**
 * Root layout — loads Space Grotesk (used everywhere, §3), reliably hides the
 * splash, registers the navigation stack, and (when Supabase is configured)
 * gates the app behind phone auth. Onboarding and the icebreaker present
 * modally; tabs and the connection profile push normally.
 *
 * Splash handling is deliberately fail-safe: render once fonts resolve (loaded
 * OR errored), the store hydrates, AND the auth session has resolved, with a
 * 3s timeout backstop, and hide the splash from the root view's onLayout
 * (most reliable) plus an effect fallback — so startup can never get stuck
 * behind a blank splash.
 *
 * Auth gate: every route redirects to /auth/phone when signed out, except the
 * auth screens themselves and the claim/[id] preview (Spec §5C — invite links
 * are meant to be previewable with "no account needed"; only the claim action
 * itself requires signing in). `redirect` carries the original destination
 * through the auth flow so e.g. tapping a claim link while signed out lands
 * back on that same claim screen once verified. When Supabase isn't
 * configured (`useAuthStore` status is `unconfigured`), the gate is skipped
 * entirely and the app runs on mock data exactly as it did before phone auth
 * existed — see src/store/useAuthStore.ts.
 *
 * Also owns push notifications (§Notifications): registers/clears this
 * device's Expo push token as the Settings toggles change, and routes tapped
 * notifications to their connection profile (src/notifications/).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { colors } from '../src/theme';
import { ErrorBoundary } from '../src/components';
import { startSupabaseSync, stopSupabaseSync, useStore } from '../src/store/useStore';
import { useNudgeReminders } from '../src/hooks/useNudgeReminders';
import { useAuthStore } from '../src/store/useAuthStore';
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
  const completeProfile = useStore((s) => s.completeProfile);
  const pushNudges = useStore((s) => s.settings.pushNudges);
  const pushUpdates = useStore((s) => s.settings.pushUpdates);
  const pushToken = useStore((s) => s.pushToken);
  const setPushToken = useStore((s) => s.setPushToken);

  const initAuth = useAuthStore((s) => s.init);
  const authStatus = useAuthStore((s) => s.status);
  const authPhone = useAuthStore((s) => s.phone);
  const authUserId = useAuthStore((s) => s.userId);
  useEffect(() => initAuth(), [initAuth]);

  // Once signed in, the verified phone + auth.uid() become part of the
  // user's own profile — the id match matters because every Supabase table's
  // RLS is keyed off auth.uid() (see supabase/migrations), so the store's
  // `user.id` has to line up with it for sync to see this user's own rows.
  useEffect(() => {
    if (authUserId) completeProfile({ phone: authPhone ?? undefined, id: authUserId });
  }, [authUserId, authPhone, completeProfile]);

  // Sync starts only once we have both a hydrated local store and a real
  // signed-in user's id — see useStore.ts's startSupabaseSync docs.
  useEffect(() => {
    if (!hasHydrated) return;
    if (authStatus === 'signedIn' && authUserId) {
      startSupabaseSync(authUserId);
    } else if (authStatus === 'signedOut') {
      stopSupabaseSync();
    }
  }, [hasHydrated, authStatus, authUserId]);

  // Keep local nudge reminders in sync with store state (native-only).
  useNudgeReminders();

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

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const ready = ((loaded || !!fontError) && hasHydrated && authStatus !== 'loading') || timedOut;

  // Hide the splash from the root view's onLayout — fires after the first real
  // layout pass, the most reliable moment for hideAsync.
  const onLayoutRootView = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Effect fallback in case onLayout doesn't fire.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const segments = useSegments();
  const pathname = usePathname();
  const { redirect } = useGlobalSearchParams<{ redirect?: string }>();

  useEffect(() => {
    if (!ready || authStatus === 'unconfigured') return;
    const inAuthGroup = segments[0] === 'auth';
    const isPublicPreview = segments[0] === 'claim';
    if (authStatus === 'signedOut') {
      if (!inAuthGroup && !isPublicPreview) {
        router.replace(`/auth/phone?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }
    if (authStatus === 'signedIn' && inAuthGroup) {
      const dest = typeof redirect === 'string' && redirect ? redirect : '/(tabs)';
      router.replace(dest);
    }
  }, [ready, authStatus, segments, pathname, redirect, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ErrorBoundary>
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
            <Stack.Screen
              name="auth/phone"
              options={{ gestureEnabled: false, contentStyle: { backgroundColor: colors.appBgDark } }}
            />
            <Stack.Screen
              name="auth/verify"
              options={{ gestureEnabled: false, contentStyle: { backgroundColor: colors.appBgDark } }}
            />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
