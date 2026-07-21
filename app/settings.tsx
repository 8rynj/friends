/**
 * Settings & privacy (Spec §Privacy, §Notifications, §5D).
 *
 * Privacy: NFC bump toggle (on by default), search discoverability opt-out.
 * Notifications: nudge pushes, new-commonality pushes, email fallback.
 * Nudges: default cadence for new connections.
 * Account: signed-in identity + reset (mock sign-out).
 */
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, CollageCard, OutlineText, Toggle } from '../src/components';
import { border, colors, palette, spacing, type } from '../src/theme';
import { NudgeCadence } from '../src/data/types';
import { signOutPhone } from '../src/lib/auth';
import { Settings, useStore } from '../src/store/useStore';
import { requestNudgePermissions } from '../src/engine/notifications';
import { useAuthStore } from '../src/store/useAuthStore';

const CADENCES: NudgeCadence[] = ['weekly', 'monthly', 'quarterly', 'never'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetApp = useStore((s) => s.resetApp);
  const authPhone = useAuthStore((s) => s.phone);

  const set = (patch: Partial<Settings>) => updateSettings(patch);

  // Turning nudge reminders on asks for OS permission first; if it's denied we
  // leave the toggle off and point the user to their device settings. Off and
  // web are simple state updates (no real notifications on web).
  const setNudgeReminders = async (v: boolean) => {
    if (!v || Platform.OS === 'web') {
      set({ pushNudges: v });
      return;
    }
    const granted = await requestNudgePermissions();
    if (granted) {
      set({ pushNudges: true });
    } else {
      set({ pushNudges: false });
      Alert.alert(
        'Notifications are off',
        'Turn on notifications for Knowable in your device Settings to get nudge reminders.',
      );
    }
  };

  const signOut = async () => {
    resetApp();
    await signOutPhone().catch(() => {});
    // The root layout's auth-state subscription redirects to /auth/phone
    // once the session clears (only relevant when Supabase is configured).
  };

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert('Sign out?', 'This clears your connections and settings back to the demo state.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 44, height: 44, borderRadius: 22, marginTop: 6,
            backgroundColor: colors.cream, borderWidth: border.small, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 18, color: colors.nearBlack, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.display, { color: colors.nearBlack }]}>Your</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            settings
          </OutlineText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + 40,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy */}
        <Section title="Privacy">
          <ToggleRow
            label="NFC bump"
            blurb="Tap phones to connect. On by default."
            value={settings.nfcEnabled}
            onChange={(v) => set({ nfcEnabled: v })}
          />
          <ToggleRow
            label="Discoverable in search"
            blurb="Let people find you by name. Turning this off doesn’t affect NFC or invites."
            value={settings.searchable}
            onChange={(v) => set({ searchable: v })}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <ToggleRow
            label="Nudge reminders"
            blurb="Reminders to follow up with people, on each connection’s cadence."
            value={settings.pushNudges}
            onChange={setNudgeReminders}
          />
          <ToggleRow
            label="New commonalities"
            blurb="Get notified when a connection adds something you share."
            value={settings.pushUpdates}
            onChange={(v) => set({ pushUpdates: v })}
          />
          <ToggleRow
            label="Email fallback"
            blurb="Email me if I miss a push."
            value={settings.emailFallback}
            onChange={(v) => set({ emailFallback: v })}
          />
        </Section>

        {/* Default nudge cadence */}
        <Section title="Default nudge cadence">
          <Text style={[type.body, { color: colors.textMutedOnLight }]}>
            New connections start on this schedule. Change it per person on their profile.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {CADENCES.map((cad) => {
              const active = settings.defaultCadence === cad;
              return (
                <Pressable
                  key={cad}
                  onPress={() => set({ defaultCadence: cad })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Default nudge cadence ${cad}`}
                  accessibilityState={{ selected: active }}
                  style={{
                    backgroundColor: active ? palette.navy : 'transparent',
                    borderRadius: 100, borderWidth: 2, borderColor: colors.border,
                    paddingVertical: 8, paddingHorizontal: 14,
                  }}
                >
                  <Text style={[type.micro, { color: active ? palette.cream : colors.nearBlack }]}>{cad}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Account */}
        <Section title="Account">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={[type.cardTitle, { color: colors.nearBlack }]}>{user.name}</Text>
              {authPhone && (
                <Text style={[type.body, { color: colors.textMutedOnLight }]}>{authPhone}</Text>
              )}
            </View>
            <Pressable
              onPress={() => router.push('/onboarding')}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Text style={[type.label, { color: colors.navy }]}>Edit profile</Text>
            </Pressable>
          </View>
          <Button label="Sign out" variant="secondary" onPress={confirmReset} style={{ marginTop: spacing.sm }} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[type.label, { color: colors.textMutedOnLight }]}>{title}</Text>
      <CollageCard background={palette.cream} rotate="-0.3deg">
        <View style={{ gap: spacing.md }}>{children}</View>
      </CollageCard>
    </View>
  );
}

function ToggleRow({
  label,
  blurb,
  value,
  onChange,
}: {
  label: string;
  blurb: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.cardTitle, { color: colors.nearBlack }]}>{label}</Text>
        <Text style={[type.body, { color: colors.textMutedOnLight }]}>{blurb}</Text>
      </View>
      <Toggle value={value} onChange={onChange} accessibilityLabel={label} />
    </View>
  );
}
