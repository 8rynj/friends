/**
 * Onboarding — Design Guidelines §8 (Onboarding, dark mode), Spec §5A.
 *
 * Dark base for a dramatic first impression. Four gamified steps:
 *   1. Name
 *   2. Pick hobbies — unlimited, from the grouped/searchable catalog
 *   3. Your Current Top 5 — narrow the selection to 5 highlighted hobbies
 *   4. Connect handles
 * Thin yellow progress bar (value left on the table, not a gate — §5A), eyebrow
 * step label, uppercase headline with a yellow accent word, always-visible Skip.
 * Persists name / hobbies / topHobbies / handles to the store on finish.
 */
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Avatar,
  Button,
  CatalogPicker,
  HalftoneEye,
  HobbyChip,
  OutlineText,
  Pill,
  ProgressBar,
} from '../../src/components';
import { border, colors, fonts, palette, spacing, type } from '../../src/theme';
import { handleMeta } from '../../src/data/mock';
import { hobbyCatalog } from '../../src/data/catalog';
import { HandleSource } from '../../src/data/types';
import { useStore } from '../../src/store/useStore';

const MAX_TOP = 5;
const HANDLE_OPTIONS: HandleSource[] = [
  'instagram', 'spotify', 'letterboxd', 'strava',
  'linkedin', 'goodreads', 'snapchat', 'bandsintown',
];
const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const completeProfile = useStore((s) => s.completeProfile);

  const [step, setStep] = useState(0);
  // Prefill from the existing profile so this doubles as profile editing.
  const [name, setName] = useState(user.name ?? '');
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies ?? []);
  const [topHobbies, setTopHobbies] = useState<string[]>(user.topHobbies ?? []);
  const [handles, setHandles] = useState<HandleSource[]>(
    (user.handles ?? []).map((h) => h.source),
  );

  const percent = useMemo(() => {
    let done = 0;
    if (name.trim()) done += 1;
    if (hobbies.length >= 3) done += 1;
    if (topHobbies.length >= 1) done += 1;
    if (handles.length >= 1) done += 1;
    return Math.round((done / TOTAL_STEPS) * 100);
  }, [name, hobbies, topHobbies, handles]);

  const toggleHobby = (h: string) =>
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));

  const toggleTop = (h: string) =>
    setTopHobbies((prev) =>
      prev.includes(h)
        ? prev.filter((x) => x !== h)
        : prev.length >= MAX_TOP
          ? prev
          : [...prev, h],
    );

  const toggleHandle = (s: HandleSource) =>
    setHandles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = () => {
    // Keep top hobbies a subset of selected hobbies.
    const top = topHobbies.filter((h) => hobbies.includes(h));
    const merged = handles.map(
      (source) => user.handles.find((h) => h.source === source) ?? { source, value: '' },
    );
    completeProfile({
      name: name.trim() || user.name,
      hobbies,
      topHobbies: top,
      handles: merged,
    });
    router.replace('/(tabs)');
  };
  const next = () => (step < TOTAL_STEPS - 1 ? setStep(step + 1) : finish());

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBgDark }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: spacing.screen, flex: 1 }}>
        <HalftoneEye size={90} bottom={insets.bottom + 80} right={-16} opacity={0.09} />

        {/* Progress + step label. */}
        <ProgressBar percent={percent} />
        <Text style={[type.label, { color: palette.yellow, marginTop: spacing.lg }]}>
          Step {step + 1} of {TOTAL_STEPS}
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
                Choose anything you’re into — the more the better. You’ll pick your top 5 next.
              </Text>
              <View style={{ alignSelf: 'flex-start', marginVertical: 4 }}>
                <Pill label={`${hobbies.length} selected`} variant="connected" />
              </View>
              <CatalogPicker
                sections={hobbyCatalog}
                selected={hobbies}
                onToggle={toggleHobby}
                onDark
              />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeIn} style={{ gap: spacing.md }}>
              <View>
                <Text style={[type.display, { color: palette.offWhite }]}>Your current</Text>
                <OutlineText fontSize={34} stroke={palette.yellow} strokeWidth={2}>
                  top 5
                </OutlineText>
              </View>
              <Text style={[type.body, { color: colors.textMutedOnDark }]}>
                Which of these are you most into right now? These get top billing in your icebreakers.
              </Text>
              <View style={{ alignSelf: 'flex-start', marginVertical: 4 }}>
                <Pill
                  label={
                    topHobbies.length < MAX_TOP
                      ? `${topHobbies.length} of ${MAX_TOP} — pick ${MAX_TOP - topHobbies.length} more`
                      : `${MAX_TOP} of ${MAX_TOP} — nice`
                  }
                  variant="connected"
                />
              </View>
              {hobbies.length === 0 ? (
                <Text style={[type.body, { color: colors.textMutedOnDark }]}>
                  Go back and pick a few hobbies first.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {hobbies.map((h) => (
                    <HobbyChip
                      key={h}
                      label={h}
                      selected={topHobbies.includes(h)}
                      selectedColor={palette.yellow}
                      onDark
                      onToggle={() => toggleTop(h)}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {step === 3 && (
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
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                      toggleHandle(s);
                    }}
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
            label={step < TOTAL_STEPS - 1 ? 'Continue' : 'Start connecting'}
            variant="cta"
            fullWidth
            onPress={next}
          />
          <Pressable onPress={next} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={[type.label, { color: colors.textMutedOnDark }]}>
              {step < TOTAL_STEPS - 1 ? 'Skip for now' : 'Finish later'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
