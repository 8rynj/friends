/**
 * Icebreaker / Post-Bump — Design Guidelines §8 (Icebreaker Screen), Spec §5B.
 *
 * Navy top with a ripped-edge transition, the two avatars colliding from
 * opposite sides with a bump icon between them, a tight uppercase
 * "YOU HAVE X THINGS IN COMMON" headline, three stacked alternating taped cards
 * that flip in sequentially, and primary/secondary CTAs.
 */
import React, { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Avatar,
  Button,
  CollageCard,
  HalftoneEye,
  OutlineText,
  PaperScrap,
  Pill,
  RippedEdge,
} from '../src/components';
import {
  cardBackgrounds,
  colors,
  motion,
  palette,
  spacing,
  textOn,
  tiltFor,
  type,
} from '../src/theme';
import { justBumped, handleMeta } from '../src/data/mock';
import { computeCommonalities } from '../src/engine/commonality';
import { useStore } from '../src/store/useStore';
import { useReducedMotion } from '../src/hooks/useReducedMotion';

export default function IcebreakerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const user = useStore((s) => s.user);
  // Show the just-bumped person (added to the store before navigating here);
  // fall back to the sample connection when opened without an id.
  const connection =
    useStore((s) => s.connections.find((c) => c.id === String(id))) ?? justBumped;
  // Computed live from both profiles — the engine is the source of truth.
  const commonalities = computeCommonalities(user, connection.user, 3, connection.connectionType);

  // Bump collision — cards fly in from opposite sides and collide (§7).
  const leftX = useSharedValue(reduced ? 0 : -160);
  const rightX = useSharedValue(reduced ? 0 : 160);

  useEffect(() => {
    if (reduced) return;
    leftX.value = withSpring(0, { damping: 12, stiffness: 120 });
    rightX.value = withDelay(40, withSpring(0, { damping: 12, stiffness: 120 }));
    const t = setTimeout(() => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, motion.bump);
    return () => clearTimeout(t);
  }, [reduced, leftX, rightX]);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }] }));
  const bumpStyle = useAnimatedStyle(() => ({
    opacity: withDelay(motion.bump, withTiming(1, { duration: 200 })),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      {/* Navy top block. */}
      <View
        style={{
          backgroundColor: palette.navy,
          paddingTop: insets.top + 18,
          paddingBottom: 8,
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <HalftoneEye size={80} top={insets.top + 10} left={-8} opacity={0.07} />
        <PaperScrap top={insets.top + 18} right={24} size={20} color={palette.paperYellow} rotate="16deg" />

        <Pill label="Just connected" variant="connected" />

        {/* Two avatars colliding with a bump icon between. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginTop: 18,
            marginBottom: 20,
          }}
        >
          <Animated.View style={leftStyle}>
            <Avatar name={user.name} color={user.avatarColor} size={76} rotate="-4deg" shadowed />
          </Animated.View>
          <Animated.View
            style={[
              bumpStyle,
              {
                marginHorizontal: -10,
                zIndex: 5,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: palette.yellow,
                borderWidth: 2.5,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: '8deg' }],
              },
            ]}
          >
            <Text allowFontScaling={false} style={{ fontSize: 18 }}>⚡</Text>
          </Animated.View>
          <Animated.View style={rightStyle}>
            <Avatar name={connection.user.name} color={connection.user.avatarColor} size={76} rotate="4deg" shadowed />
          </Animated.View>
        </View>
      </View>

      <RippedEdge topColor={palette.navy} bottomColor={colors.cream} seed={7} />

      <View style={{ flex: 1, paddingHorizontal: spacing.screen, paddingTop: spacing.md }}>
        {/* Headline. */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: 4 }]}>
            You &amp; {connection.user.name.split(' ')[0]}
          </Text>
          <Text style={[type.display, { color: colors.nearBlack }]}>You have {commonalities.length}</Text>
          <OutlineText fontSize={34} stroke={colors.nearBlack} strokeWidth={2}>
            things
          </OutlineText>
          <Text style={[type.display, { color: colors.nearBlack }]}>in common</Text>
        </View>

        {/* Three commonality cards, sequential reveal (§7). */}
        <View style={{ gap: spacing.md, flex: 1 }}>
          {commonalities.map((c, i) => {
            const bg = cardBackgrounds[i % cardBackgrounds.length];
            const fg = textOn(bg);
            const muted =
              bg === palette.cream || bg === palette.yellow
                ? colors.textMutedOnLight
                : colors.textMutedOnDark;
            return (
              <Animated.View
                key={c.id}
                entering={
                  reduced
                    ? undefined
                    : FadeInDown.delay(motion.bump + i * motion.icebreakerStagger)
                        .duration(motion.icebreakerReveal)
                        .springify()
                        .damping(15)
                }
              >
                <CollageCard background={bg} rotate={tiltFor(i)} taped tapeSide={i % 2 === 0 ? 'left' : 'right'}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[type.label, { color: muted }]}>{c.category}</Text>
                    {c.source && (
                      <Pill label={handleMeta[c.source].label} variant="source" tint={handleMeta[c.source].tint} />
                    )}
                  </View>
                  <Text style={[type.cardTitle, { color: fg, marginTop: 6 }]}>{c.title}</Text>
                  {c.detail && <Text style={[type.body, { color: muted, marginTop: 4 }]}>{c.detail}</Text>}
                </CollageCard>
              </Animated.View>
            );
          })}
        </View>

        {/* CTAs. */}
        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + 16, paddingTop: spacing.md }}>
          <Button
            label="View full profile"
            variant="primary"
            fullWidth
            onPress={() => router.replace(`/connection/${connection.id}`)}
          />
          <Button label="Back to home" variant="secondary" fullWidth onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
