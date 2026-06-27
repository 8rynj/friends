/**
 * Onboarding — Design Guidelines §8 (Onboarding, dark mode), Spec §5A.
 *
 * Dark base (#1a1a1a) for a dramatic, editorial first impression. Thin yellow
 * progress bar with %, an eyebrow step label, an uppercase headline with a
 * yellow accent word, gamified steps (name → top-5 hobbies → connect handles),
 * a selection-count badge, and an always-visible muted Skip. Profile completion
 * is communicated as value, never a hard gate (§5A).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Avatar,
  Button,
  HalftoneEye,
  HobbyChip,
  OutlineText,
  Pill,
  ProgressBar,
} from '../../src/components';
import { border, colors, fonts, palette, spacing, type } from '../../src/theme';
import { handleMeta, hobbyPool } from '../../src/data/mock';
import { HandleSource } from '../../src/data/types';
import { useStore } from '../../src/store/useStore';

const MAX_HOBBIES = 5;
const HANDLE_OPTIONS: HandleSource[] = [
  'instagram',
  'spotify',
  'letterboxd',
  'strava',
  'linkedin',
  'goodreads',
  'snapchat',
  'bandsintown',
];
const CHIP_COLORS = [palette.navy, palette.yellow, palette.orange];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const completeProfile = useStore((s) => s.completeProfile);

  const [step, setStep] = useState(0);
  // Prefill from the existing profile so this doubles as profile editing.
  const [name, setName] = useState(user.name ?? '');
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies ?? []);
  const [handles, setHandles] = useState<HandleSource[]>(
    (user.handles ?? []).map((h) => h.source),
  );

  const totalSteps = 3;
  const percent = useMemo(() => {
    let done = 0;
    if (name.trim()) done += 1;
    if (hobbies.length >= 3) done += 1;
    if (handles.length >= 1) done += 1;
    return Math.round((done / totalSteps) * 100);
  }, [name, hobbies, handles]);

  const toggleHobby = (h: string) =>
    setHobbies((prev) =>
      prev.includes(h)
        ? prev.filter((x) => x !== h)
        : prev.length >= MAX_HOBBIES
          ? prev
          : [...prev, h],
    );

  const toggleHandle = (s: HandleSource) =>
    setHandles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = () => {
    // Persist the profile. Preserve existing handle values where we already
    // have them; new sources are stored with an empty value for now.
    const merged = handles.map(
      (source) =>
        user.handles.find((h) => h.source === source) ?? { source, value: '' },
    );
    completeProfile({ name: name.trim() || user.name, hobbies, handles: merged });
    router.replace('/(tabs)');
  };
  const next = () => (step < totalSteps - 1 ? setStep(step + 1) : finish());

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBgDark }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: spacing.screen, flex: 1 }}>
        <HalftoneEye size={90} bottom={insets.bottom + 80} right={-16} opacity={0.09} />

        {/* Progress + step label. */}
        <ProgressBar percent={percent} />
        <Text style={[type.label, { color: palette.yellow, marginTop: spacing.lg }]}>
          Step {step + 1} of {totalSteps}
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
        >
          {step === 0 && (
            <Animated.View entering={FadeIn} style={{ gap: spacing.lg }}>
              <View>
                <Text style={[type.display, { color: palette.offWhite }]}>What’s your</Text>
                <OutlineText fontSize={34} stroke={palette.offWhite} strokeWidth={2}>
                  name
                </OutlineText>
              </View>
              <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
                <Avatar name={name || '?'} color={palette.orange} size={88} rotate="-3deg" shadowed taped />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMutedOnDark}
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 18,
                  color: palette.offWhite,
                  backgroundColor: 'rgba(245,240,232,0.06)',
                  borderWidth: border.small,
                  borderColor: 'rgba(245,240,232,0.3)',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeIn} style={{ gap: spacing.md }}>
              <View>
                <Text style={[type.display, { color: palette.offWhite }]}>Pick your</Text>
                <OutlineText fontSize={34} stroke={palette.yellow} strokeWidth={2}>
                  things
                </OutlineText>
              </View>
              <Text style={[type.body, { color: colors.textMutedOnDark }]}>
                Choose up to {MAX_HOBBIES}. These power your icebreakers.
              </Text>
              <View style={{ alignSelf: 'flex-start', marginVertical: 4 }}>
                <Pill
                  label={
                    hobbies.length < MAX_HOBBIES
                      ? `${hobbies.length} of ${MAX_HOBBIES} — pick ${MAX_HOBBIES - hobbies.length} more`
                      : `${MAX_HOBBIES} of ${MAX_HOBBIES} — nice`
                  }
                  variant="connected"
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {hobbyPool.map((h, i) => (
                  <HobbyChip
                    key={h}
                    label={h}
                    selected={hobbies.includes(h)}
                    selectedColor={CHIP_COLORS[i % CHIP_COLORS.length]}
                    onToggle={() => toggleHobby(h)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeIn} style={{ gap: spacing.md }}>
              <View>
                <Text style={[type.display, { color: palette.offWhite }]}>Connect your</Text>
                <OutlineText fontSize={34} stroke={palette.yellow} strokeWidth={2}>
                  worlds
                </OutlineText>
              </View>
              <Text style={[type.body, { color: colors.textMutedOnDark }]}>
                Share handles so the people you meet find more in common with you.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {HANDLE_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => toggleHandle(s)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: handles.includes(s) ? palette.yellow : 'transparent',
                      borderRadius: 100,
                      borderWidth: border.small,
                      borderColor: handles.includes(s) ? colors.border : 'rgba(245,240,232,0.25)',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 13,
                        color: handles.includes(s) ? colors.nearBlack : 'rgba(245,240,232,0.7)',
                      }}
                    >
                      {handleMeta[s].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* CTAs — primary continue + always-visible muted Skip (§5A, §8). */}
        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + 16 }}>
          <Button
            label={step < totalSteps - 1 ? 'Continue' : 'Start connecting'}
            variant="cta"
            fullWidth
            onPress={next}
          />
          <Pressable onPress={next} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={[type.label, { color: colors.textMutedOnDark }]}>
              {step < totalSteps - 1 ? 'Skip for now' : 'Finish later'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
